// Constructor manufacturability — derived, React-free printability checks.
//
// Turns the wizard's current form state + the already-built visual scene into a
// list of *non-blocking* recommendations the client sees before submitting:
// thin walls, tiny holes, elements too close to the edge, small text/decor,
// odd lid/handle parameters, very flat / fragile geometry, and material vs.
// environment mismatches.
//
// Design rules (same invariants as constructor-visual-scene.ts):
//   - **React-free.** No imports from "react"; usable by previews and (later)
//     operator tooling.
//   - **Derived & read-only.** Never mutates its input; the result is never
//     written to form state or the submit payload.
//   - **Heuristics only.** Simple thresholds on dimensions / normalized sizes —
//     no CAD/CSG, no exact simulation. These are hints, not hard validation;
//     the user can always submit and the operator does the final check.

import { elementSource, type DesignElement } from "@/lib/design";
import type { ConstructorVisualScene } from "@/lib/constructor-visual-scene";
import type { PrintRequestInput } from "@/lib/validations/print-request";

export type ManufacturabilitySeverity = "info" | "warning" | "danger";

export type ManufacturabilityArea =
  | "dimensions"
  | "walls"
  | "holes"
  | "text"
  | "decor"
  | "handles"
  | "lid"
  | "sections"
  | "material";

export type ManufacturabilityCheck = {
  id: string;
  severity: ManufacturabilitySeverity;
  title: string;
  message: string;
  suggestion?: string;
  area?: ManufacturabilityArea;
};

// ---- Thresholds (mm unless noted) ------------------------------------------
//
// Conservative FDM-oriented defaults. Tuned to be helpful without nagging — a
// simple, well-formed part should produce zero checks.
// Wall thresholds sit *above* the schema floor (`wallThicknessMm.min = 1.2`) so
// the danger branch is actually reachable for valid input.
const WALL_DANGER_MM = 1.6; // below this a wall is risky to print at all
const WALL_RECOMMENDED_MM = 2; // below this we recommend going thicker for strength
// Above the dimension floor (`DIMENSION_LIMITS.min = 10`) so the flat-part note
// can fire — but only for container-like product types (see below).
const FLAT_HEIGHT_MM = 12; // shorter than this reads as a flat plate
const HOLE_MIN_MM = 3; // holes smaller than this tend to close up
const EDGE_MARGIN_MM = 5; // recommended clearance from a feature to the edge
const TEXT_MIN_MM = 6; // glyph height below this is hard to render/read
const DECOR_MIN_MM = 4; // decor detail below this loses definition
const HANDLE_MIN_HEIGHT_MM = 6;
const HANDLE_MIN_LENGTH_MM = 20;
const HANDLE_RECESSED_MIN_HEIGHT_MM = 8;
const LID_THIN_MM = 1.5;
const LID_CLEARANCE_TIGHT_MM = 0.2;
const LID_CLEARANCE_LOOSE_MM = 2.5;
const SECTION_MIN_WIDTH_MM = 25;

/**
 * Container-like product types that are *expected* to have volume — only these
 * trigger the very-flat note. Intentionally flat types (stand, tray, divider,
 * sign/plaque-style "other", custom) are excluded so the panel never nags a part
 * that's meant to be flat.
 */
const VOLUME_PRODUCT_TYPES = new Set(["box", "organizer"]);

// ---- Numeric helpers -------------------------------------------------------

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const ranks: Record<ManufacturabilitySeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

/** Sort most-severe first, preserving insertion order within a severity. */
function bySeverity(
  a: ManufacturabilityCheck,
  b: ManufacturabilityCheck,
): number {
  return ranks[a.severity] - ranks[b.severity];
}

// ---- Element helpers -------------------------------------------------------

/** True when an element is a through-hole / cutout (incl. system holes/fasteners). */
function isCutoutLike(el: DesignElement): boolean {
  const src = elementSource(el);
  return el.mode === "cutout" || src === "holes" || src === "fasteners";
}

/**
 * Smallest in-plane extent of an element in mm. Element width/height are
 * fractions of the base bounding box: width maps to the base width axis, height
 * to the base depth axis (`baseShape.heightMm`).
 */
function minExtentMm(
  el: DesignElement,
  baseWidthMm: number,
  baseDepthMm: number,
): number {
  const wMm = num(el.width) * baseWidthMm;
  const hMm = num(el.height) * baseDepthMm;
  return Math.min(wMm, hMm);
}

