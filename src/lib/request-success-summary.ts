// Client success-page summary — a small, *safe* projection of a submitted
// constructor request, used only to give the user a friendly confirmation after
// submit. It is NOT part of the payload, the schema, or the backend.
//
// Safety rules (the whole point of this module):
//   - only derived, non-sensitive fields (labels, dimensions, yes/no flags);
//   - NEVER carry raw `imageDataUrl`, the full payload, contact details, or free
//     comment text — those must not leak onto the success page or into storage;
//   - `buildRequestSuccessSummary` is pure; the storage helpers are the only
//     window-touching part and are SSR-guarded.

import { PRODUCT_TYPES, MATERIALS, COLORS } from "@/lib/constants";
import {
  BASE_SHAPE_LABELS,
  normalizeDesign,
  countElementsBySource,
} from "@/lib/design";
import type { PrintRequestInput } from "@/lib/validations/print-request";

/** sessionStorage key the wizard writes and the success page reads. */
export const REQUEST_SUCCESS_SUMMARY_KEY = "constructor:lastRequestSummary";

/**
 * A safe, render-ready summary of a submitted request. Every field is either a
 * human label, a dimension string or a boolean/count — nothing that could
 * expose private input. `publicNumber` ties the summary to a specific request so
 * the success page can ignore a stale summary if the URL points elsewhere.
 */
export interface RequestSuccessSummary {
  publicNumber: string | null;
  productTypeLabel: string;
  /** "Ш × Г × В" in mm, already formatted. */
  dimensions: string;
  baseShapeLabel: string;
  materialLabel: string;
  colorLabel: string;
  sectionsCount: number;
  hasLid: boolean;
  handlesCount: number;
  hasHoles: boolean;
  hasFasteners: boolean;
  hasText: boolean;
  hasPattern: boolean;
  hasDecor: boolean;
  hasImage: boolean;
}

function labelOf(
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string | undefined,
): string | null {
  if (!value) return null;
  return list.find((item) => item.value === value)?.label ?? null;
}

/**
 * Build the safe summary from the just-submitted form data. Reads defensively
 * (the data is the parsed output, but every field is treated as optional) and
 * intentionally drops everything that isn't a label / dimension / flag.
 */
export function buildRequestSuccessSummary(
  data: PrintRequestInput,
  publicNumber: string | null,
): RequestSuccessSummary {
  const design = normalizeDesign(data.design);
  const elements = design.elements;

  const widthMm = Number(data.widthMm) || 0;
  const depthMm = Number(data.depthMm) || 0;
  const heightMm = Number(data.heightMm) || 0;

  const materialLabel = labelOf(MATERIALS, data.material) ?? (data.material || "—");
  // A custom colour is stored as a non-catalogue value; surface it as the
  // generic "свой цвет" label rather than leaking a raw hex string.
  const colorLabel =
    labelOf(COLORS, data.color) ?? (data.color ? "Свой цвет" : "—");

  const hasText =
    !!data.appearance?.textDecoration?.enabled ||
    elements.some((el) => el.type === "text");
  // Surface pattern (a material finish, not a placed element) — mirrors the
  // Review "Рисунок" row so the two screens can't disagree.
  const hasPattern = !!data.appearance?.pattern?.enabled;
  // Decoration counted by element *source*, exactly like Review's "Декор" row
  // (`countElementsBySource(elements, "decor")`). Counting by `type === "decor"`
  // would wrongly include cutout-mode decor shapes and contradict Review.
  const hasDecor =
    !!data.hasDecoration || countElementsBySource(elements, "decor") > 0;
  // Boolean only — the actual imageDataUrl is never read or stored.
  const hasImage = elements.some((el) => el.type === "image");

  return {
    publicNumber,
    productTypeLabel:
      labelOf(PRODUCT_TYPES, data.productType) ?? "Изделие",
    dimensions: `${widthMm} × ${depthMm} × ${heightMm} мм`,
    baseShapeLabel: BASE_SHAPE_LABELS[design.baseShape.kind],
    materialLabel,
    colorLabel,
    sectionsCount: Math.max(0, Math.floor(Number(data.sectionsCount) || 0)),
    hasLid: !!data.lid?.enabled,
    handlesCount: Array.isArray(data.accessories) ? data.accessories.length : 0,
    hasHoles: !!data.hasHoles,
    hasFasteners: !!data.hasFasteners,
    hasText,
    hasPattern,
    hasDecor,
    hasImage,
  };
}

/**
 * Persist the summary for the success page to pick up after the redirect.
 * sessionStorage (not localStorage) so it's scoped to the tab session and
 * cleared when the tab closes. SSR-guarded and failure-tolerant — storage may
 * be unavailable (private mode / quota) and that must never break submit.
 */
export function storeRequestSuccessSummary(
  summary: RequestSuccessSummary,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      REQUEST_SUCCESS_SUMMARY_KEY,
      JSON.stringify(summary),
    );
  } catch {
    // Ignore — the success page degrades gracefully without a summary.
  }
}

/** Read + parse the stored summary, or `null` if absent / malformed. */
export function readRequestSuccessSummary(): RequestSuccessSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(REQUEST_SUCCESS_SUMMARY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as RequestSuccessSummary;
  } catch {
    return null;
  }
}
