"use client";

import { useId, useRef } from "react";
import { Button } from "@/components/ui/Button";
import {
  createDesignElement,
  DECOR_SHAPE_CARDS,
  DESIGN_ELEMENT_MODES,
  DESIGN_MODE_HINTS,
  DESIGN_MODE_LABELS,
  DESIGN_SOURCE_LABELS,
  elementSource,
  type DecorShapeKind,
  type DesignElement,
  type DesignElementMode,
  type DesignElementSource,
  type DesignElementType,
} from "@/lib/design";

interface Props {
  elements: DesignElement[];
  onChange: (next: DesignElement[]) => void;
  /** Currently-selected element id (UI-only — not persisted). */
  selectedElementId?: string | null;
  /** Notifies the owner that selection changed (null = nothing selected). */
  onSelectElement?: (id: string | null) => void;
}

// Structural minimum editor for design elements. No drag-handles, no canvas
// editing — just an explicit list with mode toggle, X/Y/W/H, rotation, quick
// positioning controls and the type-specific payload (image upload or
// decor-shape picker or text).
export function DesignElementsEditor({
  elements,
  onChange,
  selectedElementId,
  onSelectElement,
}: Props) {
  const addElement = (type: DesignElementType) => {
    const next = createDesignElement(type, "overlay");
    onChange([...elements, next]);
    // New element becomes the active selection so quick-controls apply to it.
    onSelectElement?.(next.id);
  };

  const updateElement = (id: string, patch: Partial<DesignElement>) => {
    onChange(
      elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    );
  };

  const removeElement = (id: string) => {
    const idx = elements.findIndex((el) => el.id === id);
    const next = elements.filter((el) => el.id !== id);
    onChange(next);
    // If we removed the selected element, fall back to a neighbour (next, else
    // previous) or clear selection when the list is now empty.
    if (selectedElementId === id) {
      const neighbour = next[idx] ?? next[idx - 1] ?? null;
      onSelectElement?.(neighbour ? neighbour.id : null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-800">Добавить:</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => addElement("image")}
        >
          + Рисунок
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => addElement("decor")}
        >
          + Декор
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => addElement("text")}
        >
          + Текст
        </Button>
      </div>

      {elements.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-500">
          Добавьте текст, рисунок, отверстие или декор — элементы появятся
          здесь, и их можно будет перетаскивать на схеме. Режим:{" "}
          <strong>накладка</strong>, <strong>гравировка</strong> или{" "}
          <strong>вырез</strong>.
        </p>
      ) : (
        <ul className="space-y-3">
          {elements.map((el, i) => {
            const selected = el.id === selectedElementId;
            return (
              <li
                key={el.id}
                onClick={() => onSelectElement?.(el.id)}
                className={`cursor-pointer rounded-lg border bg-white p-3 transition ${
                  selected
                    ? "border-brand-500 ring-2 ring-brand-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <ElementRow
                  index={i + 1}
                  element={el}
                  selected={selected}
                  onUpdate={(patch) => updateElement(el.id, patch)}
                  onRemove={() => removeElement(el.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---- Row ------------------------------------------------------------------

function ElementRow({
  index,
  element,
  selected,
  onUpdate,
  onRemove,
}: {
  index: number;
  element: DesignElement;
  selected: boolean;
  onUpdate: (patch: Partial<DesignElement>) => void;
  onRemove: () => void;
}) {
  // Managed elements carry a non-user `source`. Holes / fasteners are *locked*
  // (type + mode fixed to a circular cutout — only move / resize). The bridged
  // `textDecoration` label is content-managed: its text / colour come from the
  // "Текст на изделии" block, so we hide the in-place editors but keep it freely
  // movable / resizable / rotatable. Decor (and other bridged sources) just get
  // a badge and stay fully editable so the user can restyle them in place.
  const source = elementSource(element);
  const isSystem = source === "holes" || source === "fasteners";
  const isManagedText = source === "textDecoration";
  // Hide the mode toggle + type-specific rows for elements whose type / mode /
  // content is controlled elsewhere (system cutouts, bridged text label).
  const hideTypeEditors = isSystem || isManagedText;
  const hasSourceBadge = source !== "user" && source !== "legacy";
  const isImageCutout =
    element.type === "image" && element.mode === "cutout";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900">{index}.</span>
            {hasSourceBadge ? (
              <SourceBadge source={source} />
            ) : (
              <TypeBadge type={element.type} />
            )}
            <ModeBadge mode={element.mode} />
            {selected && (
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
                Выбран
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-gray-500">
            X {percent(element.x)}% · Y {percent(element.y)}% ·{" "}
            {percent(element.width)}×{percent(element.height)}%
            {element.rotation ? ` · ${Math.round(element.rotation)}°` : ""}
          </div>
        </div>
        <button
          type="button"
          aria-label="Удалить элемент"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-md px-2 py-1 text-sm text-red-600 transition hover:bg-red-50"
        >
          ×
        </button>
      </div>

      {isSystem ? (
        <p className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600">
          Системный элемент ({DESIGN_SOURCE_LABELS[source].toLowerCase()}) —
          сквозной круглый вырез. Его можно перемещать и менять размер; тип и
          режим зафиксированы. Привязан к переключателю выше — удалите элемент,
          чтобы снять отметку.
        </p>
      ) : isManagedText ? (
        <p className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600">
          Надпись с изделия. Сам текст и цвет редактируются в блоке «Текст на
          изделии» выше; здесь её можно перемещать, менять размер и поворачивать.
          Удалите элемент или очистите текст, чтобы убрать надпись.
        </p>
      ) : (
        <div className="space-y-1">
          <ModeToggle
            mode={element.mode}
            onChange={(mode) => onUpdate({ mode })}
          />
          <p className="text-[11px] text-gray-500">
            {MODE_DESCRIPTIONS[element.mode]}
          </p>
        </div>
      )}

      {selected && <QuickControls element={element} onUpdate={onUpdate} />}

      {!hideTypeEditors && isImageCutout && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
          В этом MVP вырез по картинке использует прямоугольную область
          изображения. Для точных вырезов используйте декор, текст или фигуру.
        </p>
      )}

      {!hideTypeEditors && element.type === "image" ? (
        <ImageRow element={element} onUpdate={onUpdate} />
      ) : null}

      {!hideTypeEditors && (element.type === "decor" || element.type === "shape") ? (
        <DecorRow element={element} onUpdate={onUpdate} />
      ) : null}

      {!hideTypeEditors && element.type === "text" ? (
        <TextRow element={element} onUpdate={onUpdate} />
      ) : null}

      <Transform element={element} onUpdate={onUpdate} />
    </div>
  );
}

// ---- Badges ---------------------------------------------------------------

function TypeBadge({ type }: { type: DesignElementType }) {
  return (
    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-700">
      {ELEMENT_TYPE_LABELS[type]}
    </span>
  );
}

// Amber badge for system elements (mounting holes / fasteners) so they read as
// managed, not free-form decor.
function SourceBadge({ source }: { source: DesignElementSource }) {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
      {DESIGN_SOURCE_LABELS[source]}
    </span>
  );
}

const MODE_BADGE_CLASS: Record<DesignElementMode, string> = {
  overlay: "bg-sky-100 text-sky-800",
  engrave: "bg-violet-100 text-violet-800",
  cutout: "bg-rose-100 text-rose-800",
};

// Plain-language explanation of what each mode physically does to the item.
// Shown under the mode toggle so the user understands the consequence of the
// choice without having to read the preview legend.
const MODE_DESCRIPTIONS: Record<DesignElementMode, string> = {
  overlay: "Размещается поверх поверхности.",
  engrave: "Наносится/гравируется на поверхность.",
  cutout: "Вырезается из формы насквозь (отверстие).",
};

function ModeBadge({ mode }: { mode: DesignElementMode }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${MODE_BADGE_CLASS[mode]}`}
    >
      {DESIGN_MODE_LABELS[mode]}
    </span>
  );
}

// ---- Mode toggle ----------------------------------------------------------

function ModeToggle({
  mode,
  onChange,
}: {
  mode: DesignElementMode;
  onChange: (mode: DesignElementMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Режим элемента"
      className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs"
    >
      {DESIGN_ELEMENT_MODES.map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m)}
            className={`rounded-md px-3 py-1 font-medium transition ${
              active
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                : "text-gray-600 hover:bg-white/60"
            }`}
            title={DESIGN_MODE_HINTS[m]}
          >
            {DESIGN_MODE_LABELS[m]}
          </button>
        );
      })}
    </div>
  );
}

// ---- Type-specific rows --------------------------------------------------

function ImageRow({
  element,
  onUpdate,
}: {
  element: DesignElement;
  onUpdate: (patch: Partial<DesignElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reactId = useId();
  const inputId = `image-${reactId}`;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        onUpdate({ imageDataUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onUpdate({ imageDataUrl: "" });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {element.imageDataUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={element.imageDataUrl}
            alt="Превью загруженного изображения"
            className="h-12 w-12 rounded border border-gray-200 object-contain"
          />
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Удалить изображение
          </Button>
        </div>
      ) : (
        <div>
          <label
            htmlFor={inputId}
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Изображение
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="block w-full text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:text-white file:hover:bg-brand-700"
          />
        </div>
      )}
    </div>
  );
}

function DecorRow({
  element,
  onUpdate,
}: {
  element: DesignElement;
  onUpdate: (patch: Partial<DesignElement>) => void;
}) {
  const current: DecorShapeKind = element.decorShape ?? "circle";
  const colorId = useId();
  return (
    <div className="space-y-2">
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          Фигура
        </div>
        <div
          role="radiogroup"
          aria-label="Декоративная фигура"
          className="flex flex-wrap gap-2"
        >
          {DECOR_SHAPE_CARDS.map((d) => {
            const active = current === d.kind;
            return (
              <button
                key={d.kind}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onUpdate({ decorShape: d.kind })}
                className={`rounded-md border px-2 py-1 text-xs transition ${
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Colour only matters for overlay; mask doesn't read it but we keep the
          control so the user gets the same UX across modes. */}
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={`color-${colorId}`}
          className="text-xs font-medium uppercase tracking-wide text-gray-500"
        >
          Цвет
        </label>
        <input
          id={`color-${colorId}`}
          type="color"
          value={normalizeHex(element.fillColor)}
          onChange={(e) => onUpdate({ fillColor: e.target.value })}
          className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
          aria-label="Цвет декора"
        />
        <span className="font-mono text-xs uppercase text-gray-600">
          {normalizeHex(element.fillColor)}
        </span>
      </div>
    </div>
  );
}

function TextRow({
  element,
  onUpdate,
}: {
  element: DesignElement;
  onUpdate: (patch: Partial<DesignElement>) => void;
}) {
  const reactId = useId();
  const textId = `text-${reactId}`;
  const colorId = `text-color-${reactId}`;
  return (
    <div className="space-y-2">
      <div>
        <label
          htmlFor={textId}
          className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500"
        >
          Текст
        </label>
        <input
          id={textId}
          type="text"
          maxLength={80}
          value={element.text ?? ""}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={colorId}
          className="text-xs font-medium uppercase tracking-wide text-gray-500"
        >
          Цвет
        </label>
        <input
          id={colorId}
          type="color"
          value={normalizeHex(element.fillColor)}
          onChange={(e) => onUpdate({ fillColor: e.target.value })}
          className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
          aria-label="Цвет текста"
        />
        <span className="font-mono text-xs uppercase text-gray-600">
          {normalizeHex(element.fillColor)}
        </span>
      </div>
    </div>
  );
}

// ---- Quick positioning controls ------------------------------------------

// Lightweight nudge / centre / size helpers for the selected element. No
// drag-and-drop — just discrete buttons. All edits keep the element fully
// inside the base-shape box (coordinates are centre-based, so the centre is
// clamped to [size/2, 1 - size/2]).
function QuickControls({
  element,
  onUpdate,
}: {
  element: DesignElement;
  onUpdate: (patch: Partial<DesignElement>) => void;
}) {
  const move = (dx: number, dy: number) =>
    onUpdate({
      x: clampCenter(element.x + dx, element.width),
      y: clampCenter(element.y + dy, element.height),
    });

  const resize = (w: number, h: number) =>
    onUpdate({
      width: w,
      height: h,
      x: clampCenter(element.x, w),
      y: clampCenter(element.y, h),
    });

  return (
    <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Позиция
        </span>
        <QuickBtn label="← Влево" onClick={() => move(-NUDGE_STEP, 0)} />
        <QuickBtn label="Вправо →" onClick={() => move(NUDGE_STEP, 0)} />
        <QuickBtn label="↑ Вверх" onClick={() => move(0, -NUDGE_STEP)} />
        <QuickBtn label="Вниз ↓" onClick={() => move(0, NUDGE_STEP)} />
        <QuickBtn label="Центр X" onClick={() => onUpdate({ x: 0.5 })} />
        <QuickBtn label="Центр Y" onClick={() => onUpdate({ y: 0.5 })} />
        <QuickBtn label="Сброс ∠" onClick={() => onUpdate({ rotation: 0 })} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Размер
        </span>
        <QuickBtn label="S" onClick={() => resize(0.15, 0.15)} />
        <QuickBtn label="M" onClick={() => resize(0.25, 0.25)} />
        <QuickBtn label="L" onClick={() => resize(0.4, 0.4)} />
        <QuickBtn
          label="На всю ширину"
          onClick={() => onUpdate({ width: 0.9, x: 0.5 })}
        />
      </div>
    </div>
  );
}

function QuickBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition hover:bg-gray-100"
    >
      {label}
    </button>
  );
}

// ---- Transform inputs -----------------------------------------------------

function Transform({
  element,
  onUpdate,
}: {
  element: DesignElement;
  onUpdate: (patch: Partial<DesignElement>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <NumInput
        label="Позиция X"
        value={percent(element.x)}
        suffix="%"
        min={0}
        max={100}
        onChange={(v) => onUpdate({ x: clamp01(fromPercent(v)) })}
      />
      <NumInput
        label="Позиция Y"
        value={percent(element.y)}
        suffix="%"
        min={0}
        max={100}
        onChange={(v) => onUpdate({ y: clamp01(fromPercent(v)) })}
      />
      <NumInput
        label="Ширина"
        value={percent(element.width)}
        suffix="%"
        min={1}
        max={100}
        onChange={(v) => onUpdate({ width: clamp01(fromPercent(v)) })}
      />
      <NumInput
        label="Высота"
        value={percent(element.height)}
        suffix="%"
        min={1}
        max={100}
        onChange={(v) => onUpdate({ height: clamp01(fromPercent(v)) })}
      />
      <NumInput
        label="Поворот"
        value={element.rotation ?? 0}
        suffix="°"
        min={-180}
        max={180}
        onChange={(v) => onUpdate({ rotation: clampDeg(v) })}
      />
    </div>
  );
}

function NumInput({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const reactId = useId();
  const id = `n-${reactId}`;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {label} {suffix}
      </span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={Math.round(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(min);
            return;
          }
          const n = Number(raw);
          onChange(Number.isNaN(n) ? min : n);
        }}
        className="w-full rounded-md border border-gray-300 px-2 py-1 text-right text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

// ---- helpers --------------------------------------------------------------

const ELEMENT_TYPE_LABELS: Record<DesignElementType, string> = {
  image: "Рисунок",
  decor: "Декор",
  shape: "Фигура",
  text: "Текст",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeHex(v: string | undefined): string {
  if (v && HEX_RE.test(v)) return v;
  return "#111827";
}

function percent(v: number): number {
  return Math.round(v * 100);
}

function fromPercent(v: number): number {
  return v / 100;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function clampDeg(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-180, Math.min(180, v));
}

/** Nudge step for the quick-position buttons — 2% of the base-shape box. */
const NUDGE_STEP = 0.02;

/**
 * Clamp a centre coordinate so an element of the given normalized `size` stays
 * fully inside the [0..1] base-shape box. When the element is as wide/tall as
 * the box (or larger) there's no valid range, so we just centre it.
 */
function clampCenter(center: number, size: number): number {
  if (!Number.isFinite(center)) return 0.5;
  const half = size / 2;
  const lo = half;
  const hi = 1 - half;
  if (hi <= lo) return 0.5;
  return Math.max(lo, Math.min(hi, center));
}
