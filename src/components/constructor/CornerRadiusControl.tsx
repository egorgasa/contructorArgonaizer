"use client";

import {
  cornerRadiusMaxFor,
  effectiveCornerRadius,
  shapeUsesCornerRadius,
  type DesignBaseShape,
} from "@/lib/design";

interface Props {
  shape: DesignBaseShape;
  onChange: (cornerRadiusMm: number) => void;
}

// Slider + numeric input for corner radius. Mirrors `shapeUsesCornerRadius` /
// `effectiveCornerRadius` from the design domain — single source of truth, so
// the UI never disagrees with what the preview actually renders.
//
// For shapes where the radius is not user-editable (circle, oval, pill, custom)
// we still render the row, but disabled, with an explanation of what's going
// on. That way switching shapes doesn't jump the layout and the relationship
// "this control belongs to the rounded variants" stays visible.
export function CornerRadiusControl({ shape, onChange }: Props) {
  const editable = shapeUsesCornerRadius(shape.kind);
  const max = cornerRadiusMaxFor(shape);
  const current = shape.cornerRadiusMm ?? 0;
  const effective = effectiveCornerRadius(shape);

  const hint = editable
    ? `0…${max} мм — не больше половины меньшей стороны`
    : shape.kind === "pill"
      ? "Pill: радиус всегда равен половине высоты"
      : shape.kind === "circle"
        ? "Круг: радиус определяется размером формы"
        : shape.kind === "oval"
          ? "Овал: скругление не применимо"
          : "Кастомная форма: скругление настраивается оператором";

  const commit = (raw: number) => {
    if (!editable) return;
    if (!Number.isFinite(raw) || raw < 0) {
      onChange(0);
      return;
    }
    // Clamp eagerly on commit so the saved value never overshoots the shape.
    onChange(Math.min(Math.max(raw, 0), max));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <label
          htmlFor="design-corner-radius"
          className={`font-medium ${editable ? "text-gray-800" : "text-gray-500"}`}
        >
          Скругление углов, мм
        </label>
        <span className="font-mono text-xs text-gray-600">
          {editable ? Math.round(current) : Math.round(effective)}
        </span>
      </div>

      <input
        id="design-corner-radius"
        type="range"
        min={0}
        max={Math.max(max, 1)}
        step={1}
        value={editable ? Math.min(current, max) : effective}
        disabled={!editable}
        onChange={(e) => commit(Number(e.target.value))}
        className="w-full accent-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Скругление углов в миллиметрах"
      />

      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-[11px] text-gray-500">{hint}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={Math.max(max, 1)}
          step={1}
          value={editable ? Math.min(current, max) : 0}
          disabled={!editable}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              commit(0);
              return;
            }
            const n = Number(raw);
            commit(Number.isNaN(n) ? 0 : n);
          }}
          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          aria-label="Скругление углов, мм (число)"
        />
      </div>
    </div>
  );
}
