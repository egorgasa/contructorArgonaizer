"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { QUOTE_CURRENCIES, QUOTE_STATUSES } from "@/lib/constants";
import type { StoredRequestQuote } from "@/types/print-request";
import { QuoteStatusBadge } from "./QuoteStatusBadge";

interface Props {
  requestId: string;
  quote: StoredRequestQuote | null;
}

/** Price is stored in integer cents; the form edits major units (e.g. "120.50"). */
function centsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toString();
}

/** ISO timestamp → <input type="date"> value (YYYY-MM-DD). */
function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatPrice(cents: number | null, currency: string): string {
  if (cents == null) return "—";
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function QuoteEditor({ requestId, quote }: Props) {
  const router = useRouter();

  const [price, setPrice] = useState(centsToInput(quote?.priceCents ?? null));
  const [currency, setCurrency] = useState(quote?.currency ?? "BYN");
  const [productionDays, setProductionDays] = useState(
    quote?.productionDays != null ? String(quote.productionDays) : "",
  );
  const [validUntil, setValidUntil] = useState(isoToDateInput(quote?.validUntil ?? null));
  const [operatorComment, setOperatorComment] = useState(quote?.operatorComment ?? "");
  const [internalCostNote, setInternalCostNote] = useState(quote?.internalCostNote ?? "");
  const [status, setStatus] = useState(quote?.status ?? "draft");

  // Last saved snapshot, used for the read-only summary at the top.
  const [saved, setSaved] = useState<StoredRequestQuote | null>(quote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (overrideStatus?: string) => {
    setError(null);

    // Convert price major-units → integer cents. Empty = clear (null).
    let priceCents: number | null = null;
    const priceTrimmed = price.trim();
    if (priceTrimmed !== "") {
      const parsed = Number(priceTrimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Цена должна быть неотрицательным числом");
        return;
      }
      priceCents = Math.round(parsed * 100);
    }

    let days: number | null = null;
    const daysTrimmed = productionDays.trim();
    if (daysTrimmed !== "") {
      const parsed = Number(daysTrimmed);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError("Срок изготовления — целое число дней");
        return;
      }
      days = parsed;
    }

    const nextStatus = overrideStatus ?? status;

    setSaving(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/quote`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceCents,
          currency,
          productionDays: days,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          operatorComment: operatorComment || null,
          internalCostNote: internalCostNote || null,
          status: nextStatus,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Не удалось сохранить смету");
      }
      const json = (await res.json()) as { quote: StoredRequestQuote };
      setSaved(json.quote);
      setStatus(json.quote.status);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>Смета / предложение</CardTitle>
        {saved && <QuoteStatusBadge status={saved.status} />}
      </CardHeader>
      <CardBody className="space-y-4">
        {saved && (
          <dl className="space-y-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
            <SummaryRow label="Цена" value={formatPrice(saved.priceCents, saved.currency)} />
            <SummaryRow
              label="Срок изготовления"
              value={saved.productionDays != null ? `${saved.productionDays} дн.` : "—"}
            />
            <SummaryRow
              label="Действительно до"
              value={saved.validUntil ? new Date(saved.validUntil).toLocaleDateString("ru-RU") : "—"}
            />
            {saved.operatorComment && (
              <SummaryRow label="Комментарий для клиента" value={saved.operatorComment} />
            )}
            {saved.internalCostNote && (
              <div className="pt-1">
                <div className="text-xs font-medium text-amber-700">
                  Внутренняя заметка (клиенту не показывается)
                </div>
                <div className="whitespace-pre-wrap text-gray-800">{saved.internalCostNote}</div>
              </div>
            )}
          </dl>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">Цена</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="например, 120.50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">Валюта</label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {QUOTE_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">
              Срок изготовления, дней
            </label>
            <Input
              type="number"
              min={0}
              step="1"
              inputMode="numeric"
              value={productionDays}
              onChange={(e) => setProductionDays(e.target.value)}
              placeholder="например, 7"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">Действительно до</label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Комментарий для клиента
          </label>
          <Textarea
            rows={2}
            value={operatorComment}
            onChange={(e) => setOperatorComment(e.target.value)}
            placeholder="Что входит в стоимость, условия и т.п."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Внутренняя заметка{" "}
            <span className="font-normal text-amber-700">(клиенту не показывается)</span>
          </label>
          <Textarea
            rows={2}
            value={internalCostNote}
            onChange={(e) => setInternalCostNote(e.target.value)}
            placeholder="Себестоимость, расход материала, заметки для себя"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">Статус предложения</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {QUOTE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={() => save()}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => save("ready")}>
            Отметить готовым
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => save("sent")}>
            Отметить отправленным
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