/**
 * Smallest distance from an element's bounding box to the nearest base edge,
 * in mm. X-axis margins scale by base width, Y-axis margins by base depth.
 * Coordinates are centre-based and normalized [0..1].
 */
function minEdgeMarginMm(
  el: DesignElement,
  baseWidthMm: number,
  baseDepthMm: number,
): number {
  const halfW = num(el.width) / 2;
  const halfH = num(el.height) / 2;
  const left = (num(el.x) - halfW) * baseWidthMm;
  const right = (1 - (num(el.x) + halfW)) * baseWidthMm;
  const top = (num(el.y) - halfH) * baseDepthMm;
  const bottom = (1 - (num(el.y) + halfH)) * baseDepthMm;
  return Math.min(left, right, top, bottom);
}

// ---- Builder ---------------------------------------------------------------

/**
 * Build the list of non-blocking manufacturability recommendations from the
 * current form data + derived scene. Pure; returns most-severe-first. An empty
 * array means "no critical notes" — the UI shows a friendly good-state.
 */
export function buildManufacturabilityChecks(input: {
  data: PrintRequestInput;
  scene: ConstructorVisualScene;
}): ManufacturabilityCheck[] {
  const { data, scene } = input;
  const checks: ManufacturabilityCheck[] = [];

  const widthMm = num(data.widthMm);
  const depthMm = num(data.depthMm);
  const heightMm = num(data.heightMm);
  const wallMm = num(data.wallThicknessMm);

  // Base bounding box used to resolve normalized element sizes to mm.
  const baseWidthMm = num(scene.baseShape.widthMm, widthMm);
  const baseDepthMm = num(scene.baseShape.heightMm, depthMm);

  // ── Walls --------------------------------------------------------------
  if (wallMm > 0 && wallMm < WALL_DANGER_MM) {
    checks.push({
      id: "wall-too-thin",
      severity: "danger",
      area: "walls",
      title: "Стенка может быть слишком тонкой",
      message:
        "Стенка может быть слишком тонкой для FDM-печати — деталь может не пропечататься или получиться хрупкой.",
      suggestion:
        "Для FDM-печати обычно рекомендуем 2–3 мм. Вы можете отправить заявку — оператор предложит безопасную толщину.",
    });
  } else if (wallMm >= WALL_DANGER_MM && wallMm < WALL_RECOMMENDED_MM) {
    checks.push({
      id: "wall-thin",
      severity: "warning",
      area: "walls",
      title: "Тонкая стенка",
      message:
        "Для более прочной детали обычно рекомендуем 2–3 мм.",
      suggestion:
        "Если деталь несущая или будет испытывать нагрузку, рекомендуем увеличить толщину.",
    });
  }

  // ── Overall geometry ---------------------------------------------------
  if (
    heightMm > 0 &&
    heightMm < FLAT_HEIGHT_MM &&
    VOLUME_PRODUCT_TYPES.has(data.productType)
  ) {
    checks.push({
      id: "very-flat",
      severity: "warning",
      area: "dimensions",
      title: "Очень плоская деталь",
      message:
        "Деталь выглядит очень плоской для выбранного типа изделия. Если это должна быть коробка или органайзер, возможно стоит увеличить высоту.",
      suggestion:
        "Увеличьте высоту, если изделие должно быть объёмным.",
    });
  }

  const minFootprint = Math.min(widthMm, depthMm);
  if (minFootprint > 0 && heightMm > minFootprint * 2) {
    checks.push({
      id: "tall-narrow",
      severity: "warning",
      area: "dimensions",
      title: "Высокая и узкая деталь",
      message:
        "Деталь заметно выше своего основания — она может быть неустойчивой и легко отломиться у основания.",
      suggestion:
        "Рассмотрите более широкое основание или дополнительную опору.",
    });
  }

  // ── Holes / cutouts ----------------------------------------------------
  const cutoutEls = scene.elements.filter(isCutoutLike);

  const smallHoles = cutoutEls.filter(
    (el) => minExtentMm(el, baseWidthMm, baseDepthMm) < HOLE_MIN_MM,
  ).length;
  if (smallHoles > 0) {
    checks.push({
      id: "small-holes",
      severity: "warning",
      area: "holes",
      title: "Маленькие отверстия",
      message:
        smallHoles === 1
          ? "Одно отверстие меньше 3 мм — такие отверстия могут заплыть при печати."
          : `${smallHoles} отверстий меньше 3 мм — такие отверстия могут заплыть при печати.`,
      suggestion:
        "Рекомендуем диаметр от 3 мм; точные отверстия оператор может досверлить после печати.",
    });
  }

  const edgeHoles = cutoutEls.filter(
    (el) => minEdgeMarginMm(el, baseWidthMm, baseDepthMm) < EDGE_MARGIN_MM,
  ).length;
  if (edgeHoles > 0) {
    checks.push({
      id: "hole-near-edge",
      severity: "warning",
      area: "holes",
      title: "Отверстие близко к краю",
      message:
        edgeHoles === 1
          ? "Отверстие расположено очень близко к краю — стенка между отверстием и краем может быть хрупкой."
          : `${edgeHoles} отверстий расположены очень близко к краю — перемычки могут быть хрупкими.`,
      suggestion:
        "Рекомендуемый отступ от края — не менее 5 мм.",
    });
  }

  // ── Text ---------------------------------------------------------------
  const textEls = scene.elements.filter((el) => el.type === "text");
  // Effective glyph height in mm: an element-based label uses its box height,
  // the legacy surface-text layer uses the resolved material text size.
  const smallTextEl = textEls.some(
    (el) => num(el.height) * baseDepthMm > 0 && num(el.height) * baseDepthMm < TEXT_MIN_MM,
  );
  const smallSurfaceText =
    scene.material.text.active && scene.material.text.sizeMm < TEXT_MIN_MM;
  if (smallTextEl || smallSurfaceText) {
    checks.push({
      id: "small-text",
      severity: "warning",
      area: "text",
      title: "Мелкий текст",
      message:
        "Высота букв очень маленькая — текст может плохо пропечататься и читаться.",
      suggestion:
        "Рекомендуем высоту букв от 6 мм. Для гравировки/выреза — ещё крупнее.",
    });
  }

  const engravedOrCutText = textEls.some(
    (el) => el.mode === "engrave" || el.mode === "cutout",
  );
  if (engravedOrCutText) {
    checks.push({
      id: "thin-text-cut",
      severity: "info",
      area: "text",
      title: "Текст вырезом / гравировкой",
      message:
        "Тонкие буквы при вырезе или гравировке могут потерять детали.",
      suggestion:
        "Используйте более жирный шрифт и крупный размер, чтобы штрихи не пропали.",
    });
  }

  // ── Decor / images -----------------------------------------------------
  const smallDecor = scene.elements.filter((el) => {
    if (el.type !== "decor" && el.type !== "shape" && el.type !== "image") {
      return false;
    }
    if (isCutoutLike(el)) return false; // counted under holes already
    return minExtentMm(el, baseWidthMm, baseDepthMm) < DECOR_MIN_MM;
  }).length;
  if (smallDecor > 0) {
    checks.push({
      id: "small-decor",
      severity: "info",
      area: "decor",
      title: "Мелкие декоративные элементы",
      message:
        "Очень маленькие декоративные элементы или рисунки могут потерять детализацию при печати.",
      suggestion: "Увеличьте элемент или упростите его форму.",
    });
  }

  // ── Handles ------------------------------------------------------------
  for (const a of scene.accessories) {
    // Length runs along the chosen side: front/back = width, left/right = depth.
    const alongMm =
      a.side === "left" || a.side === "right" ? depthMm : widthMm;
    const lengthMm = num(a.length) * alongMm;
    const handleHeightMm = num(a.height) * heightMm;

    if (handleHeightMm > 0 && handleHeightMm < HANDLE_MIN_HEIGHT_MM) {
      checks.push({
        id: `handle-low-${a.id}`,
        severity: "warning",
        area: "handles",
        title: "Низкая ручка",
        message:
          "Ручка получается очень низкой — за неё может быть неудобно браться, и она легко отломится.",
        suggestion: "Рекомендуем высоту ручки от 6 мм.",
      });
    }

    if (lengthMm > 0 && lengthMm < HANDLE_MIN_LENGTH_MM) {
      checks.push({
        id: `handle-short-${a.id}`,
        severity: "warning",
        area: "handles",
        title: "Короткая ручка",
        message:
          "Ручка очень короткая — за неё может быть неудобно браться.",
        suggestion: "Рекомендуем длину ручки от 20 мм.",
      });
    }

    if (
      a.profile === "recessed" &&
      handleHeightMm > 0 &&
      handleHeightMm < HANDLE_RECESSED_MIN_HEIGHT_MM
    ) {
      checks.push({
        id: `handle-recessed-shallow-${a.id}`,
        severity: "warning",
        area: "handles",
        title: "Мелкая утопленная ручка",
        message:
          "Утопленная ручка слишком мелкая — пальцам может не хватить места.",
        suggestion: "Сделайте углубление глубже или выберите другой профиль.",
      });
    }

    // Handle runs off the side edge: x is the centre along the side, length the span.
    const half = num(a.length) / 2;
    if (num(a.x) - half < 0.05 || num(a.x) + half > 0.95) {
      checks.push({
        id: `handle-near-edge-${a.id}`,
        severity: "info",
        area: "handles",
        title: "Ручка у самого края",
        message:
          "Ручка расположена у самого края грани — крепление может быть слабым.",
        suggestion: "Сместите ручку немного к центру грани.",
      });
    }
  }

  // ── Lid ----------------------------------------------------------------
  if (scene.lid) {
    const lid = scene.lid;
    if (lid.thicknessMm < LID_THIN_MM) {
      checks.push({
        id: "lid-thin",
        severity: "warning",
        area: "lid",
        title: "Тонкая крышка",
        message:
          "Крышка может получиться слишком тонкой и хрупкой.",
        suggestion: "Рекомендуем толщину крышки от 1.5–2 мм.",
      });
    }
    if (lid.fit === "inset") {
      if (lid.clearanceMm < LID_CLEARANCE_TIGHT_MM) {
        checks.push({
          id: "lid-clearance-tight",
          severity: "warning",
          area: "lid",
          title: "Маленький зазор крышки",
          message:
            "Зазор для вставной крышки очень маленький — после печати она может не закрыться.",
          suggestion: "Рекомендуем технологический зазор около 0.2–0.5 мм.",
        });
      } else if (lid.clearanceMm > LID_CLEARANCE_LOOSE_MM) {
        checks.push({
          id: "lid-clearance-loose",
          severity: "info",
          area: "lid",
          title: "Большой зазор крышки",
          message:
            "Зазор крышки довольно большой — она может сидеть свободно.",
          suggestion: "Уменьшите зазор, если нужна плотная посадка.",
        });
      }
    }
    if (lid.hinged) {
      checks.push({
        id: "lid-hinged",
        severity: "info",
        area: "lid",
        title: "Крышка на петле",
        message:
          "Петли показаны схематично — финальную конструкцию петли уточнит оператор.",
      });
    }
  }

  // ── Sections -----------------------------------------------------------
  if (scene.sections.count >= 2 && widthMm > 0) {
    const perSectionMm = widthMm / scene.sections.count;
    if (perSectionMm < SECTION_MIN_WIDTH_MM) {
      checks.push({
        id: "sections-too-narrow",
        severity: "warning",
        area: "sections",
        title: "Слишком узкие секции",
        message:
          "При таком числе секций каждая получается очень узкой, а перегородки — близко друг к другу.",
        suggestion:
          "Уменьшите число секций или увеличьте ширину изделия (рекомендуем от 25 мм на секцию).",
      });
    }
  }

  // ── Material / environment --------------------------------------------
  const env = Array.isArray(data.usageEnvironment) ? data.usageEnvironment : [];
  const material = typeof data.material === "string" ? data.material : "";
  const harshEnv = env.includes("outdoor") || env.includes("high_temperature");
  if (harshEnv && material === "PLA") {
    checks.push({
      id: "material-pla-harsh",
      severity: "warning",
      area: "material",
      title: "PLA для улицы или жары",
      message:
        "PLA плохо переносит улицу, солнце и нагрев — деталь может деформироваться.",
      suggestion:
        "Для таких условий обычно рекомендуем PETG или ABS — оператор подскажет подходящий материал.",
    });
  }
  if (env.includes("load_bearing") && data.strength === "decorative") {
    checks.push({
      id: "strength-load",
      severity: "warning",
      area: "material",
      title: "Несущая нагрузка при декоративной прочности",
      message:
        "Для несущей детали декоративной прочности может не хватить.",
      suggestion:
        "Рассмотрите усиленную прочность или более толстые стенки.",
    });
  }

  return checks.sort(bySeverity);
}
