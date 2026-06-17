/**
 * Constructor visual scene — a single, derived, read-only "view model" built
 * from the wizard's form state. It is the one place that turns the parallel
 * `design` (geometry) + `appearance` (surface) + legacy feature fields into a
 * normalized, render-ready description that every preview can consume.
 *
 * Design rules (keep these invariants):
 *
 * - **React-free.** Usable by previews, validators and future operator/CAD
 *   tooling. No imports from `react`.
 * - **Derived & read-only.** `buildConstructorVisualScene` never mutates its
 *   input and the scene is never written back to form state or the payload.
 * - **UI-only state stays out.** Selection / drag bookkeeping is not part of
 *   the scene — it lives in the wizard and is threaded to the preview directly.
 *
 * Slice 1 scope: the scene exists and feeds `DesignPreview`. The legacy 2D / 3D
 * previews still read their old props; later slices migrate them onto the scene.
 */

import {
  normalizeDesign,
  getDesignWarnings,
  elementSource,
  type DesignBaseShape,
  type DesignElement,
  type DesignSettingsInput,
} from "@/lib/design";
import {
  HEX_COLOR_RE,
  MATERIAL_FINISHES,
  PATTERN_TYPES,
  PATTERN_PLACEMENTS,
  TEXT_PLACEMENTS,
  type MaterialFinish,
  type PatternType,
  type PatternPlacement,
  type TextPlacement,
} from "@/lib/appearance";
import {
  normalizeAccessories,
  type Accessory,
  type AccessoryInput,
} from "@/lib/accessories";
import {
  normalizeLid,
  type LidFit,
  type LidSettingsInput,
  type LidType,
} from "@/lib/lid";

// ---- Input -----------------------------------------------------------------

/**
 * Loose, everything-optional surface-appearance shape as it arrives from
 * react-hook-form's `watch` (before zod fills defaults). Declared structurally
 * so this module stays decoupled from the validation schema — same approach as
 * `DesignSettingsInput` in `design.ts`.
 */
export interface VisualFormAppearanceInput {
  baseColorHex?: string;
  materialType?: string;
  materialFinish?: string;
  opacity?: number;
  pattern?: {
    enabled?: boolean;
    type?: string;
    colorHex?: string;
    scale?: number;
    opacity?: number;
    placement?: string;
  };
  textDecoration?: {
    enabled?: boolean;
    text?: string | null;
    colorHex?: string;
    size?: number;
    placement?: string;
  };
}

/**
 * The subset of the wizard's form state the scene is built from. Structural and
 * fully optional so `methods.watch()` (a full `PrintRequestInput`) is assignable
 * to it without coupling this module to the schema.
 */
export interface ConstructorVisualFormInput {
  widthMm?: number;
  depthMm?: number;
  heightMm?: number;
  cornerRadiusMm?: number;
  shape?: string;
  sectionsCount?: number;
  hasHoles?: boolean;
  holesDescription?: string;
  hasFasteners?: boolean;
  fastenersDescription?: string;
  appearance?: VisualFormAppearanceInput;
  design?: DesignSettingsInput;
  accessories?: AccessoryInput[];
  lid?: LidSettingsInput;
}

// ---- Scene -----------------------------------------------------------------

/** Surface pattern, render-ready (tile size already resolved to mm). */
export interface VisualMaterialPattern {
  /** A concrete tile should be painted (enabled, and not "none"/"custom"). */
  active: boolean;
  type: PatternType;
  color: string;
  /** 0..1 opacity of the pattern layer. */
  opacity: number;
  /** User scale factor, clamped to a sane band. */
  scale: number;
  /** Tile side length in mm, derived from dimensions + scale. */
  tile: number;
  placement: PatternPlacement;
  /** Enabled but type === "custom" — shown as an operator note, not a tile. */
  isCustom: boolean;
}

/** Surface text decoration, with its schematic top-view position resolved. */
export interface VisualMaterialText {
  active: boolean;
  value: string;
  color: string;
  sizeMm: number;
  /** Schematic top-view centre for the label (mm). */
  x: number;
  y: number;
}

/** Surface look of the body: colour, finish, transparency, pattern, text. */
export interface VisualMaterial {
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Body opacity (semi-transparent finish dims it; otherwise 1). */
  baseOpacity: number;
  isGlossy: boolean;
  isTextured: boolean;
  isSemiTransparent: boolean;
  finish: MaterialFinish;
  pattern: VisualMaterialPattern;
  text: VisualMaterialText;
}

