/**
 * Design domain — physical geometry of the future printed item.
 *
 * Co-exists with the legacy `shape` / `cornerRadiusMm` / `widthMm` / `depthMm`
 * / `heightMm` fields on `PrintRequestInput`. The wizard mirrors a subset of
 * `design` back onto the legacy fields so the existing 2D/3D previews and the
 * server payload keep working unchanged.
 *
 * This module is intentionally React-free so it can be used by validators,
 * preview SVG components, and (later) operator/CAD tooling.
 */

import type { Shape } from "@/lib/constants";

// ---- Base shape ------------------------------------------------------------

/** Identifiers for the supported base shapes of the printed item. */
export const BASE_SHAPE_KINDS = [
  "rectangle",
  "roundedRectangle",
  "circle",
  "oval",
  "pill",
  "custom",
] as const;
export type BaseShapeKind = (typeof BASE_SHAPE_KINDS)[number];

/**
 * True when the user-facing corner-radius input should be visible/active.
 *
 * Only `roundedRectangle` carries a user-editable radius. A plain `rectangle`
 * is, by definition, straight-cornered — letting the user type a radius there
 * was misleading (the preview never rounded it). `pill` rounds automatically
 * (radius is computed, not edited), so it's deliberately excluded here too.
 */
export function shapeUsesCornerRadius(kind: BaseShapeKind): boolean {
  return kind === "roundedRectangle";
}

/** True when width/height must stay equal (preview enforces the smaller one). */
export function shapeIsAxisLocked(kind: BaseShapeKind): boolean {
  return kind === "circle";
}

export interface DesignBaseShape {
  kind: BaseShapeKind;
  widthMm: number;
  // The "depth" axis of the wizard. Named `heightMm` here because, in the
  // top-view design preview, the second axis really is the rendered height.
  heightMm: number;
  cornerRadiusMm?: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

// ---- Elements --------------------------------------------------------------

export const DESIGN_ELEMENT_TYPES = ["image", "decor", "text", "shape"] as const;
export type DesignElementType = (typeof DESIGN_ELEMENT_TYPES)[number];

export const DESIGN_ELEMENT_MODES = ["overlay", "engrave", "cutout"] as const;
export type DesignElementMode = (typeof DESIGN_ELEMENT_MODES)[number];

/**
 * Origin of an element. `user` is the default (hand-added decor / image / text);
 * `holes` / `fasteners` are auto-created and kept in sync with the legacy
 * `hasHoles` / `hasFasteners` toggles; `decor` mirrors the legacy
 * `hasDecoration` toggle; `textDecoration` / `logo` are reserved bridges for the
 * legacy surface-text / logo flows; `legacy` is reserved for migrated data.
 * A missing `source` on an older payload is treated as `user`.
 */
export const DESIGN_ELEMENT_SOURCES = [
  "user",
  "holes",
  "fasteners",
  "decor",
  "textDecoration",
  "logo",
  "legacy",
] as const;
export type DesignElementSource = (typeof DESIGN_ELEMENT_SOURCES)[number];

/** Source of an element, defaulting to `user` when absent (legacy payloads). */
export function elementSource(el: Pick<DesignElement, "source">): DesignElementSource {
  return el.source ?? "user";
}

/** Library of geometric decor shapes the editor can stamp. */
export const DECOR_SHAPE_KINDS = [
  "circle",
  "square",
  "triangle",
  "star",
  "heart",
] as const;
export type DecorShapeKind = (typeof DECOR_SHAPE_KINDS)[number];

/**
 * A single element placed on top of (or carved into) the base shape.
 *
 * Coordinates are normalized to [0..1] of the base shape's bounding box. That
 * keeps the data resolution-independent and lets the preview / future export
 * scale the design freely. The X/Y pair points to the element's centre.
 */
export interface DesignElement {
  id: string;
  type: DesignElementType;
  mode: DesignElementMode;

  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees clockwise; 0 if absent

  // Type-specific payload. Only one of these is meaningful per `type`.
  imageDataUrl?: string; // type === "image"
  decorShape?: DecorShapeKind; // type === "decor" / "shape"
  text?: string; // type === "text"

  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;

