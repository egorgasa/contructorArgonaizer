import { COLORS } from "@/lib/constants";

/**
 * Appearance domain — visual properties of a printed item.
 *
 * This module is intentionally decoupled from the legacy `material` / `color`
 * string fields on the form: those represent the *catalogue choice*, while
 * `appearance` stores concrete hex/structured data used by previews and the
 * future 3D renderer. The two co-exist; helpers below keep them in sync.
 */

// Strict 6-digit hex literal. Shorthand `#fff` is intentionally not allowed —
// every entry in COLORS is full-length and serializers expect a stable format.
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const MATERIAL_TYPES = ["PLA", "PETG", "ABS", "TPU", "unknown"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_FINISHES = [
  "matte",
  "glossy",
  "semi_transparent",
  "textured",
] as const;
export type MaterialFinish = (typeof MATERIAL_FINISHES)[number];

/** UI-facing catalogue for the material finish picker. Order matches MATERIAL_FINISHES. */
export const MATERIAL_FINISH_OPTIONS: ReadonlyArray<{
  value: MaterialFinish;
  label: string;
  hint: string;
}> = [
  { value: "matte", label: "Матовый", hint: "Ровная поверхность без блеска" },
  { value: "glossy", label: "Глянцевый", hint: "С блеском, заметные блики" },
  {
    value: "semi_transparent",
    label: "Полупрозрачный",
    hint: "Свет проходит частично",
  },
  { value: "textured", label: "С текстурой", hint: "Шероховатая поверхность" },
];

/** UI labels for the appearance material type enum (used on review screens). */
export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  PLA: "PLA",
  PETG: "PETG",
  ABS: "ABS",
  TPU: "TPU",
  unknown: "Не выбран",
};

/**
 * Compact label map derived from MATERIAL_FINISH_OPTIONS — convenient for
 * review screens and the operator copy-text formatter that don't need the
 * `hint` field. Kept in lockstep with the option list above so a single
 * source of truth still drives the picker.
 */
export const MATERIAL_FINISH_LABELS: Record<MaterialFinish, string> = {
  matte: "Матовый",
  glossy: "Глянцевый",
  semi_transparent: "Полупрозрачный",
  textured: "С текстурой",
};

export const PATTERN_TYPES = [
  "none",
  "stripes",
  "dots",
  "grid",
  "honeycomb",
  "waves",
  "custom",
] as const;
export type PatternType = (typeof PATTERN_TYPES)[number];

export const PATTERN_PLACEMENTS = ["all", "front", "sides", "top"] as const;
export type PatternPlacement = (typeof PATTERN_PLACEMENTS)[number];

export const TEXT_PLACEMENTS = ["front", "back", "left", "right", "top"] as const;
export type TextPlacement = (typeof TEXT_PLACEMENTS)[number];

/** Russian labels for the pattern type enum — used by UI cards and review screens. */
export const PATTERN_TYPE_LABELS: Record<PatternType, string> = {
  none: "Без рисунка",
  stripes: "Полосы",
  dots: "Точки",
  grid: "Сетка",
  honeycomb: "Соты",
  waves: "Волны",
  custom: "Свой рисунок",
};

/** Russian labels for the pattern placement enum. */
export const PATTERN_PLACEMENT_LABELS: Record<PatternPlacement, string> = {
  all: "Везде",
  front: "Только спереди",
  sides: "Только по бокам",
  top: "Только сверху",
};

/** Russian labels for the text decoration placement enum. */
export const TEXT_PLACEMENT_LABELS: Record<TextPlacement, string> = {
  front: "Спереди",
  back: "Сзади",
  left: "Слева",
  right: "Справа",
  top: "Сверху",
};

export interface AppearancePattern {
  enabled: boolean;
  type: PatternType;
  colorHex: string;
  scale: number;
  opacity: number;
  placement: PatternPlacement;
}

export interface AppearanceTextDecoration {
  enabled: boolean;
  text: string | null;
  colorHex: string;
  size: number;
  placement: TextPlacement;
}

export interface Appearance {
  baseColorHex: string;
  materialType: MaterialType;
  materialFinish: MaterialFinish;
  opacity: number;
  pattern: AppearancePattern;
  textDecoration: AppearanceTextDecoration;
}

// Default hex literals come straight from the existing COLORS catalogue so that
// the new `baseColorHex` matches what users see in the colour picker.
export const DEFAULT_BASE_HEX = "#F5F5F5"; // white
export const DEFAULT_PATTERN_HEX = "#1F1F1F"; // black
export const DEFAULT_TEXT_HEX = "#1F1F1F"; // black

const DEFAULT_PATTERN: AppearancePattern = {
  enabled: false,
  type: "none",
  colorHex: DEFAULT_PATTERN_HEX,
  scale: 1,
  opacity: 1,
  placement: "all",
};

const DEFAULT_TEXT_DECORATION: AppearanceTextDecoration = {
  enabled: false,
  text: null,
  colorHex: DEFAULT_TEXT_HEX,
  size: 16,
  placement: "front",
};

export const DEFAULT_APPEARANCE: Appearance = {
  baseColorHex: DEFAULT_BASE_HEX,
  materialType: "unknown",
  materialFinish: "matte",
  opacity: 1,
  pattern: DEFAULT_PATTERN,
  textDecoration: DEFAULT_TEXT_DECORATION,
};

/**
 * Produce a fresh, mutation-safe copy of the appearance defaults. Use this
 * when initialising react-hook-form state so different form instances don't
 * share nested object references.
 */
export function createDefaultAppearance(): Appearance {
  return {
    ...DEFAULT_APPEARANCE,
    pattern: { ...DEFAULT_APPEARANCE.pattern },
    textDecoration: { ...DEFAULT_APPEARANCE.textDecoration },
  };
}

/** Convert a legacy COLORS value (e.g. "white") to a hex literal. */
export function colorValueToHex(value: string | null | undefined): string {
  if (!value) return DEFAULT_BASE_HEX;
  return COLORS.find((c) => c.value === value)?.hex ?? DEFAULT_BASE_HEX;
}

/**
 * Convert a legacy MATERIALS value (e.g. "PLA", "consult") to the appearance
 * `MaterialType` enum. Catalogue values that don't map directly (anything but
 * PLA/PETG/ABS/TPU) collapse to "unknown" — that matches the user-facing
 * "Не знаю — посоветуйте" option.
 */
export function materialValueToType(
  value: string | null | undefined,
): MaterialType {
  if (value === "PLA" || value === "PETG" || value === "ABS" || value === "TPU") {
    return value;
  }
  return "unknown";
}