/**
 * How the body is divided into compartments. "vertical" splits the width into
 * equal columns (the safe default — no orientation field exists in the form
 * yet); "horizontal" splits the depth; "grid" is reserved for a future slice.
 */
export type SectionOrientation = "vertical" | "horizontal" | "grid";

/**
 * A single derived partition wall. Positions are normalized [0..1] along the
 * divided axis (x for "vertical", y for "horizontal"), so every preview can
 * place it in its own coordinate space. Derived from `count` — never authored
 * by the user in this slice.
 */
export interface VisualPartition {
  id: string;
  /** 1-based index of the wall (1 = first divider after the first section). */
  index: number;
  orientation: "vertical" | "horizontal";
  /** Normalized 0..1 position along the divided axis. */
  position: number;
}

/**
 * Internal divisions of the body. `count` is the number of compartments
 * (1 = a single, undivided body); `partitions` are the derived dividing walls
 * — exactly `max(count - 1, 0)` of them. Layout is single-axis for now,
 * defaulting to "vertical"; hand-placement / per-axis editing arrive later.
 */
export interface VisualSections {
  count: number;
  orientation: SectionOrientation;
  partitions: VisualPartition[];
}

export type VisualWarningCode =
  | "design"
  | "rectangleRadiusIgnored"
  | "semiTransparentApprox"
  | "patternCustom"
  | "patternDominatesColor"
  | "textSchematic"
  | "schematicFeatures"
  | "lidHingedSchematic";

/** A structured operator note. `code` lets consumers filter / style by kind. */
export interface VisualWarning {
  code: VisualWarningCode;
  message: string;
}

/**
 * The unified, derived view model. Every preview should ultimately read from
 * this rather than re-deriving the same values from raw form state.
 */
export interface ConstructorVisualScene {
  /** Top-view base geometry (normalized — always fully shaped). */
  baseShape: DesignBaseShape;
  /** Surface look of the body. */
  material: VisualMaterial;
  /** Internal sections. */
  sections: VisualSections;
  /** User-placed, editable design elements (overlay / engrave / cutout). */
  elements: DesignElement[];
  /** Constructive side-mounted accessories (handles), normalised. */
  accessories: VisualAccessory[];
  /** Lid, derived from the form `lid`; `null` when disabled. */
  lid: VisualLid | null;
  /** Operator notes / MVP limitations relevant to the current scene. */
  warnings: VisualWarning[];
}

/**
 * Render-ready accessory. Currently identical to the normalised `Accessory`
 * (all spatial fields already clamped to [0..1]); kept as a distinct scene-side
 * alias so future derivations (resolved mm extents, etc.) don't ripple into the
 * form model.
 */
export type VisualAccessory = Accessory;

/**
 * Render-ready lid view model, derived from the form `lid` when enabled. Carries
 * the normalised lid settings (mm) plus a `hinged` convenience flag. The 2D / 3D
 * renderers combine these with `baseShape` (kind + width/depth) to draw the lid
 * footprint: `overlay` expands by `overhangMm`, `inset` shrinks by `clearanceMm`.
 */
export interface VisualLid {
  type: LidType;
  fit: LidFit;
  thicknessMm: number;
  overhangMm: number;
  clearanceMm: number;
  hinged: boolean;
}

// ---- Type guards -----------------------------------------------------------

function isMaterialFinish(v: unknown): v is MaterialFinish {
  return typeof v === "string" && (MATERIAL_FINISHES as readonly string[]).includes(v);
}

function isPatternType(v: unknown): v is PatternType {
  return typeof v === "string" && (PATTERN_TYPES as readonly string[]).includes(v);
}

function isPatternPlacement(v: unknown): v is PatternPlacement {
  return typeof v === "string" && (PATTERN_PLACEMENTS as readonly string[]).includes(v);
}

function isTextPlacement(v: unknown): v is TextPlacement {
  return typeof v === "string" && (TEXT_PLACEMENTS as readonly string[]).includes(v);
}

// ---- Numeric helpers -------------------------------------------------------

