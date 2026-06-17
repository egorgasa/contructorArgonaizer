"use client";

import { useFormContext } from "react-hook-form";
import { COLORS, MATERIALS, STRENGTH_OPTIONS } from "@/lib/constants";
import { Select } from "@/components/ui/Select";
import type { PrintRequestInput } from "@/lib/validations/print-request";
import {
  colorValueToHex,
  DEFAULT_BASE_HEX,
  HEX_COLOR_RE,
  materialValueToType,
  MATERIAL_FINISH_OPTIONS,
} from "@/lib/appearance";

// Subtle rainbow gradient used as the placeholder fill for the "Свой цвет"
// swatch when it's not selected — visually distinguishes it from solid colours.
const CUSTOM_GRADIENT =
  "linear-gradient(135deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #6366f1, #ec4899)";

export function ConstructorStepMaterial() {
  const {
    setValue,
    register,
    watch,
    formState: { errors },
  } = useFormContext<PrintRequestInput>();

  const selectedMaterial = watch("material");
  const selectedColor = watch("color");
  const env = watch("usageEnvironment") ?? [];
  const baseColorHex = watch("appearance.baseColorHex") ?? DEFAULT_BASE_HEX;
  const materialFinish = watch("appearance.materialFinish") ?? "matte";
  const opacity = watch("appearance.opacity") ?? 1;

  const showPlaWarning =
    selectedMaterial === "PLA" &&
    (env.includes("outdoor") || env.includes("high_temperature"));

  const isCustomColor = selectedColor === "custom";
  // Native <input type="color"> needs a strict #RRGGBB literal; fall back to
  // a sensible default if the form has anything weird in baseColorHex.
  const customPickerValue = HEX_COLOR_RE.test(baseColorHex)
    ? baseColorHex
    : DEFAULT_BASE_HEX;

  const handleMaterialPick = (value: string) => {
    setValue("material", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("appearance.materialType", materialValueToType(value), {
      shouldDirty: true,
    });
  };

  const handleColorPick = (value: string) => {
    setValue("color", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
    // For catalogue colours the hex comes from constants; for "custom" we
    // preserve whatever the user already chose with the picker (or the
    // current baseColorHex if none chosen yet).
    if (value !== "custom") {
      setValue("appearance.baseColorHex", colorValueToHex(value), {
        shouldDirty: true,
      });
    }
  };

  const handleCustomHexChange = (hex: string) => {
    setValue("appearance.baseColorHex", hex, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleFinishPick = (value: (typeof MATERIAL_FINISH_OPTIONS)[number]["value"]) => {
    setValue("appearance.materialFinish", value, {
      shouldDirty: true,
    });
    // Leaving semi_transparent: clamp opacity back to 1 so previews don't
    // render a fully-opaque flag with ghost-mode values lingering in state.
    if (value !== "semi_transparent" && opacity !== 1) {
      setValue("appearance.opacity", 1, { shouldDirty: true });
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Материал и цвет</h2>
      <p className="mb-6 text-sm text-gray-600">
        Если не уверены — выберите «Посоветуйте», мы подберём под ваши условия.
      </p>

      {/* ───────────────── Material ───────────────── */}
      <div className="mb-2 text-sm font-medium text-gray-800">
        Материал <span className="text-red-500">*</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MATERIALS.map((m) => {
          const active = selectedMaterial === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => handleMaterialPick(m.value)}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="font-semibold text-gray-900">{m.label}</div>
              <div className="mt-1 text-xs text-gray-600">{m.hint}</div>
            </button>
          );
        })}
      </div>
      {errors.material && (
        <div className="mt-1 text-sm text-red-600">{errors.material.message as string}</div>
      )}
      {showPlaWarning && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ PLA плохо подходит для улицы и жары. Рекомендуем PETG.
        </div>
      )}

      {/* ───────────────── Color ───────────────── */}
      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-gray-800">
          Цвет <span className="text-red-500">*</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {COLORS.map((c) => {
            const active = selectedColor === c.value;
            const isCustom = c.value === "custom";
            // For the custom swatch: show the user's picked hex once chosen,
            // otherwise display the rainbow placeholder.
            const swatchBg = isCustom
              ? active
                ? customPickerValue
                : CUSTOM_GRADIENT
              : c.hex;

            return (
              <button
                key={c.value}
                type="button"
                onClick={() => handleColorPick(c.value)}
                className={`flex flex-col items-center rounded-lg border p-2 transition ${
                  active
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                aria-pressed={active}
              >
                <span
                  className="mb-1 inline-block h-8 w-8 rounded-full border border-gray-300"
                  style={{ background: swatchBg }}
                />
                <span className="text-[11px] leading-tight text-gray-700">{c.label}</span>
              </button>
            );
          })}
        </div>
        {errors.color && (
          <div className="mt-1 text-sm text-red-600">{errors.color.message as string}</div>
        )}

        {isCustomColor && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <label
              htmlFor="custom-color-picker"
              className="text-sm font-medium text-gray-800"
            >
              Свой оттенок:
            </label>
            <input
              id="custom-color-picker"
              type="color"
              value={customPickerValue}
              onChange={(e) => handleCustomHexChange(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
              aria-label="Выбрать произвольный цвет"
            />
            <span className="font-mono text-xs uppercase text-gray-600">
              {customPickerValue}
            </span>
          </div>
        )}
      </div>

      {/* ───────────────── Finish ───────────────── */}
      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-gray-800">Поверхность</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MATERIAL_FINISH_OPTIONS.map((f) => {
            const active = materialFinish === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => handleFinishPick(f.value)}
                className={`rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                aria-pressed={active}
              >
                <div className="text-sm font-semibold text-gray-900">{f.label}</div>
                <div className="mt-1 text-[11px] leading-tight text-gray-600">
                  {f.hint}
                </div>
              </button>
            );
          })}
        </div>

        {materialFinish === "semi_transparent" && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="mb-1 flex items-center justify-between text-sm">
              <label
                htmlFor="appearance-opacity"
                className="font-medium text-gray-800"
              >
                Непрозрачность
              </label>
              <span className="font-mono text-xs text-gray-600">
                {opacity.toFixed(2)}
              </span>
            </div>
            <input
              id="appearance-opacity"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) =>
                setValue("appearance.opacity", Number(e.target.value), {
                  shouldDirty: true,
                })
              }
              className="w-full accent-brand-600"
              aria-label="Непрозрачность (от 0.1 до 1)"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-500">
              <span>прозрачно</span>
              <span>плотно</span>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────── Strength ───────────────── */}
      <div className="mt-6">
        <label className="mb-1 block text-sm font-medium text-gray-800">
          Желаемая прочность
        </label>
        <Select {...register("strength")}>
          {STRENGTH_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
