import { z } from "zod";
import {
  CORNER_RADIUS_LIMITS,
  DIMENSION_LIMITS,
  PRODUCT_TYPES,
  PREFERRED_CONTACT_TIMES,
  QUOTE_CURRENCIES,
  QUOTE_STATUS_VALUES,
  REQUEST_STATUS_VALUES,
  SECTIONS_LIMITS,
  SHAPES,
  STRENGTH_OPTIONS,
  USAGE_ENVIRONMENTS,
  WALL_THICKNESS_LIMITS,
} from "@/lib/constants";
import {
  DEFAULT_BASE_HEX,
  DEFAULT_PATTERN_HEX,
  DEFAULT_TEXT_HEX,
  HEX_COLOR_RE,
  MATERIAL_FINISHES,
  MATERIAL_TYPES,
  PATTERN_PLACEMENTS,
  PATTERN_TYPES,
  TEXT_PLACEMENTS,
} from "@/lib/appearance";
import {
  BASE_SHAPE_KINDS,
  DECOR_SHAPE_KINDS,
  DEFAULT_DESIGN,
  DESIGN_ELEMENT_MODES,
  DESIGN_ELEMENT_SOURCES,
  DESIGN_ELEMENT_TYPES,
} from "@/lib/design";
import {
  ACCESSORY_KINDS,
  ACCESSORY_SIDES,
  HANDLE_PROFILES,
} from "@/lib/accessories";
import { LID_TYPES, LID_FITS } from "@/lib/lid";

const productTypeValues = PRODUCT_TYPES.map((p) => p.value) as [string, ...string[]];
const shapeValues = SHAPES.map((s) => s.value) as [string, ...string[]];
const strengthValues = STRENGTH_OPTIONS.map((s) => s.value) as [string, ...string[]];
const envValues = USAGE_ENVIRONMENTS.map((e) => e.value) as [string, ...string[]];
const contactTimeValues = PREFERRED_CONTACT_TIMES.map((t) => t.value) as [string, ...string[]];

// Material/color use free strings here — they are validated against constants on the UI side,
// but on the server we accept any non-empty string (the catalogue can change without breaking saved requests).
const nonEmpty = (label: string) => z.string().trim().min(1, `${label} обязательно`);

const hexColor = z
  .string()
  .trim()
  .regex(HEX_COLOR_RE, "Цвет должен быть в формате #RRGGBB");

// All inner fields carry defaults so an empty/legacy payload still parses
// successfully — important for backward compatibility with requests created
// before `appearance` existed.
const appearancePatternSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.enum(PATTERN_TYPES).default("none"),
  colorHex: hexColor.default(DEFAULT_PATTERN_HEX),
  scale: z
    .number({ invalid_type_error: "Масштаб узора — число" })
    .min(0.5, "Масштаб узора не меньше 0.5")
    .max(5, "Масштаб узора не больше 5")
    .default(1),
  opacity: z
    .number({ invalid_type_error: "Прозрачность узора — число" })
    .min(0, "Прозрачность узора не меньше 0")
    .max(1, "Прозрачность узора не больше 1")
    .default(1),
  placement: z.enum(PATTERN_PLACEMENTS).default("all"),
});

const appearanceTextDecorationSchema = z.object({
  enabled: z.boolean().default(false),
  // Null is the "blank" sentinel; an empty string would still parse but we
  // surface "missing text when enabled" via superRefine below.
  text: z
    .string()
    .max(40, "Текст не больше 40 символов")
    .nullable()
    .default(null),
  colorHex: hexColor.default(DEFAULT_TEXT_HEX),
  size: z
    .number({ invalid_type_error: "Размер текста — число" })
    .min(8, "Размер текста не меньше 8")
    .max(72, "Размер текста не больше 72")
    .default(16),
  placement: z.enum(TEXT_PLACEMENTS).default("front"),
});

// ---- Design schema -------------------------------------------------------
//
// Mirrors `DesignSettings` from src/lib/design.ts. Stored alongside the legacy
// shape/cornerRadiusMm/widthMm/depthMm/heightMm fields — the wizard keeps the
// two in sync. Old payloads without `design` parse cleanly because the field
// itself is `.default(DEFAULT_DESIGN)` and every nested field carries its own
// default.