/** Clamp a value into an arbitrary [lo, hi] band (falls back to lo if NaN). */
function clampUnit(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/** Valid hex literal, or the supplied fallback. */
function hexOr(value: string | undefined, fallback: string): string {
  return value && HEX_COLOR_RE.test(value) ? value : fallback;
}

/**
 * Map a 3D text-placement face onto a sensible spot in the top-view preview.
 * The top view can't show side faces literally, so front/back/left/right are
 * nudged toward the matching edge and "top" sits dead-centre. Schematic only.
 */
function textDecorationPosition(
  placement: TextPlacement,
  widthMm: number,
  heightMm: number,
): { x: number; y: number } {
  switch (placement) {
    case "back":
      return { x: widthMm / 2, y: heightMm * 0.2 };
    case "left":
      return { x: widthMm * 0.3, y: heightMm / 2 };
    case "right":
      return { x: widthMm * 0.7, y: heightMm / 2 };
    case "top":
      return { x: widthMm / 2, y: heightMm / 2 };
    case "front":
    default:
      return { x: widthMm / 2, y: heightMm * 0.8 };
  }
}

// ---- Material --------------------------------------------------------------

function buildMaterial(
  appearance: VisualFormAppearanceInput | undefined,
  baseShape: DesignBaseShape,
  /** When true, a structured `source:"textDecoration"` design element already
   *  draws the label, so the material text layer is suppressed to avoid a
   *  double-render (the element is the single source of truth in that case). */
  hasStructuredText: boolean,
): VisualMaterial {
  const { widthMm, heightMm } = baseShape;

  const fill = hexOr(appearance?.baseColorHex, baseShape.fillColor ?? "#ffffff");
  const stroke = baseShape.strokeColor ?? "#111827";
  const strokeWidth = baseShape.strokeWidth ?? 1;

  const finish: MaterialFinish = isMaterialFinish(appearance?.materialFinish)
    ? appearance.materialFinish
    : "matte";
  const isSemiTransparent = finish === "semi_transparent";
  const baseOpacity = isSemiTransparent
    ? clampUnit(
        typeof appearance?.opacity === "number" ? appearance.opacity : 0.5,
        0.15,
        1,
      )
    : 1;

  // ── Pattern (tiled surface decoration).
  const p = appearance?.pattern;
  const patternType: PatternType = isPatternType(p?.type) ? p.type : "none";
  const patternEnabled = !!p?.enabled;
  const patternActive =
    patternEnabled && patternType !== "none" && patternType !== "custom";
  const patternColor = hexOr(p?.colorHex, "#1f1f1f");
  const patternOpacity = clampUnit(
    typeof p?.opacity === "number" ? p.opacity : 1,
    0,
    1,
  );
  const patternScale = clampUnit(
    typeof p?.scale === "number" ? p.scale : 1,
    0.5,
    5,
  );
  const minSide = Math.min(widthMm, heightMm);
  const patternTile = clampUnit(
    (minSide / 9) * patternScale,
    Math.max(minSide * 0.04, 1.5),
    minSide / 2,
  );
  const patternPlacement: PatternPlacement = isPatternPlacement(p?.placement)
    ? p.placement
    : "all";

  // ── Text decoration (schematic top-view label).
  const t = appearance?.textDecoration;
  const textValue = (t?.text ?? "").trim();
  const textActive = !hasStructuredText && !!t?.enabled && textValue.length > 0;
  const textColor = hexOr(t?.colorHex, "#1f1f1f");
  const textSizeMm = clampUnit(
    typeof t?.size === "number" ? t.size : 16,
    4,
    heightMm * 0.6,
  );
  const textPlacement: TextPlacement = isTextPlacement(t?.placement)
    ? t.placement
    : "front";
  const textPos = textDecorationPosition(textPlacement, widthMm, heightMm);

  return {
    fill,
    stroke,
    strokeWidth,
    baseOpacity,
    isGlossy: finish === "glossy",
    isTextured: finish === "textured",
    isSemiTransparent,
    finish,
    pattern: {
      active: patternActive,
      type: patternType,
      color: patternColor,
      opacity: patternOpacity,
      scale: patternScale,
      tile: patternTile,
      placement: patternPlacement,
      isCustom: patternEnabled && patternType === "custom",
    },
    text: {
      active: textActive,
      value: textValue,
      color: textColor,
      sizeMm: textSizeMm,
      x: textPos.x,
      y: textPos.y,
    },
  };
}

// ---- Sections --------------------------------------------------------------

/**
 * Derive the section model from the raw `sectionsCount`. The rule is simple and
 * predictable: `count` compartments produce `count - 1` partition walls. With
 * the default "vertical" orientation those walls split the width into equal
 * columns, so 1 section = no walls, 2 = one wall, 3 = two walls, … Pure and
 * deterministic — ids are stable so React keys never churn between renders.
 */
function buildSections(sectionsCount: number | undefined): VisualSections {
  const count = Math.max(0, Math.floor(sectionsCount ?? 0));
  const orientation: SectionOrientation = "vertical";
  const partitions: VisualPartition[] = [];
  if (count > 1) {
    for (let i = 1; i < count; i++) {
      partitions.push({
        id: `section-v-${i}`,
        index: i,
        orientation,
        position: i / count,
      });
    }
  }
  return { count, orientation, partitions };
}

// ---- Warnings --------------------------------------------------------------

function buildWarnings(
  form: ConstructorVisualFormInput,
  baseShape: DesignBaseShape,
  elements: DesignElement[],
  material: VisualMaterial,
  lid: VisualLid | null,
): VisualWarning[] {
  const warnings: VisualWarning[] = [];

  // Reuse the existing geometry warnings (custom-shape approximation, pill 3D,
  // image cutout bbox, image engrave approximation, schematic cutouts). The
  // "no elements added" note is always first when the list is empty — drop it
  // for the preview, where the legend already covers the empty case.
  const designWarnings = getDesignWarnings({ baseShape, elements });
  const geometryNotes =
    elements.length === 0 ? designWarnings.slice(1) : designWarnings;
  for (const message of geometryNotes) {
    warnings.push({ code: "design", message });
  }

  // Bug surfaced (no shape refactor in this slice): a plain "rectangle" ignores
  // its corner radius in the preview. Tell the user how to get a visible radius.
  if (baseShape.kind === "rectangle" && (baseShape.cornerRadiusMm ?? 0) > 0) {
    warnings.push({
      code: "rectangleRadiusIgnored",
      message:
        "Скругление задано, но для формы «Прямоугольник» оно не отображается. Выберите «Скруглённый прямоугольник», чтобы увидеть радиус.",
    });
  }

  if (material.isSemiTransparent) {
    warnings.push({
      code: "semiTransparentApprox",
      message: "Полупрозрачность показана приближённо — общее затемнение тела.",
    });
  }

  if (material.pattern.isCustom) {
    warnings.push({
      code: "patternCustom",
      message: "Свой рисунок согласуется с оператором — показан схематично.",
    });
  }

  // High-opacity full-coverage pattern can visually swallow the base colour —
  // surface this so the user knows the colour didn't "reset", it's covered.
  if (
    material.pattern.active &&
    material.pattern.opacity >= 0.9 &&
    material.pattern.placement === "all"
  ) {
    warnings.push({
      code: "patternDominatesColor",
      message:
        "Рисунок плотно покрывает поверхность и может перекрывать базовый цвет. Уменьшите непрозрачность рисунка, чтобы цвет был заметнее.",
    });
  }

  if (material.text.active) {
    warnings.push({
      code: "textSchematic",
      message:
        "Текст показан схематично на виде сверху — точную грань и гравировку уточняет оператор.",
    });
  }

  if (form.hasHoles || form.hasFasteners) {
    warnings.push({
      code: "schematicFeatures",
      message:
        "Отверстия и крепления показаны схематично — точные размеры и места уточняет оператор.",
    });
  }

  if (lid?.hinged) {
    warnings.push({
      code: "lidHingedSchematic",
      message:
        "Петли крышки показаны схематично — конструкция и расположение петель уточняет оператор.",
    });
  }

  return warnings;
}

// ---- Builder ---------------------------------------------------------------

/**
 * Build the unified visual scene from the wizard's current form values. Pure —
 * never mutates `form`. Missing / partial pieces fall back to the domain
 * defaults via `normalizeDesign`, so mid-edit and legacy state both render.
 */
export function buildConstructorVisualScene(
  form: ConstructorVisualFormInput,
): ConstructorVisualScene {
  const design = normalizeDesign(form.design);
  const { baseShape, elements } = design;

  // A structured text element supersedes the material text layer (avoids the
  // 2D double-render); the element renders like any other overlay instead.
  const hasStructuredText = elements.some(
    (el) => elementSource(el) === "textDecoration",
  );
  const material = buildMaterial(form.appearance, baseShape, hasStructuredText);
  const sections = buildSections(form.sectionsCount);
  const accessories = normalizeAccessories(form.accessories);
  const lid = buildLid(form.lid);
  const warnings = buildWarnings(form, baseShape, elements, material, lid);

  return { baseShape, material, sections, elements, accessories, lid, warnings };
}

/**
 * Derive the render-ready lid from the form `lid`. Returns `null` when the lid
 * is disabled so consumers can simply check `scene.lid`.
 */
function buildLid(input: LidSettingsInput | undefined): VisualLid | null {
  const lid = normalizeLid(input);
  if (!lid.enabled) return null;
  return {
    type: lid.type,
    fit: lid.fit,
    thicknessMm: lid.thicknessMm,
    overhangMm: lid.overhangMm,
    clearanceMm: lid.clearanceMm,
    hinged: lid.type === "hinged",
  };
}
