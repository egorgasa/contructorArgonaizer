"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  COLORS,
  MATERIALS,
  PREFERRED_CONTACT_TIMES,
  PRODUCT_TYPES,
  SHAPES,
  STRENGTH_OPTIONS,
  USAGE_ENVIRONMENTS,
} from "@/lib/constants";
import {
  MATERIAL_FINISH_LABELS,
  MATERIAL_TYPE_LABELS,
  PATTERN_PLACEMENT_LABELS,
  PATTERN_TYPE_LABELS,
  TEXT_PLACEMENT_LABELS,
  type MaterialFinish,
  type MaterialType,
  type PatternPlacement,
  type PatternType,
  type TextPlacement,
} from "@/lib/appearance";
import { formatRequestAsText } from "@/lib/copy-formatter";
import type { PrintRequestData } from "@/lib/validations/print-request";
import type { PrintRequestDetail } from "@/types/print-request";

interface Props {
  detail: PrintRequestDetail;
}

export function RequestDetails({ detail }: Props) {
  const payload = detail.payload as PrintRequestData;
  const [copiedText, setCopiedText] = useState(false);

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback: select-and-copy via a transient textarea would go here.
      return;
    }
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Параметры изделия</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => copyText(formatRequestAsText(detail))}
          >
            {copiedText ? "Скопировано ✓" : "Скопировать описание заявки"}
          </Button>
        </CardHeader>
        <CardBody className="space-y-4 text-sm">
          <Section title="Основное">
            <Row label="Тип изделия" value={labelOf(PRODUCT_TYPES, payload.productType)} />
            <Row label="Назначение" value={payload.purpose} />
            <Row
              label="Условия использования"
              value={
                payload.usageEnvironment?.length
                  ? payload.usageEnvironment.map((v) => labelOf(USAGE_ENVIRONMENTS, v)).join(", ")
                  : "—"
              }
            />
          </Section>

          <Section title="Габариты и форма">
            <Row
              label="Размеры (Ш × Г × В)"
              value={`${payload.widthMm} × ${payload.depthMm} × ${payload.heightMm} мм`}
            />
            <Row label="Толщина стенок" value={`${payload.wallThicknessMm} мм`} />
            <Row label="Форма" value={labelOf(SHAPES, payload.shape)} />
            <Row label="Скругление углов" value={`${payload.cornerRadiusMm} мм`} />
          </Section>

          <Section title="Материал">
            <Row label="Материал" value={labelOf(MATERIALS, payload.material)} />
            <Row label="Цвет" value={labelOf(COLORS, payload.color)} />
            <Row label="Прочность" value={labelOf(STRENGTH_OPTIONS, payload.strength)} />
          </Section>

          <AppearanceSection appearance={payload.appearance} />

          <Section title="Дополнительные элементы">
            <Row label="Количество секций" value={String(payload.sectionsCount ?? 0)} />
            <Row
              label="Отверстия"
              value={payload.hasHoles ? payload.holesDescription || "да (без описания)" : "нет"}
            />
            <Row
              label="Крепления"
              value={
                payload.hasFasteners ? payload.fastenersDescription || "да (без описания)" : "нет"
              }
            />
            <Row
              label="Декор / текст / логотип"
              value={
                payload.hasDecoration
                  ? payload.decorationDescription || "да (без описания)"
                  : "нет"
              }
            />
          </Section>

          {(payload.referenceDescription || payload.optionalReferenceLinks) && (
            <Section title="Референсы">
              {payload.referenceDescription && (
                <Row label="Описание" value={payload.referenceDescription} />
              )}
              {payload.optionalReferenceLinks && (
                <Row label="Ссылки" value={payload.optionalReferenceLinks} />
              )}
            </Section>
          )}

          {payload.clientComment && (
            <Section title="Комментарий клиента">
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                {payload.clientComment}
              </div>
            </Section>
          )}

          <Section title="Контактные данные">
            <Row label="Имя" value={payload.clientName} />
            {payload.clientEmail && <Row label="Email" value={payload.clientEmail} link={`mailto:${payload.clientEmail}`} />}
            {payload.clientPhone && <Row label="Телефон" value={payload.clientPhone} link={`tel:${payload.clientPhone}`} />}
            <Row
              label="Удобное время связи"
              value={labelOf(PREFERRED_CONTACT_TIMES, payload.preferredContactTime)}
            />
          </Section>
        </CardBody>
      </Card>

      {detail.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Приложенные файлы ({detail.files.length})</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {detail.files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">{f.filename}</div>
                    <div className="text-xs text-gray-500">
                      {f.mimeType} · {formatBytes(f.sizeBytes)} · {formatShortDate(f.uploadedAt)}
                    </div>
                  </div>
                  <a
                    href={`/api/requests/${detail.id}/files/${f.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm text-brand-700 hover:underline"
                  >
                    Открыть
                  </a>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-1 last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">
        {link ? (
          <a className="text-brand-600 hover:underline" href={link}>
            {value}
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function labelOf<T extends readonly { value: string; label: string }[]>(
  options: T,
  value: string | undefined,
): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

/**
 * "Внешний вид" admin card section. Renders the entire appearance domain
 * (base material/color/finish/opacity + optional pattern + optional text
 * decoration) in the same Section/Row layout used by the other blocks.
 *
 * Bails out gracefully when `appearance` is undefined — happens for requests
 * created before Layer 6 went live. Pattern and text sub-blocks collapse to a
 * single "нет" row when their respective `enabled` flag is off, so an
 * unused feature doesn't bloat the card.
 */
function AppearanceSection({
  appearance,
}: {
  appearance: PrintRequestData["appearance"] | undefined;
}) {
  if (!appearance) {
    return (
      <Section title="Внешний вид">
        <Row label="Состояние" value="Старый формат заявки — данные отсутствуют" />
      </Section>
    );
  }

  const pattern = appearance.pattern;
  const text = appearance.textDecoration;
  const trimmedText = (text?.text ?? "").trim();

  return (
    <Section title="Внешний вид">
      <Row
        label="Материал"
        value={MATERIAL_TYPE_LABELS[appearance.materialType as MaterialType] ?? appearance.materialType}
      />
      <ColorRow label="Базовый цвет" hex={appearance.baseColorHex} />
      <Row
        label="Финиш"
        value={MATERIAL_FINISH_LABELS[appearance.materialFinish as MaterialFinish] ?? appearance.materialFinish}
      />
      <Row label="Непрозрачность" value={formatRatioForUI(appearance.opacity)} />

      {pattern?.enabled && pattern.type !== "none" ? (
        <>
          <Row
            label="Узор"
            value={PATTERN_TYPE_LABELS[pattern.type as PatternType] ?? pattern.type}
          />
          <ColorRow label="Цвет узора" hex={pattern.colorHex} />
          <Row label="Масштаб узора" value={formatScaleForUI(pattern.scale)} />
          <Row label="Прозрачность узора" value={formatRatioForUI(pattern.opacity)} />
          <Row
            label="Размещение узора"
            value={
              PATTERN_PLACEMENT_LABELS[pattern.placement as PatternPlacement] ??
              pattern.placement
            }
          />
        </>
      ) : (
        <Row label="Узор" value="нет" />
      )}

      {text?.enabled && trimmedText ? (
        <>
          <Row label="Текст" value={`«${trimmedText}»`} />
          <ColorRow label="Цвет текста" hex={text.colorHex} />
          <Row label="Размер текста" value={`${text.size} мм`} />
          <Row
            label="Расположение текста"
            value={
              TEXT_PLACEMENT_LABELS[text.placement as TextPlacement] ??
              text.placement
            }
          />
        </>
      ) : (
        <Row label="Текстовый декор" value="нет" />
      )}
    </Section>
  );
}

/**
 * Variant of <Row> that puts a small colour swatch next to the hex string.
 * Helps the operator eyeball the colour without needing to mentally decode
 * `#1F1F1F`.
 */
function ColorRow({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 py-1 last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-2 text-right font-medium text-gray-900">
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 rounded border border-gray-300"
          style={{ backgroundColor: hex }}
        />
        <span className="font-mono text-xs">{hex}</span>
      </span>
    </div>
  );
}

function formatRatioForUI(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Number(value.toFixed(2)).toString();
}

function formatScaleForUI(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Number(value.toFixed(1)).toString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
