"use client";

import { useState } from "react";
import type {
  ManufacturabilityCheck,
  ManufacturabilitySeverity,
} from "@/lib/constructor-manufacturability";

/**
 * Non-blocking printability recommendations panel ("Проверка печати").
 *
 * Presentation-only: it renders the derived `ManufacturabilityCheck[]` (built in
 * the wizard) and never touches form state or the payload. The checks are hints,
 * not validation — the copy makes clear the user can submit anyway and the
 * operator does the final check.
 *
 * Two layouts via `variant`:
 *   - "panel"  — compact sidebar/preview card, collapses to 3 items by default;
 *   - "review" — full list shown before submit on the Review step.
 */
export function ManufacturabilityPanel({
  checks,
  variant = "panel",
}: {
  checks: ManufacturabilityCheck[];
  variant?: "panel" | "review";
}) {
  const [showAll, setShowAll] = useState(false);

  const isReview = variant === "review";
  const title = isReview ? "Рекомендации перед отправкой" : "Проверка печати";

  if (checks.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <p className="mt-1 text-xs text-gray-600">
          Критичных замечаний нет. Оператор всё равно проверит модель перед
          изготовлением.
        </p>
      </section>
    );
  }

  // Compact panel shows the most severe few; Review shows everything.
  const MAX_COMPACT = 3;
  const visible =
    isReview || showAll ? checks : checks.slice(0, MAX_COMPACT);
  const hiddenCount = checks.length - visible.length;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <span className="text-xs text-gray-500">{checks.length}</span>
      </div>
      <p className="mt-1 text-xs text-gray-600">
        {isReview
          ? "Вы можете отправить заявку сейчас — мы проверим параметры вручную."
          : "Рекомендации, не блокирующие отправку. Оператор проверит модель."}
      </p>

      <ul className="mt-3 space-y-2">
        {visible.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </ul>

      {!isReview && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 text-xs font-medium text-brand-700 hover:underline"
        >
          Показать все ({checks.length})
        </button>
      )}
    </section>
  );
}

const SEVERITY_STYLES: Record<
  ManufacturabilitySeverity,
  { box: string; title: string; badge: string; label: string }
> = {
  danger: {
    box: "border-rose-200 bg-rose-50",
    title: "text-rose-900",
    badge: "bg-rose-600 text-white",
    label: "Важно",
  },
  warning: {
    box: "border-amber-200 bg-amber-50",
    title: "text-amber-900",
    badge: "bg-amber-500 text-white",
    label: "Внимание",
  },
  info: {
    box: "border-sky-200 bg-sky-50",
    title: "text-sky-900",
    badge: "bg-sky-500 text-white",
    label: "Заметка",
  },
};

function CheckRow({ check }: { check: ManufacturabilityCheck }) {
  const s = SEVERITY_STYLES[check.severity];
  return (
    <li className={`rounded-lg border px-3 py-2 ${s.box}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${s.title}`}>{check.title}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${s.badge}`}
        >
          {s.label}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-700">{check.message}</p>
      {check.suggestion && (
        <p className="mt-1 text-xs text-gray-500">{check.suggestion}</p>
      )}
    </li>
  );
}
