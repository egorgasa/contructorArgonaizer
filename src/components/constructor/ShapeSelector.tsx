"use client";

import { BASE_SHAPE_CARDS, type BaseShapeKind } from "@/lib/design";

interface Props {
  value: BaseShapeKind;
  onChange: (kind: BaseShapeKind) => void;
}

// Card-based picker for the base shape. Each card carries a tiny SVG icon
// that matches what `DesignPreview` will render, so the user gets immediate
// recognition before committing to a choice.
export function ShapeSelector({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Базовая форма"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {BASE_SHAPE_CARDS.map((card) => {
        const active = card.kind === value;
        const disabled = !!card.disabled;
        return (
          <button
            key={card.kind}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={disabled ? undefined : () => onChange(card.kind)}
            title={disabled ? "Пока недоступно в MVP" : undefined}
            className={`flex items-center gap-3 rounded-lg border p-2 text-left transition ${
              disabled
                ? "cursor-not-allowed border-dashed border-gray-200 bg-gray-50 opacity-60"
                : active
                  ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                  : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <ShapeIcon kind={card.kind} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-gray-900">
                  {card.label}
                </span>
                {disabled && (
                  <span className="shrink-0 rounded bg-gray-200 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                    Скоро
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] text-gray-600">
                {card.hint}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Tiny inline SVG illustrating the shape. Pure rendering, no state.
function ShapeIcon({ kind }: { kind: BaseShapeKind }) {
  const size = 40;
  const stroke = "currentColor";
  const strokeWidth = 1.5;
  const common = {
    className: "shrink-0 text-gray-700",
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    "aria-hidden": true,
  } as const;

  switch (kind) {
    case "rectangle":
      return (
        <svg {...common}>
          <rect
            x={6}
            y={10}
            width={28}
            height={20}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case "roundedRectangle":
      return (
        <svg {...common}>
          <rect
            x={6}
            y={10}
            width={28}
            height={20}
            rx={5}
            ry={5}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case "circle":
      return (
        <svg {...common}>
          <circle
            cx={20}
            cy={20}
            r={13}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case "oval":
      return (
        <svg {...common}>
          <ellipse
            cx={20}
            cy={20}
            rx={15}
            ry={10}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case "pill":
      return (
        <svg {...common}>
          <rect
            x={4}
            y={13}
            width={32}
            height={14}
            rx={7}
            ry={7}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case "custom":
      return (
        <svg {...common}>
          <rect
            x={6}
            y={10}
            width={28}
            height={20}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray="3,3"
          />
          <text
            x={20}
            y={24}
            textAnchor="middle"
            className="fill-gray-500"
            fontSize="12"
            fontWeight={600}
          >
            ?
          </text>
        </svg>
      );
  }
}
