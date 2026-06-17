// Accessories domain model — React-free.
//
// Accessories are *constructive* features attached to a side/face of the item
// (currently only handles / "ручки"). They are intentionally kept separate from
// `design.elements` (top-surface decor / holes / text / image): an accessory has
// a side, a length and a vertical position + profile, which top-surface elements
// do not. Mixing the two would confuse both the data model and the renderers.
//
// This module owns:
//   - the enums + types that the Zod schema and the visual scene reference;
//   - Russian display labels for the UI / Review;
//   - factory + normalisation helpers used in event handlers and the scene
//     builder respectively.
//
// Invariants (shared with design.ts / constructor-visual-scene.ts):
//   - no React, no DOM, no three.js imports here;
//   - never generate ids in render — only in event handlers (createHandleAccessory);
//   - normalisation always clamps user/legacy input into a safe range so the
//     renderers can trust the values without re-validating.
//
// Note: `accessories` are side-mounted add-ons like handles. A lid ("крышка") is
// NOT an accessory — it is a top-level construction option and lives in its own
// model in `src/lib/lid.ts`. Do not add lid fields here.

export const ACCESSORY_KINDS = ["handle"] as const;
export type AccessoryKind = (typeof ACCESSORY_KINDS)[number];

export const ACCESSORY_SIDES = ["front", "back", "left", "right"] as const;
export type AccessorySide = (typeof ACCESSORY_SIDES)[number];

export const HANDLE_PROFILES = ["bar", "recessed", "knob"] as const;
export type HandleProfile = (typeof HANDLE_PROFILES)[number];

/**
 * A constructive accessory attached to a side of the item.
 *
 * All spatial fields are normalised to [0..1] so they're resolution- and
 * dimension-independent — the 2D and 3D renderers multiply them by the current
 * base dimensions. `x` runs along the chosen side, `z` is the vertical position
 * (0 = bottom, 1 = top), `length` is the span along the side and `height` is the
 * visual height/extent of the handle.
 */
export interface Accessory {
  id: string;
  kind: AccessoryKind;
  side: AccessorySide;
  x: number;
  z: number;
  length: number;
  height: number;
  profile: HandleProfile;
}

/**
 * Loose, fully-optional shape accepted from form `watch()` output / legacy
 * payloads before normalisation. Everything is optional and widely typed so the
 * builder can ingest partial or stale data without throwing.
 */
export interface AccessoryInput {
  id?: string;
  kind?: string;
  side?: string;
  x?: number;
  z?: number;
  length?: number;
  height?: number;
  profile?: string;
}

export const ACCESSORY_SIDE_LABELS: Record<AccessorySide, string> = {
  front: "Передняя",
  back: "Задняя",
  left: "Левая",
  right: "Правая",
};

export const HANDLE_PROFILE_LABELS: Record<HandleProfile, string> = {
  bar: "Перекладина",
  recessed: "Утопленная",
  knob: "Кнопка",
};

/** Minimum spans so a handle is always visible / editable. */
const MIN_LENGTH = 0.05;
const MIN_HEIGHT = 0.03;

/**
 * Sensible default handle: centred horizontally, near the top of a front face,
 * a medium-width bar. Used by the factory and as the seed for new handles.
 */
export const DEFAULT_HANDLE: Omit<Accessory, "id"> = {
  kind: "handle",
  side: "front",
  x: 0.5,
  z: 0.85,
  length: 0.4,
  height: 0.12,
  profile: "bar",
};

// ---- Id generation ---------------------------------------------------------
//
// Generated only inside event handlers (never in render), so the non-deterministic
// fallback is safe wrt. SSR/hydration. Mirrors generateDesignElementId in design.ts.

export function generateAccessoryId(): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return `acc_${cryptoObj.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `acc_${Date.now().toString(36)}_${rand}`;
}

/** Event-handler factory for a new handle accessory. */
export function createHandleAccessory(
  overrides?: Partial<Omit<Accessory, "id" | "kind">>,
): Accessory {
  return {
    id: generateAccessoryId(),
    ...DEFAULT_HANDLE,
    ...overrides,
  };
}

// ---- Normalisation ---------------------------------------------------------

function clamp01(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function isSide(value: unknown): value is AccessorySide {
  return (
    typeof value === "string" &&
    (ACCESSORY_SIDES as readonly string[]).includes(value)
  );
}

function isProfile(value: unknown): value is HandleProfile {
  return (
    typeof value === "string" &&
    (HANDLE_PROFILES as readonly string[]).includes(value)
  );
}

/**
 * Coerce a single loose accessory into a fully-typed, clamped `Accessory`.
 * Index is used to synthesise a stable-ish id when the input lacks one (legacy
 * payloads); this runs in the scene builder, not render, but uses a deterministic
 * id so it doesn't churn hydration.
 */
export function normalizeAccessory(
  input: AccessoryInput,
  index: number,
): Accessory {
  const length = Math.max(MIN_LENGTH, clamp01(input.length, DEFAULT_HANDLE.length));
  const height = Math.max(MIN_HEIGHT, clamp01(input.height, DEFAULT_HANDLE.height));
  return {
    id:
      typeof input.id === "string" && input.id.length > 0
        ? input.id
        : `acc_legacy_${index}`,
    kind: "handle",
    side: isSide(input.side) ? input.side : DEFAULT_HANDLE.side,
    x: clamp01(input.x, DEFAULT_HANDLE.x),
    z: clamp01(input.z, DEFAULT_HANDLE.z),
    length,
    height,
    profile: isProfile(input.profile) ? input.profile : DEFAULT_HANDLE.profile,
  };
}

/** Normalise an array of loose accessories; non-array input → []. */
export function normalizeAccessories(
  input: readonly AccessoryInput[] | undefined | null,
): Accessory[] {
  if (!Array.isArray(input)) return [];
  return input.map((item, index) => normalizeAccessory(item ?? {}, index));
}

// ---- Display helpers -------------------------------------------------------

/** Human-readable one-line summary for Review, e.g.
 *  "Перекладина · Передняя · вдоль 50% · по высоте 85% · длина 40% · высота 12%". */
export function formatHandleSummary(a: Accessory): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return [
    HANDLE_PROFILE_LABELS[a.profile],
    ACCESSORY_SIDE_LABELS[a.side],
    `вдоль ${pct(a.x)}`,
    `по высоте ${pct(a.z)}`,
    `длина ${pct(a.length)}`,
    `высота ${pct(a.height)}`,
  ].join(" · ");
}