const designBaseShapeSchema = z.object({
  kind: z.enum(BASE_SHAPE_KINDS).default("rectangle"),
  widthMm: z
    .number({ invalid_type_error: "Ширина формы — число" })
    .min(1, "Ширина формы должна быть положительной")
    .default(180),
  heightMm: z
    .number({ invalid_type_error: "Высота формы — число" })
    .min(1, "Высота формы должна быть положительной")
    .default(120),
  cornerRadiusMm: z
    .number({ invalid_type_error: "Скругление — число" })
    .min(0)
    .optional(),
  fillColor: z.string().trim().regex(HEX_COLOR_RE).optional(),
  strokeColor: z.string().trim().regex(HEX_COLOR_RE).optional(),
  strokeWidth: z.number().min(0).optional(),
});

const designElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(DESIGN_ELEMENT_TYPES),
  mode: z.enum(DESIGN_ELEMENT_MODES),
  // Coordinates are normalized to [0..1] of the base shape's bounding box.
  // We don't hard-clamp them in zod (the editor handles that) — but reject
  // wildly out-of-range numbers so a corrupted payload can't break the SVG.
  x: z.number().min(-5).max(5),
  y: z.number().min(-5).max(5),
  width: z.number().min(0).max(5),
  height: z.number().min(0).max(5),
  rotation: z.number().optional(),
  imageDataUrl: z.string().optional(),
  decorShape: z.enum(DECOR_SHAPE_KINDS).optional(),
  text: z.string().max(80).optional(),
  fillColor: z.string().trim().regex(HEX_COLOR_RE).optional(),
  strokeColor: z.string().trim().regex(HEX_COLOR_RE).optional(),
  strokeWidth: z.number().min(0).optional(),
  // Origin marker for system-managed holes / fasteners. Optional so older
  // payloads (no source) keep parsing — they're treated as `user`.
  source: z.enum(DESIGN_ELEMENT_SOURCES).optional(),
  locked: z.boolean().optional(),
});

export const designSchema = z.object({
  baseShape: designBaseShapeSchema.default({}),
  elements: z.array(designElementSchema).default([]),
});

// Constructive accessory (currently only handles). Kept separate from
// `design.elements`: an accessory lives on a side/face with a length + profile,
// unlike top-surface decor. All spatial fields are normalised to [0..1] and
// clamped here so the renderers can trust them without re-validating.
export const accessorySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(ACCESSORY_KINDS).default("handle"),
  side: z.enum(ACCESSORY_SIDES).default("front"),
  x: z.number().min(0).max(1).default(0.5),
  z: z.number().min(0).max(1).default(0.85),
  length: z.number().min(0).max(1).default(0.4),
  height: z.number().min(0).max(1).default(0.12),
  profile: z.enum(HANDLE_PROFILES).default("bar"),
});

// Lid ("крышка") — a top-level construction option, kept separate from
// accessories and design elements. Optional with safe defaults so old payloads
// without `lid` keep parsing into a disabled lid. Dimensions are millimetres.
export const lidSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.enum(LID_TYPES).default("flat"),
  fit: z.enum(LID_FITS).default("overlay"),
  thicknessMm: z.number().min(0).max(50).default(3),
  overhangMm: z.number().min(0).max(50).default(2),
  clearanceMm: z.number().min(0).max(20).default(0.5),
});

export const appearanceSchema = z.object({
  baseColorHex: hexColor.default(DEFAULT_BASE_HEX),
  materialType: z.enum(MATERIAL_TYPES).default("unknown"),
  materialFinish: z.enum(MATERIAL_FINISHES).default("matte"),
  opacity: z
    .number({ invalid_type_error: "Непрозрачность — число" })
    .min(0.1, "Непрозрачность не меньше 0.1")
    .max(1, "Непрозрачность не больше 1")
    .default(1),
  pattern: appearancePatternSchema.default({}),
  textDecoration: appearanceTextDecorationSchema.default({}),
});

