"use client";

import {
  BASE_SHAPE_LABELS,
  DESIGN_MODE_LABELS,
  effectiveCornerRadius,
  formatDesignElementSummary,
  groupDesignElementsByMode,
  shapeUsesCornerRadius,
  type DesignElement,
  type DesignElementMode,
} from "@/lib/design";
import type { ConstructorVisualScene } from "@/lib/constructor-visual-scene";

interface DesignManufacturingSummaryProps {
  /** The unified visual scene — the same source of truth the Design / 2D / 3D
   *  previews read from, so this summary can't drift from what the user sees. */
  scene: ConstructorVisualScene;
  /** Legacy dimension fields — `heightMm` is the 3rd (vertical) axis, which the
   *  design base shape doesn't carry. Shown for a complete manufacturing view. */
  legacy?: {
    heightMm?: number;
  };
}

/**
 * Presentation-only manufacturing summary of the design layer. Reads nothing
 * from form state, mutates nothing — it just renders the derived
 * `ConstructorVisualScene`. Shown on the final Review step so the user sees
 * exactly what goes to the operator: base shape, dimensions, corner radius,
 * grouped elements and the scene's MVP limitation notes.
 */
export function DesignManufacturingSummary({
  scene,
  legacy,
}: DesignManufacturingSummaryProps) {
  const { baseShape, elements, warnings } = scene;
  const grouped = groupDesignElementsByMode(elements);

  const radius = effectiveCornerRadius(baseShape);
  // Show the radius row for the rectangular family (rectangle / roundedRectangle
  // / pill): rectangle reports "нет", roundedRectangle its clamped value, pill
  // its computed value. Circle / oval / custom have no meaningful corner radius.
  const showRadius =
    shapeUsesCornerRadius(baseShape.kind) ||
    baseShape.kind === "rectangle" ||
    baseShape.kind === "pill";

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-base font-semibold text-gray-900">
        Дизайн и производство
      </h3>
      <p className="mb-3 mt-0.5 text-xs text-gray-600">
        Что уйдёт оператору для подготовки модели.
      </p>

      {/* Base material shape. */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Форма изделия
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <Row label="Базовая форма" value={BASE_SHAPE_LABELS[baseShape.kind]} />
          <Row
            label="Размеры (Ш × Г)"
            value={`${Math.round(baseShape.widthMm)} × ${Math.round(baseShape.heightMm)} мм`}
          />
          {typeof legacy?.heightMm === "number" && (
            <Row label="Высота" value={`${Math.round(legacy.heightMm)} мм`} />
          )}
          {showRadius && (
            <Row
              label="Скругление углов"
              value={radius > 0 ? `${Math.round(radius)} мм` : "нет"}
            />
          )}
          {baseShape.fillColor && (
            <ColorRow label="Заливка" hex={baseShape.fillColor} />
          )}
          {baseShape.strokeColor && (
            <ColorRow label="Контур" hex={baseShape.strokeColor} />
          )}
        </dl>
      </div>

      {/* Elements grouped by manufacturing mode. */}
      <div className="mt-3 space-y-2">
        <ModeGroup
          mode="overlay"
          heading="Нанесение"
          elements={grouped.overlay}
        />
        <ModeGroup
          mode="engrave"
          heading="Гравировка"
          elements={grouped.engrave}
        />
        <ModeGroup
          mode="cutout"
          heading="Вырезы / отверстия"
          elements={grouped.cutout}
        />
      </div>

      {/* MVP limitations / operator notes. */}
      {warnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-800">
            Ограничения MVP / заметка оператору
          </div>
          <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-amber-800">
            {warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const MODE_DOT: Record<DesignElementMode, string> = {
  overlay: "bg-sky-500",
  engrave: "bg-violet-500",
  cutout: "bg-rose-500",
};

function ModeGroup({
  mode,
  heading,
  elements,
}: {
  mode: DesignElementMode;
  heading: string;
  elements: DesignElement[];
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <span className={`inline-block h-2 w-2 rounded-full ${MODE_DOT[mode]}`} aria-hidden />
          {heading}
          <span className="text-xs font-normal text-gray-500">
            ({DESIGN_MODE_LABELS[mode]})
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {elements.length}
        </span>
      </div>
      {elements.length > 0 && (
        <ul className="mt-2 space-y-1 text-[12px] text-gray-600">
          {elements.map((el, i) => (
            <li key={el.id} className="flex gap-2">
              <span className="text-gray-400">{i + 1}.</span>
              <span className="min-w-0">{formatDesignElementSummary(el)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function ColorRow({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="flex items-center gap-2 text-right font-medium text-gray-900">
        <span
          className="inline-block h-4 w-4 rounded border border-gray-300"
          style={{ background: hex }}
          aria-hidden
        />
        <span className="font-mono text-xs uppercase">{hex}</span>
      </dd>
    </div>
  );
}
