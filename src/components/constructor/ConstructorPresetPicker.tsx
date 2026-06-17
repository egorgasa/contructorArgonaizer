"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { PrintRequestInput } from "@/lib/validations/print-request";
import {
  CONSTRUCTOR_PRESETS,
  applyConstructorPresetValues,
  presetApplyNeedsConfirm,
  type ConstructorPreset,
} from "@/lib/constructor-presets";
import { Button } from "@/components/ui/Button";

/**
 * Quick-start template picker shown on the first wizard step (next to the
 * product-type choice). Applying a card fills the constructor fields from a
 * ready-made configuration via `react-hook-form`'s `reset()`, so every preview
 * (Design / 2D / 3D) updates immediately without a tab switch.
 *
 * Presets are a UI-only shortcut — no preset id is stored in the payload. The
 * picker keeps just the last-applied id locally to badge the active card.
 *
 * When the user already has hand-made design work (a dragged element, an
 * uploaded image), we ask for confirmation first so a template never silently
 * discards it. Contact details, comment and material choices are always kept.
 */
export function ConstructorPresetPicker({
  onApplied,
}: {
  /** Called after a preset is applied — lets the wizard clear UI-only state
   *  (e.g. the selected design element) tied to the now-replaced elements. */
  onApplied?: () => void;
}) {
  const methods = useFormContext<PrintRequestInput>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState<ConstructorPreset | null>(null);

  const apply = (preset: ConstructorPreset) => {
    const current = methods.getValues();
    const nextValues = applyConstructorPresetValues(current, preset);
    methods.reset(nextValues, {
      keepDirty: false,
      keepTouched: false,
      keepErrors: false,
    });
    setActiveId(preset.id);
    onApplied?.();
  };

  const handleApplyClick = (preset: ConstructorPreset) => {
    if (presetApplyNeedsConfirm(methods.getValues())) {
      setPending(preset);
      return;
    }
    apply(preset);
  };

  const confirmPending = () => {
    if (pending) apply(pending);
    setPending(null);
  };

  return (
    <section className="mb-6">
      <h3 className="text-sm font-semibold text-gray-900">Выберите шаблон</h3>
      <p className="mt-1 text-xs text-gray-500">
        Готовые конфигурации — быстрый старт. Можно применить и затем
        отредактировать любые параметры на следующих шагах.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CONSTRUCTOR_PRESETS.map((preset) => {
          const active = activeId === preset.id;
          return (
            <div
              key={preset.id}
              className={`flex flex-col rounded-xl border p-3 text-left transition ${
                active
                  ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {preset.title}
                </span>
                {active && (
                  <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    Применён
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs leading-snug text-gray-600">
                {preset.description}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-gray-400">
                {preset.recommendedFor}
              </p>

              {preset.chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {preset.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3">
                <Button
                  type="button"
                  variant={active ? "secondary" : "primary"}
                  onClick={() => handleApplyClick(preset)}
                  className="w-full"
                >
                  Применить
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {pending && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs leading-snug text-amber-900">
            Применение шаблона «{pending.title}» заменит текущие настройки
            изделия. Контакты и комментарий сохранятся.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={confirmPending}
              className="flex-1"
            >
              Применить
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPending(null)}
              className="flex-1"
            >
              Отмена
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