const dimensionField = (label: string) =>
  z
    .number({ invalid_type_error: `${label} — число` })
    .int(`${label} должно быть целым числом`)
    .min(DIMENSION_LIMITS.min, `${label} не меньше ${DIMENSION_LIMITS.min} мм`)
    .max(DIMENSION_LIMITS.max, `${label} не больше ${DIMENSION_LIMITS.max} мм`);

export const printRequestSchema = z
  .object({
    productType: z.enum(productTypeValues, {
      errorMap: () => ({ message: "Выберите тип изделия" }),
    }),
    purpose: nonEmpty("Назначение").max(500),
    usageEnvironment: z
      .array(z.enum(envValues))
      .min(1, "Выберите хотя бы одно условие использования"),

    widthMm: dimensionField("Ширина"),
    depthMm: dimensionField("Глубина"),
    heightMm: dimensionField("Высота"),
    wallThicknessMm: z
      .number({ invalid_type_error: "Толщина — число" })
      .min(WALL_THICKNESS_LIMITS.min, `Толщина не меньше ${WALL_THICKNESS_LIMITS.min} мм`)
      .max(WALL_THICKNESS_LIMITS.max, `Толщина не больше ${WALL_THICKNESS_LIMITS.max} мм`),

    shape: z.enum(shapeValues, {
      errorMap: () => ({ message: "Выберите форму" }),
    }),
    cornerRadiusMm: z
      .number({ invalid_type_error: "Скругление — число" })
      .min(CORNER_RADIUS_LIMITS.min)
      .max(CORNER_RADIUS_LIMITS.max)
      .default(0),

    material: nonEmpty("Материал"),
    color: nonEmpty("Цвет"),
    strength: z.enum(strengthValues).default("standard"),

    sectionsCount: z
      .number({ invalid_type_error: "Количество секций — число" })
      .int()
      .min(SECTIONS_LIMITS.min)
      .max(SECTIONS_LIMITS.max)
      .default(0),

    hasHoles: z.boolean().default(false),
    holesDescription: z.string().max(1000).optional().default(""),

    hasFasteners: z.boolean().default(false),
    fastenersDescription: z.string().max(1000).optional().default(""),

    hasDecoration: z.boolean().default(false),
    decorationDescription: z.string().max(1000).optional().default(""),

    referenceDescription: z.string().max(2000).optional().default(""),
    optionalReferenceLinks: z.string().max(2000).optional().default(""),

    clientComment: z.string().max(2000).optional().default(""),

    clientName: nonEmpty("Имя").max(200),
    clientEmail: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine(
        (v) => !v || z.string().email().safeParse(v).success,
        { message: "Введите корректный email" },
      ),
    clientPhone: z.string().trim().optional().default(""),
    preferredContactTime: z.enum(contactTimeValues).default("any"),
    consentPersonalData: z
      .boolean()
      .refine((v) => v === true, { message: "Нужно согласие на обработку данных" }),

    // Visual representation of the future item. Co-exists with the legacy
    // `material`/`color` catalogue choices above. Defaults to the white/PLA
    // baseline so payloads from older clients (and old DB rows) still parse.
    appearance: appearanceSchema.default({}),

    // Physical design layer: base shape kind, geometry, and design elements
    // (overlay / engrave / cutout). Mirrors a subset of the legacy `shape`
    // / `cornerRadiusMm` / `widthMm` / `depthMm` fields. Old payloads
    // without `design` parse into DEFAULT_DESIGN.
    design: designSchema.default(DEFAULT_DESIGN),

    // Constructive accessories (handles). Optional with a `[]` default so old
    // payloads without `accessories` keep parsing. UI-only state (selection,
    // preview) is never stored here — only the persisted feature data.
    accessories: z.array(accessorySchema).default([]),

    // Lid configuration. Optional with a safe disabled default so old payloads
    // without `lid` keep parsing. Preview-only lid geometry is never stored.
    lid: lidSchema.default({}),
  })
  .superRefine((data, ctx) => {
    // Cross-field: corner radius can't exceed half of the smaller side.
    if (data.shape === "rectangular") {
      const maxCorner = Math.floor(Math.min(data.widthMm, data.depthMm) / 2);
      if (data.cornerRadiusMm > maxCorner) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cornerRadiusMm"],
          message: `Скругление не больше ${maxCorner} мм для этих размеров`,
        });
      }
    }

    // Cross-field: at least one contact channel.
    if (!data.clientEmail && !data.clientPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clientEmail"],
        message: "Укажите email или телефон",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["clientPhone"],
        message: "Укажите email или телефон",
      });
    }

    // Cross-field: if any "has*" flag is on, the description shouldn't be empty.
    if (data.hasHoles && !data.holesDescription.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["holesDescription"],
        message: "Опишите отверстия/вырезы",
      });
    }
    if (data.hasFasteners && !data.fastenersDescription.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fastenersDescription"],
        message: "Опишите крепления",
      });
    }
    if (data.hasDecoration && !data.decorationDescription.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decorationDescription"],
        message: "Опишите декоративный элемент",
      });
    }

    // Appearance: text decoration requires non-empty text when enabled.
    if (data.appearance.textDecoration.enabled) {
      const t = data.appearance.textDecoration.text?.trim() ?? "";
      if (!t) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["appearance", "textDecoration", "text"],
          message: "Введите текст для декора",
        });
      }
    }

    // Appearance: pattern.type must not be "none" when pattern is enabled.
    if (
      data.appearance.pattern.enabled &&
      data.appearance.pattern.type === "none"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appearance", "pattern", "type"],
        message: "Выберите тип узора",
      });
    }
  });

