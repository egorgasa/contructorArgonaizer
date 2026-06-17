"use client";

import { useEffect, useState } from "react";
import {
  readRequestSuccessSummary,
  type RequestSuccessSummary,
} from "@/lib/request-success-summary";

/**
 * Client island for the success page. Owns the two browser-only affordances:
 *   1. the request-number block with a "copy" button (needs `navigator.clipboard`);
 *   2. the safe order summary, read from `sessionStorage` after the redirect.
 *
 * Both degrade gracefully: with no number we show a neutral confirmation, and
 * with no stored summary the summary card is simply omitted. The summary is read
 * in an effect (never during render) so SSR/first paint stay deterministic and
 * hydration-safe.
 */
export function RequestSuccessDetails({ number }: { number?: string }) {
  const [summary, setSummary] = useState<RequestSuccessSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = readRequestSuccessSummary();
    if (!stored) return;
    // Guard against showing a summary that belongs to a different request (e.g.
    // the user changed the `number` in the URL by hand). When either side lacks
    // a number we still show it — it's the freshest thing we have.
    if (
      number &&
      stored.publicNumber &&
      stored.publicNumber !== number
    ) {
      return;
    }
    setSummary(stored);
  }, [number]);

  const handleCopy = async () => {
    if (!number || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions — silently no-op.
    }
  };

  return (
    <>
      {number ? (
        <div className="mt-6 inline-flex flex-col items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-6 py-4">
          <div className="text-xs uppercase tracking-wide text-brand-700">
            Номер заявки
          </div>
          <div className="text-xl font-bold text-brand-700">{number}</div>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-brand-300 bg-white px-3 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
          >
            {copied ? "Скопировано" : "Скопировать номер"}
          </button>
        </div>
      ) : (
        <div className="mt-6 inline-block rounded-xl border border-gray-200 bg-gray-50 px-6 py-4 text-sm font-medium text-gray-700">
          Заявка успешно создана
        </div>
      )}

      {summary && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-left">
          <div className="mb-3 text-sm font-semibold text-gray-900">
            Кратко о заявке
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <SummaryRow label="Тип изделия" value={summary.productTypeLabel} />
            <SummaryRow label="Размеры" value={summary.dimensions} />
            <SummaryRow label="Форма" value={summary.baseShapeLabel} />
            <SummaryRow label="Материал" value={summary.materialLabel} />
            <SummaryRow label="Цвет" value={summary.colorLabel} />
            <SummaryRow
              label="Секции"
              value={summary.sectionsCount > 0 ? `${summary.sectionsCount}` : "нет"}
            />
            <SummaryRow label="Крышка" value={yesNo(summary.hasLid)} />
            <SummaryRow
              label="Ручки"
              value={summary.handlesCount > 0 ? `${summary.handlesCount} шт.` : "нет"}
            />
            <SummaryRow label="Отверстия" value={yesNo(summary.hasHoles)} />
            <SummaryRow label="Крепления" value={yesNo(summary.hasFasteners)} />
            <SummaryRow label="Надпись" value={yesNo(summary.hasText)} />
            <SummaryRow label="Рисунок" value={yesNo(summary.hasPattern)} />
            <SummaryRow label="Декор" value={yesNo(summary.hasDecor)} />
            <SummaryRow label="Изображение" value={yesNo(summary.hasImage)} />
          </dl>
        </div>
      )}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 pb-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function yesNo(value: boolean): string {
  return value ? "да" : "нет";
}
