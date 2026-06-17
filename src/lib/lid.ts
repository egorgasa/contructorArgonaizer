// Lid ("крышка") domain model — React-free.
//
// A lid is a top-level *construction option* of the item, not a side-mounted
// accessory and not a top-surface design element. It therefore lives in its own
// optional `lid` object on the form (mirrored into `scene.lid`), separate from
// `accessories` (handles) and `design.elements` (decor / holes / text / image).
//
// This module owns the enums + types the Zod schema and the visual scene
// reference, the Russian display labels, and a normaliser that clamps user /
// legacy input into a safe range the renderers can trust.
//
// Invariants (shared with design.ts / accessories.ts / constructor-visual-scene.ts):
//   - no React, no DOM, no three.js imports here;
//   - normalisation always produces a fully-shaped, clamped `LidSettings`;
//   - old payloads without `lid` default to a safe disabled lid.

export const LID_TYPES = ["flat", "inset", "hinged"] as const;
export type LidType = (typeof LID_TYPES)[number];

export const LID_FITS = ["overlay", "inset"] as const;
export type LidFit = (typeof LID_FITS)[number];

/**
 * Persisted lid configuration.
 *
 * - `fit` decides how the lid relates to the body footprint: `overlay` sits on
 *   top and extends beyond by `overhangMm`; `inset` drops into the opening with
 *   a `clearanceMm` technological gap.
 * - `type` is the lid style (flat slab / inset panel / hinged). Hinges are drawn
 *   schematically only.
 * - dimensions are millimetres, matching the rest of the form.
 */
export interface LidSettings {
  enabled: boolean;
  type: LidType;
  fit: LidFit;
  thicknessMm: number;
  overhangMm: number;
  clearanceMm: number;
}

/** Loose, fully-optional shape accepted from form `watch()` / legacy payloads. */
export interface LidSettingsInput {
  enabled?: boolean;
  type?: string;
  fit?: string;
  thicknessMm?: number;
  overhangMm?: number;
  clearanceMm?: number;
}

export const LID_TYPE_LABELS: Record<LidType, string> = {
  flat: "Плоская",
  inset: "Вставная",
  hinged: "На петле",
};

export const LID_FIT_LABELS: Record<LidFit, string> = {
  overlay: "Накладная",
  inset: "Внутренняя",
};

/** Safe disabled default — old payloads without `lid` resolve to this. */
export const DEFAULT_LID: LidSettings = {
  enabled: false,
  type: "flat",
  fit: "overlay",
  thicknessMm: 3,
  overhangMm: 2,
  clearanceMm: 0.5,
};

// Clamp bands — keep dimensions sane so the previews can't be broken by a
// corrupted payload or an extreme manual edit.
const THICKNESS_MIN = 0.5;
const THICKNESS_MAX = 50;
const OVERHANG_MAX = 50;
const CLEARANCE_MAX = 20;

export function createDefaultLid(): LidSettings {
  return { ...DEFAULT_LID };
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function isLidType(value: unknown): value is LidType {
  return typeof value === "string" && (LID_TYPES as readonly string[]).includes(value);
}

function isLidFit(value: unknown): value is LidFit {
  return typeof value === "string" && (LID_FITS as readonly string[]).includes(value);
}

/**
 * Coerce loose / partial lid input into a fully-shaped, clamped `LidSettings`.
 * Used by the scene builder; missing input → the disabled default.
 */
export function normalizeLid(
  input: LidSettingsInput | undefined | null,
): LidSettings {
  if (!input || typeof input !== "object") return createDefaultLid();
  return {
    enabled: input.enabled === true,
    type: isLidType(input.type) ? input.type : DEFAULT_LID.type,
    fit: isLidFit(input.fit) ? input.fit : DEFAULT_LID.fit,
    thicknessMm: clampNumber(
      input.thicknessMm,
      DEFAULT_LID.thicknessMm,
      THICKNESS_MIN,
      THICKNESS_MAX,
    ),
    overhangMm: clampNumber(input.overhangMm, DEFAULT_LID.overhangMm, 0, OVERHANG_MAX),
    clearanceMm: clampNumber(
      input.clearanceMm,
      DEFAULT_LID.clearanceMm,
      0,
      CLEARANCE_MAX,
    ),
  };
}