export type PrintRequestInput = z.input<typeof printRequestSchema>;
export type PrintRequestData = z.output<typeof printRequestSchema>;

// Per-step partial validation: which fields belong to which step.
// Used to gate the "Next" button without revalidating the entire form.
export const STEP_FIELDS = {
  productType: ["productType"],
  purpose: ["purpose", "usageEnvironment"],
  dimensions: ["widthMm", "depthMm", "heightMm", "wallThicknessMm", "shape", "cornerRadiusMm"],
  material: ["material", "color", "strength"],
  features: [
    "sectionsCount",
    "hasHoles",
    "holesDescription",
    "hasFasteners",
    "fastenersDescription",
    "hasDecoration",
    "decorationDescription",
    "accessories",
    "lid",
  ],
  comment: ["clientComment", "referenceDescription", "optionalReferenceLinks"],
  review: [
    "clientName",
    "clientEmail",
    "clientPhone",
    "preferredContactTime",
    "consentPersonalData",
  ],
} as const;

// Status-change request body (admin).
export const statusChangeSchema = z.object({
  toStatus: z.enum(REQUEST_STATUS_VALUES as [string, ...string[]]),
  reason: z.string().max(500).optional(),
});

// Operator note body.
export const operatorNoteSchema = z.object({
  body: z.string().trim().min(1, "Заметка не может быть пустой").max(2000),
});

// Operator quote / estimate upsert body (admin). Optional money/time fields are
// nullable so an operator can clear them; `validUntil` accepts any parseable
// date string (the API converts to a Date). Currency/status fall back to safe
// defaults. Empty comment strings are coerced to null by the route.
export const quoteUpsertSchema = z.object({
  priceCents: z
    .number({ invalid_type_error: "Цена — число" })
    .int("Цена в копейках — целое число")
    .min(0, "Цена не может быть отрицательной")
    .max(100_000_000, "Слишком большая цена")
    .nullable()
    .optional(),
  currency: z.enum(QUOTE_CURRENCIES).default("BYN"),
  productionDays: z
    .number({ invalid_type_error: "Срок — число" })
    .int("Срок изготовления — целое число дней")
    .min(0, "Срок не может быть отрицательным")
    .max(3650, "Слишком большой срок")
    .nullable()
    .optional(),
  validUntil: z
    .string()
    .nullable()
    .optional()
    .refine((v) => v == null || !Number.isNaN(Date.parse(v)), {
      message: "Некорректная дата",
    }),
  operatorComment: z.string().max(2000).nullable().optional(),
  internalCostNote: z.string().max(2000).nullable().optional(),
  status: z.enum(QUOTE_STATUS_VALUES as [string, ...string[]]).default("draft"),
});

export type QuoteUpsertInput = z.input<typeof quoteUpsertSchema>;
