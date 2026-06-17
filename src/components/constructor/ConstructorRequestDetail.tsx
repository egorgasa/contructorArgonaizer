"use client";

import { buildConstructorVisualScene } from "@/lib/constructor-visual-scene";
import { ProductPreviewTabs } from "./ProductPreviewTabs";
import { DesignManufacturingSummary } from "./DesignManufacturingSummary";
import { RequestDetails } from "@/components/admin/RequestDetails";
import { formatHandleSummary } from "@/lib/accessories";
import { LID_TYPE_LABELS, LID_FIT_LABELS } from "@/lib/lid";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { PrintRequestData } from "@/lib/validations/print-request";
import type { PrintRequestDetail } from "@/types/print-request";

// ---------------------------------------------------------------------------
// Read-only operator view of a saved constructor request.
//
// It is the single, reusable entry point for showing a request to an operator:
// it builds the unified `ConstructorVisualScene` ONCE from the saved payload
// (the same builder the wizard uses — no second normalisation) and composes
// the existing read-only building blocks:
//   • <RequestDetails> — structured text fields, attached files, copy-as-text;
//   • <ProductPreviewTabs> in read-only mode (no select / drag handlers);
//   • <DesignManufacturingSummary> — base shape, grouped elements, warnings.
// On top it adds handle + lid summaries (read from the scene, not re-derived)
// and a collapsed, sanitised JSON section. It never prints raw image data.
// ---------------------------------------------------------------------------

interface Props {
  detail: PrintRequestDetail;
}

export function ConstructorRequestDetail({ detail }: Props) {
  const payload = detail.payload;

  // Same builder the wizard / previews / Review use — one normalisation, one
  // scene. Tolerant of legacy payloads (missing design / accessories / lid).
  const scene = buildConstructorVisualScene(payload);
  const sanitized = sanitizePayloadForDisplay(payload);
  const lid = scene.lid;

  return (
    <div className="space-y-6">
      {/* Structured fields + files + copy-as-text (reused, no JSON dump). */}
      <RequestDetails detail={detail} />

      {/* Visual previews. Read-only: no onSelectElement / onUpdateElement, so
          the Design tab renders without drag / resize / selection. */}
      <Card>
        <CardHeader>
          <CardTitle>Визуализация</CardTitle>
        </CardHeader>
        <CardBody>
          <ProductPreviewTabs
            productType={payload.productType}
            shape={payload.shape}
            widthMm={payload.widthMm}
            depthMm={payload.depthMm}
            heightMm={payload.heightMm}
            wallThicknessMm={payload.wallThicknessMm}
            cornerRadiusMm={payload.cornerRadiusMm}
            sectionsCount={payload.sectionsCount}
            appearance={payload.appearance}
            scene={scene}
            design={payload.design}
            hasHoles={payload.hasHoles}
            hasFasteners={payload.hasFasteners}
          />
        </CardBody>
      </Card>

      {/* Manufacturing summary — base shape, grouped elements, MVP warnings. */}
      <DesignManufacturingSummary
        scene={scene}
        legacy={{ heightMm: payload.heightMm }}
      />

      {/* Handles / accessories. */}
      <Card>
        <CardHeader>
          <CardTitle>Ручки</CardTitle>
        </CardHeader>
        <CardBody>
          {scene.accessories.length === 0 ? (
            <div className="text-sm text-gray-500">нет</div>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
              {scene.accessories.map((a) => (
                <li key={a.id}>{formatHandleSummary(a)}</li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Lid. */}
      <Card>
        <CardHeader>
          <CardTitle>Крышка</CardTitle>
        </CardHeader>
        <CardBody>
          {lid ? (
            <>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                <li>Тип: {LID_TYPE_LABELS[lid.type]}</li>
                <li>Посадка: {LID_FIT_LABELS[lid.fit]}</li>
                <li>Толщина: {lid.thicknessMm} мм</li>
                {lid.fit === "overlay" && <li>Свес: {lid.overhangMm} мм</li>}
                {lid.fit === "inset" && <li>Зазор: {lid.clearanceMm} мм</li>}
              </ul>
              {lid.hinged && (
                <p className="mt-2 text-xs text-amber-700">
                  Петли показаны схематично — конструкцию уточняет оператор.
                </p>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500">нет</div>
          )}
        </CardBody>
      </Card>

      {/* Technical payload — collapsed by default, image data omitted. */}
      <Card>
        <CardBody>
          <details>
            <summary className="cursor-pointer text-sm text-gray-700">
              Технические данные (JSON) — изображения скрыты
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-gray-900 px-4 py-3 text-xs text-gray-100">
              {JSON.stringify(sanitized, null, 2)}
            </pre>
          </details>
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * Return a deep copy of the payload with every design-element `imageDataUrl`
 * replaced by a placeholder, so the JSON view never prints huge base64 blobs.
 * Guarded with optional chaining because legacy payloads (parsed straight from
 * the DB without re-validation) may not carry a `design` object at all.
 */
function sanitizePayloadForDisplay(payload: PrintRequestData): PrintRequestData {
  const clone = JSON.parse(JSON.stringify(payload)) as PrintRequestData;
  const elements = clone.design?.elements;
  if (Array.isArray(elements)) {
    for (const el of elements) {
      if (el && typeof el.imageDataUrl === "string" && el.imageDataUrl.length > 0) {
        el.imageDataUrl = "[image data omitted]";
      }
    }
  }
  return clone;
}
