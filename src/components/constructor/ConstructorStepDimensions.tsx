"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  DIMENSION_LIMITS,
  WALL_THICKNESS_LIMITS,
  WALL_THICKNESS_PRESETS,
} from "@/lib/constants";
import type { PrintRequestInput } from "@/lib/validations/print-request";
import {
  BASE_SHAPE_KINDS,
  baseKindToLegacyShape,
  cornerRadiusMaxFor,
  DEFAULT_DESIGN_BASE_SHAPE,
  shapeUsesCornerRadius,
  type BaseShapeKind,
  type DesignBaseShape,
} from "@/lib/design";
import { ShapeSelector } from "./ShapeSelector";
import { CornerRadiusControl } from "./CornerRadiusControl";

// Reads the current base-shape from `design.baseShape` and falls back to the
// module-level default. We never write a partial object to the form — every
// update goes through a fully-shaped `DesignBaseShape` so the zod schema's
// `.default({})` machinery doesn't kick in mid-edit.
function isBaseShapeKind(value: unknown): value is BaseShapeKind {
  return (
    typeof value === "string" &&
    (BASE_SHAPE_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Per-shape hint about how the legacy width/depth fields map onto the design
 * preview. `null` when the mapping is the obvious 1:1 (rectangle, rounded
 * rectangle). Kept inside the component module — these strings are only
 * meaningful in the context of this step.
 */
function shapeDimensionHint(kind: BaseShapeKind): string | null {
  switch (kind) {
    case "circle":
      return "Для круга используется меньшая из сторон (Ширина или Глубина) как диаметр.";
    case "pill":
      return "Пилюля: торцы автоматически скругляются на половину меньшей стороны.";
    case "oval":
      return "Овал занимает всё прямоугольное поле Ширина × Глубина.";
    case "custom":
      return "Кастомная форма: оператор уточнит точный контур по референсу.";
    default:
      return null;
  }
}

export function ConstructorStepDimensions() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<PrintRequestInput>();

  const wallThickness = Number(watch("wallThicknessMm")) || 0;
  const wallTooThin =
    wallThickness > 0 && wallThickness < WALL_THICKNESS_LIMITS.warnBelow;

  // Width/depth are still owned by the legacy fields (the 2D/3D previews and
  // the server payload read them). We mirror onto `design.baseShape` on every
  // edit so the new Design preview stays in sync without duplicating UI.
  const widthMm = Number(watch("widthMm")) || 0;
  const depthMm = Number(watch("depthMm")) || 0;

  // Compose the base shape used by ShapeSelector / CornerRadiusControl. We
  // prefer the design.baseShape values where they exist, falling back to the
  // dimension fields so legacy / freshly-loaded data renders correctly.
  const designKindRaw = watch("design.baseShape.kind");
  const designCornerRaw = watch("design.baseShape.cornerRadiusMm");
  const baseShape: DesignBaseShape = {
    ...DEFAULT_DESIGN_BASE_SHAPE,
    kind: isBaseShapeKind(designKindRaw)
      ? designKindRaw
      : DEFAULT_DESIGN_BASE_SHAPE.kind,
    widthMm: widthMm || DEFAULT_DESIGN_BASE_SHAPE.widthMm,
    heightMm: depthMm || DEFAULT_DESIGN_BASE_SHAPE.heightMm,
    cornerRadiusMm:
      typeof designCornerRaw === "number"
        ? designCornerRaw
        : (Number(watch("cornerRadiusMm")) || 0),
  };

  // Width/depth register handles. We wrap their `onChange` so changes
  // propagate to the design layer in addition to the legacy numeric fields.
  const widthReg = register("widthMm", { valueAsNumber: true });
  const depthReg = register("depthMm", { valueAsNumber: true });

  const handleWidthChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    widthReg.onChange(e);
    const next = Number(e.target.value);
    if (Number.isFinite(next) && next > 0) {
      setValue("design.baseShape.widthMm", next, { shouldDirty: true });
      // Re-clamp corner radius — if the user shrunk the box past 2·r the
      // stored radius would overshoot the new bounds.
      const max = Math.floor(Math.min(next, depthMm || next) / 2);
      const cur = Number(baseShape.cornerRadiusMm) || 0;
      if (cur > max) {
        setValue("design.baseShape.cornerRadiusMm", max, { shouldDirty: true });
        setValue("cornerRadiusMm", max, { shouldDirty: true });
      }
    }
  };

  const handleDepthChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    depthReg.onChange(e);
    const next = Number(e.target.value);
    if (Number.isFinite(next) && next > 0) {
      setValue("design.baseShape.heightMm", next, { shouldDirty: true });
      const max = Math.floor(Math.min(next, widthMm || next) / 2);
      const cur = Number(baseShape.cornerRadiusMm) || 0;
      if (cur > max) {
        setValue("design.baseShape.cornerRadiusMm", max, { shouldDirty: true });
        setValue("cornerRadiusMm", max, { shouldDirty: true });
      }
    }
  };

  // Picker: mirror new kind onto both the design layer and the legacy
  // `shape` enum (rectangular/round/oval/custom). When the new kind doesn't
  // use a corner radius, zero out the radius so the existing previews don't
  // render a stale rounding.
  const handleKindChange = (kind: BaseShapeKind) => {
    setValue("design.baseShape.kind", kind, { shouldDirty: true });
    setValue("shape", baseKindToLegacyShape(kind), {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (!shapeUsesCornerRadius(kind)) {
      setValue("design.baseShape.cornerRadiusMm", 0, { shouldDirty: true });
      // shouldValidate clears any stale "radius too big" superRefine error
      // attached to cornerRadiusMm under the previous shape.
      setValue("cornerRadiusMm", 0, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  // Corner radius: bidirectional mirror. The CornerRadiusControl already
  // clamps; we just write to both stores.
  const handleCornerRadiusChange = (mm: number) => {
    const clamped = Math.max(0, Math.min(mm, cornerRadiusMaxFor(baseShape)));
    setValue("design.baseShape.cornerRadiusMm", clamped, { shouldDirty: true });
    setValue("cornerRadiusMm", clamped, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Размеры и форма</h2>
      <p className="mb-6 text-sm text-gray-600">
        Все размеры в миллиметрах. Если сомневаетесь — оставьте значения по умолчанию.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Ширина, мм" error={errors.widthMm?.message as string | undefined}>
          <Input
            type="number"
            inputMode="numeric"
            min={DIMENSION_LIMITS.min}
            max={DIMENSION_LIMITS.max}
            step={1}
            invalid={!!errors.widthMm}
            {...widthReg}
            onChange={handleWidthChange}
          />
        </Field>

        <Field label="Глубина, мм" error={errors.depthMm?.message as string | undefined}>
          <Input
            type="number"
            inputMode="numeric"
            min={DIMENSION_LIMITS.min}
            max={DIMENSION_LIMITS.max}
            step={1}
            invalid={!!errors.depthMm}
            {...depthReg}
            onChange={handleDepthChange}
          />
        </Field>

        <Field label="Высота, мм" error={errors.heightMm?.message as string | undefined}>
          <Input
            type="number"
            inputMode="numeric"
            min={DIMENSION_LIMITS.min}
            max={DIMENSION_LIMITS.max}
            step={1}
            invalid={!!errors.heightMm}
            {...register("heightMm", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field
          label="Толщина стенок, мм"
          error={errors.wallThicknessMm?.message as string | undefined}
          hint="Рекомендуем 2.0 мм для большинства задач"
        >
          <Select
            invalid={!!errors.wallThicknessMm}
            {...register("wallThicknessMm", { valueAsNumber: true })}
          >
            {WALL_THICKNESS_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p.toFixed(1)} мм
              </option>
            ))}
          </Select>
          {wallTooThin && (
            <div className="mt-1 text-xs text-amber-700">
              ⚠ Тонкая стенка — изделие может быть хрупким.
            </div>
          )}
        </Field>
      </div>

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-gray-800">
          Базовая форма
        </label>
        <ShapeSelector value={baseShape.kind} onChange={handleKindChange} />
        {/* Explain the W/D ↔ shape mapping for shapes where width and depth
            don't both contribute. Without this, a user who edits Глубина
            while a circle is selected sees no change in the Design preview
            and may think the input is broken. */}
        {shapeDimensionHint(baseShape.kind) && (
          <p className="mt-2 text-xs text-gray-500">
            {shapeDimensionHint(baseShape.kind)}
          </p>
        )}
        {errors.shape && (
          <div className="mt-1 text-sm text-red-600">
            {errors.shape.message as string}
          </div>
        )}
      </div>

      {/* Corner radius belongs only to the "Скруглённый" shape. A plain
          rectangle is straight-cornered, and circle/oval/pill derive their
          rounding from the dimensions — so the control is hidden for those and
          the per-shape hint above explains the behaviour instead. */}
      {baseShape.kind === "roundedRectangle" && (
        <div className="mt-4">
          <CornerRadiusControl
            shape={baseShape}
            onChange={handleCornerRadiusChange}
          />
          {errors.cornerRadiusMm && (
            <div className="mt-1 text-sm text-red-600">
              {errors.cornerRadiusMm.message as string}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-800">{label}</label>
      {children}
      {hint && !error && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
      {error && <div className="mt-1 text-sm text-red-600">{error}</div>}
    </div>
  );
}