  /** Origin of the element (defaults to `user` when absent). System-managed
   *  holes / fasteners carry `source` so previews and the editor can treat
   *  them specially without breaking hand-added user elements. */
  source?: DesignElementSource;
  /** Marks a system element whose type / mode shouldn't be changed by hand
   *  (the user can still move, resize and delete it). */
  locked?: boolean;
}

// ---- Settings + defaults ---------------------------------------------------

export interface DesignSettings {
  baseShape: DesignBaseShape;
  elements: DesignElement[];
}

export const DEFAULT_DESIGN_BASE_SHAPE: DesignBaseShape = {
  kind: "rectangle",
  widthMm: 180,
  heightMm: 120,
  cornerRadiusMm: 0,
  fillColor: "#ffffff",
  strokeColor: "#111827",
  strokeWidth: 1,
};

export const DEFAULT_DESIGN: DesignSettings = {
  baseShape: DEFAULT_DESIGN_BASE_SHAPE,
  elements: [],
};

/** Fresh mutation-safe copy of the design defaults for react-hook-form. */
export function createDefaultDesign(): DesignSettings {
  return {
    baseShape: { ...DEFAULT_DESIGN_BASE_SHAPE },
    elements: [],
  };
}

// ---- Catalogue (UI-facing) -------------------------------------------------

export interface BaseShapeCard {
  kind: BaseShapeKind;
  label: string;
  hint: string;
  /**
   * When true the card is shown but cannot be selected — used for shapes that
   * have no MVP editor yet (`custom`). Keeping the card visible (rather than
   * hiding it) signals the feature is planned without letting the user pick a
   * shape we'd only render as an approximate bounding box.
   */
  disabled?: boolean;
}

/**
 * Stable order for the shape picker — also the order in which validation,
 * UI and any future serializer iterates over shapes.
 */
export const BASE_SHAPE_CARDS: ReadonlyArray<BaseShapeCard> = [
  { kind: "rectangle", label: "Прямоугольник", hint: "Прямые углы" },
  { kind: "roundedRectangle", label: "Скруглённый", hint: "Настраиваемый радиус" },
  { kind: "circle", label: "Круг", hint: "Один диаметр" },
  { kind: "oval", label: "Овал", hint: "Эллипс" },
  { kind: "pill", label: "Пилюля", hint: "Полностью скруглённые торцы" },
  { kind: "custom", label: "Кастом", hint: "Скоро: редактор контура", disabled: true },
];

export interface DecorShapeCard {
  kind: DecorShapeKind;
  label: string;
}

export const DECOR_SHAPE_CARDS: ReadonlyArray<DecorShapeCard> = [
  { kind: "circle", label: "Круг" },
  { kind: "square", label: "Квадрат" },
  { kind: "triangle", label: "Треугольник" },
  { kind: "star", label: "Звезда" },
  { kind: "heart", label: "Сердце" },
];

export const BASE_SHAPE_LABELS: Record<BaseShapeKind, string> = {
  rectangle: "Прямоугольник",
  roundedRectangle: "Скруглённый прямоугольник",
  circle: "Круг",
  oval: "Овал",
  pill: "Пилюля",
  custom: "Кастомная форма",
};

export const DESIGN_MODE_LABELS: Record<DesignElementMode, string> = {
  overlay: "Накладка",
  engrave: "Гравировка",
  cutout: "Вырез",
};

export const DESIGN_ELEMENT_TYPE_LABELS: Record<DesignElementType, string> = {
  image: "Рисунок",
  decor: "Декор",
  shape: "Фигура",
  text: "Текст",
};

/** Short label for a system element source (user elements have no badge). */
export const DESIGN_SOURCE_LABELS: Record<DesignElementSource, string> = {
  user: "Элемент",
  holes: "Отверстие",
  fasteners: "Крепление",
  decor: "Декор",
  textDecoration: "Текст",
  logo: "Логотип",
  legacy: "Элемент",
};

export const DESIGN_MODE_HINTS: Record<DesignElementMode, string> = {
  overlay: "Поверх формы",
  engrave: "Гравировка на поверхности",
  cutout: "Сквозной вырез / дырка",
};

// ---- Computed helpers ------------------------------------------------------

/**
 * Effective corner radius for the base shape, clamped to a meaningful range.
 *
 * - `pill` always returns half of the smaller axis (the slider is irrelevant).
 * - `rectangle` / `roundedRectangle` clamp the user value to [0, min(w,h)/2].
 * - Everything else returns 0; the renderer just won't apply it.
 */
export function effectiveCornerRadius(shape: DesignBaseShape): number {
  const half = Math.min(shape.widthMm, shape.heightMm) / 2;
  if (shape.kind === "pill") return half;
  if (!shapeUsesCornerRadius(shape.kind)) return 0;
  const raw = shape.cornerRadiusMm ?? 0;
  if (raw <= 0) return 0;
  return Math.max(0, Math.min(raw, half));
}

/** Upper bound the corner-radius input should accept for this shape. */
export function cornerRadiusMaxFor(shape: DesignBaseShape): number {
  return Math.floor(Math.min(shape.widthMm, shape.heightMm) / 2);
}

// ---- Legacy interop --------------------------------------------------------
//
// The legacy `shape` enum (`SHAPES` in constants.ts) only has rectangular /
// round / oval / custom. We collapse the richer `BaseShapeKind` to that
// vocabulary when mirroring back to legacy fields so server validation and
// the existing 2D/3D previews keep working unchanged.

export function baseKindToLegacyShape(kind: BaseShapeKind): Shape {
  switch (kind) {
    case "rectangle":
    case "roundedRectangle":
    case "pill":
      return "rectangular";
    case "circle":
      return "round";
    case "oval":
      return "oval";
    case "custom":
      return "custom";
  }
}

/**
 * Map a legacy `shape` enum value onto the richer `BaseShapeKind`. Used by the
 * 2D preview when no explicit `design.baseShape` is available (old payloads).
 *
 * `roundedRectangle` and `pill` can't be recovered from `"rectangular"` alone
 * — both collapse to `rectangle` here; callers that have a real design object
 * should prefer `design.baseShape.kind` over this fallback.
 */
export function legacyShapeToBaseKind(shape: string): BaseShapeKind {
  switch (shape) {
    case "round":
      return "circle";
    case "oval":
      return "oval";
    case "custom":
      return "custom";
    default:
      return "rectangle";
  }
}

/**
 * True when a base shape can't be faithfully represented by the legacy `shape`
 * enum + legacy previews. `pill` maps to `rectangular` (radius capped at the
 * legacy 20 mm limit) so the legacy 3D body and 2D side profile are only
 * approximate. The 2D *top* view renders pill exactly, so this flag is used to
 * surface a small "side/3D is approximate" note rather than to hide anything.
 */
export function isApproximateLegacyShape(kind: BaseShapeKind): boolean {
  return kind === "pill";
}

/**
 * Reverse map used when bootstrapping `design` from an older payload that only
 * carries legacy fields. We can't recover the distinction between rectangle
 * vs. roundedRectangle vs. pill from `"rectangular"` alone, so we infer:
 *   - rectangular + cornerRadiusMm > 0 → roundedRectangle
 *   - rectangular + cornerRadiusMm == 0 → rectangle
 *
 * `pill` is never inferred from legacy data; choosing it is a deliberate user
 * action in the new picker.
 */
export function designFromLegacy(input: {
  shape: Shape;
  widthMm: number;
  depthMm: number;
  cornerRadiusMm?: number;
}): DesignSettings {
  const baseKind: BaseShapeKind =
    input.shape === "round"
      ? "circle"
      : input.shape === "oval"
        ? "oval"
        : input.shape === "custom"
          ? "custom"
          : (input.cornerRadiusMm ?? 0) > 0
            ? "roundedRectangle"
            : "rectangle";

  return {
    baseShape: {
      ...DEFAULT_DESIGN_BASE_SHAPE,
      kind: baseKind,
      widthMm: input.widthMm,
      heightMm: input.depthMm,
      cornerRadiusMm: input.cornerRadiusMm ?? 0,
    },
    elements: [],
  };
}

// ---- Id generation ---------------------------------------------------------
//
// Generated only inside event handlers (never in render), so non-deterministic
// fallback is safe wrt. SSR/hydration. We prefer crypto.randomUUID when
// available — same approach as the form-builder slice.

export function generateDesignElementId(): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return `del_${cryptoObj.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `del_${Date.now().toString(36)}_${rand}`;
}

// ---- Element factory -------------------------------------------------------

export function createDesignElement(
  type: DesignElementType,
  mode: DesignElementMode,
): DesignElement {
  const base = {
    id: generateDesignElementId(),
    type,
    mode,
    x: 0.5,
    y: 0.5,
    width: 0.25,
    height: 0.25,
    rotation: 0,
    source: "user" as DesignElementSource,
  } satisfies Omit<
    DesignElement,
    "imageDataUrl" | "decorShape" | "text" | "fillColor" | "strokeColor" | "strokeWidth" | "locked"
  >;

  switch (type) {
    case "image":
      return {
        ...base,
        // dataUrl is filled in by the user via file input — empty placeholder
        // makes the element visible as an outline until then.
        imageDataUrl: "",
      };
    case "decor":
    case "shape":
      return {
        ...base,
        decorShape: "circle",
        fillColor: "#111827",
      };
    case "text":
      return {
        ...base,
        text: "Текст",
        fillColor: "#111827",
      };
  }
}

/**
 * A default mounting-hole element: a circular cutout near the top edge. Created
 * when the user enables `hasHoles`; it's a normal draggable design element with
 * `source: "holes"` so previews / the editor can badge it and the toggle can
 * stay in sync.
 */
export function createHoleElement(): DesignElement {
  return {
    id: generateDesignElementId(),
    type: "shape",
    mode: "cutout",
    decorShape: "circle",
    source: "holes",
    locked: true,
    x: 0.5,
    y: 0.15,
    width: 0.08,
    height: 0.08,
    rotation: 0,
  };
}

/**
 * Two default fastener elements — circular through-holes near the top corners.
 * Created when the user enables `hasFasteners`. Each is draggable with
 * `source: "fasteners"`.
 */
export function createFastenerElements(): DesignElement[] {
  const make = (x: number): DesignElement => ({
    id: generateDesignElementId(),
    type: "shape",
    mode: "cutout",
    decorShape: "circle",
    source: "fasteners",
    locked: true,
    x,
    y: 0.12,
    width: 0.06,
    height: 0.06,
    rotation: 0,
  });
  return [make(0.2), make(0.8)];
}

/**
 * A default decorative element — a circular overlay near the top-centre.
 * Created when the user enables `hasDecoration`. Unlike holes / fasteners this
 * is a fully-editable element (`source:"decor"`, not locked): the badge just
 * tells the user it's tied to the toggle. Overlay mode keeps it visible without
 * carving the body, and it can be moved / restyled / re-shaped freely.
 */
export function createDecorElement(): DesignElement {
  return {
    id: generateDesignElementId(),
    type: "decor",
    mode: "overlay",
    decorShape: "circle",
    fillColor: "#4b5563",
    source: "decor",
    x: 0.5,
    y: 0.4,
    width: 0.2,
    height: 0.2,
    rotation: 0,
  };
}

/**
 * A text-label element bridged from the legacy `appearance.textDecoration`
 * flow. Created when the user enables surface text (with non-empty content) so
 * the label becomes a selectable / draggable design element rather than a
 * separate material-only layer. `source:"textDecoration"` lets the editor badge
 * it and keep its text / colour in sync with the legacy block — the element is
 * freely movable / resizable / rotatable, but its content is edited there, not
 * in place. Overlay mode renders the glyphs filled in `fillColor` so the label
 * stays legible in the top-view preview. Caller supplies the normalized centre
 * (derived from the chosen face placement) so this module stays decoupled from
 * the appearance placement vocabulary.
 */
export function createTextDecorationElement(opts: {
  text: string;
  fillColor: string;
  x: number;
  y: number;
}): DesignElement {
  return {
    id: generateDesignElementId(),
    type: "text",
    mode: "overlay",
    text: opts.text,
    fillColor: opts.fillColor,
    source: "textDecoration",
    x: opts.x,
    y: opts.y,
    width: 0.5,
    height: 0.15,
    rotation: 0,
  };
}

// ---- Normalization ---------------------------------------------------------

/**
 * Loose, everything-optional shape of `design` as it arrives from react-hook-
 * form's `watch` (before zod fills defaults) or from a legacy payload that
 * predates the design layer. Declared structurally so this module stays free
 * of any dependency on the validation schema.
 */
export interface DesignSettingsInput {
  baseShape?: Partial<DesignBaseShape>;
  elements?: ReadonlyArray<Partial<DesignElement>>;
}

/**
 * Coerce a possibly-partial / missing design into a fully-shaped
 * `DesignSettings`. Missing pieces fall back to the module defaults, so legacy
 * payloads and mid-edit form state both render. Pure — never mutates input.
 */
export function normalizeDesign(
  raw: DesignSettingsInput | null | undefined,
): DesignSettings {
  const baseShape = raw?.baseShape ?? {};
  return {
    baseShape: {
      ...DEFAULT_DESIGN_BASE_SHAPE,
      ...baseShape,
      kind: baseShape.kind ?? DEFAULT_DESIGN_BASE_SHAPE.kind,
      widthMm: baseShape.widthMm ?? DEFAULT_DESIGN_BASE_SHAPE.widthMm,
      heightMm: baseShape.heightMm ?? DEFAULT_DESIGN_BASE_SHAPE.heightMm,
    },
    elements: Array.isArray(raw?.elements)
      ? (raw.elements as DesignElement[])
      : [],
  };
}

// ---- Summary helpers (presentation-agnostic, React-free) -------------------

export interface GroupedDesignElements {
  overlay: DesignElement[];
  engrave: DesignElement[];
  cutout: DesignElement[];
}

/** Count elements that carry a given source (defaulting missing → `user`). */
export function countElementsBySource(
  elements: ReadonlyArray<DesignElement>,
  source: DesignElementSource,
): number {
  return elements.reduce(
    (n, el) => (elementSource(el) === source ? n + 1 : n),
    0,
  );
}

/** Bucket elements by mode, preserving their original order within each mode. */
export function groupDesignElementsByMode(
  elements: ReadonlyArray<DesignElement>,
): GroupedDesignElements {
  const grouped: GroupedDesignElements = {
    overlay: [],
    engrave: [],
    cutout: [],
  };
  for (const el of elements) {
    grouped[el.mode].push(el);
  }
  return grouped;
}

/**
 * One-line, human-readable manufacturing summary of a single element:
 *   "Декор (круг) · X 50% Y 50% · 25×25% · 30°"
 * Never includes the raw image data URL — images are shown as a placeholder.
 */
export function formatDesignElementSummary(element: DesignElement): string {
  const pct = (v: number) => `${Math.round((v ?? 0) * 100)}%`;
  const parts: string[] = [DESIGN_ELEMENT_TYPE_LABELS[element.type]];

  // System holes / fasteners read better with their role name than the raw
  // "Фигура (круг)" — they're managed elements, not free-form decor.
  const source = elementSource(element);
  if (source === "holes" || source === "fasteners") {
    parts[0] = DESIGN_SOURCE_LABELS[source];
  } else if (element.type === "text" && element.text) {
    parts[0] = `Текст «${element.text}»`;
  } else if (
    (element.type === "decor" || element.type === "shape") &&
    element.decorShape
  ) {
    const decor = DECOR_SHAPE_CARDS.find((d) => d.kind === element.decorShape);
    if (decor) parts[0] = `${DESIGN_ELEMENT_TYPE_LABELS[element.type]} (${decor.label.toLowerCase()})`;
  } else if (element.type === "image") {
    parts[0] = element.imageDataUrl
      ? "Рисунок [изображение]"
      : "Рисунок [не загружен]";
  }

  parts.push(`X ${pct(element.x)} Y ${pct(element.y)}`);
  parts.push(`${pct(element.width)}×${pct(element.height)}`);
  if (element.rotation) parts.push(`${Math.round(element.rotation)}°`);

  return parts.join(" · ");
}

/**
 * Build the list of MVP limitations / operator notes that apply to a given
 * design. Only includes a note when it's actually relevant, so the summary
 * stays quiet for simple designs. Pure — safe to call in render.
 */
export function getDesignWarnings(design: DesignSettings): string[] {
  const warnings: string[] = [];
  const { baseShape, elements } = design;
  const grouped = groupDesignElementsByMode(elements);

  if (elements.length === 0) {
    warnings.push("Элементы дизайна не добавлены.");
  }

  if (baseShape.kind === "custom") {
    warnings.push(
      "Кастомная форма показана приближённо как габаритный прямоугольник — точный контур уточнит оператор.",
    );
  }

  if (baseShape.kind === "pill") {
    warnings.push(
      "Форма «пилюля»: вид сверху точный, 3D-превью приближённое.",
    );
  }

  if (grouped.cutout.some((e) => e.type === "image")) {
    warnings.push(
      "Вырез по изображению в этом MVP использует прямоугольную область (bounding box), а не контур по альфа-каналу.",
    );
  }

  if (grouped.engrave.some((e) => e.type === "image")) {
    warnings.push(
      "Гравировка по изображению показана в оттенках серого — это приближённое превью.",
    );
  }

  if (grouped.cutout.length > 0) {
    warnings.push(
      "Сквозные вырезы показаны схематично; точную геометрию отверстий подготовит оператор.",
    );
  }

  return warnings;
}
