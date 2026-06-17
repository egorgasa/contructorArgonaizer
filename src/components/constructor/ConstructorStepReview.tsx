"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  COLORS,
  MATERIALS,
  PREFERRED_CONTACT_TIMES,
  PRODUCT_TYPES,
  STRENGTH_OPTIONS,
  USAGE_ENVIRONMENTS,
} from "@/lib/constants";
import {
  DEFAULT_BASE_HEX,
  HEX_COLOR_RE,
  MATERIAL_FINISH_OPTIONS,
  PATTERN_TYPE_LABELS,
  TEXT_PLACEMENT_LABELS,
  type TextPlacement,
} from "@/lib/appearance";
import type { PrintRequestInput } from "@/lib/validations/print-request";
import {
  BASE_SHAPE_LABELS,
  countElementsBySource,
  effectiveCornerRadius,
} from "@/lib/design";
import {
  buildConstructorVisualScene,
  type VisualMaterialPattern,
} from "@/lib/constructor-visual-scene";
import { buildManufacturabilityChecks } from "@/lib/constructor-manufacturability";
import { formatHandleSummary } from "@/lib/accessories";
import { LID_TYPE_LABELS, LID_FIT_LABELS } from "@/lib/lid";
import { DesignManufacturingSummary } from "./DesignManufacturingSummary";
import { ManufacturabilityPanel } from "./ManufacturabilityPanel";

export function ConstructorStepReview() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<PrintRequestInput>();
  const data = watch();

  // Build the same derived view model the Design / 2D / 3D previews read from,
  // so the Review summary can't drift from what the user just saw in the editor.
  // Pure & read-only — the scene is never written back or serialized.
  const scene = buildConstructorVisualScene(data);
  const { baseShape, material, sections, elements, accessories } = scene;

  // Non-blocking printability recommendations, derived from the same form +
  // scene. Read-only UI hints — never serialized into the submit payload.
  const manufacturabilityChecks = buildManufacturabilityChecks({ data, scene });

  // Counts of the structured mounting / decoration elements (drawn / dragged on
  // the Design tab). Their exact positions are listed in the manufacturing
  // summary below.
  const holeCount = countElementsBySource(elements, "holes");
  const fastenerCount = countElementsBySource(elements, "fasteners");
  const decorCount = countElementsBySource(elements, "decor");
  const handleCount = accessories.length;
  const lid = scene.lid;

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Проверка и отправка</h2>
      <p className="mb-6 text-sm text-gray-600">
        Проверьте параметры и оставьте контакты, чтобы мы могли связаться.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          <Summary label="Тип изделия" value={labelOf(PRODUCT_TYPES, data.productType)} />
          <Summary label="Назначение" value={data.purpose} />
          <Summary
            label="Условия использования"
            value={
              data.usageEnvironment?.length
                ? data.usageEnvironment
                    .map((v) => labelOf(USAGE_ENVIRONMENTS, v))
                    .join(", ")
                : "—"
            }
          />
          <Summary
            label="Габариты"
            value={`${data.widthMm || 0} × ${data.depthMm || 0} × ${data.heightMm || 0} мм`}
          />
          <Summary label="Толщина стенок" value={`${data.wallThicknessMm || 0} мм`} />
          <Summary label="Форма" value={BASE_SHAPE_LABELS[baseShape.kind]} />
          <Summary
            label="Скругление"
            value={radiusSummary(effectiveCornerRadius(baseShape))}
          />
          <Summary label="Материал" value={labelOf(MATERIALS, data.material)} />
          <ColorSummary
            label="Цвет"
            colorValue={data.color}
            hex={material.fill}
          />
          <Summary
            label="Поверхность"
            value={labelOf(MATERIAL_FINISH_OPTIONS, material.finish)}
          />
          {material.isSemiTransparent && (
            <Summary
              label="Непрозрачность"
              value={material.baseOpacity.toFixed(2)}
            />
          )}
          <Summary label="Прочность" value={labelOf(STRENGTH_OPTIONS, data.strength)} />
          <Summary label="Секции" value={sectionsSummary(sections.count)} />
          <Summary
            label="Отверстия"
            value={mountingSummary(data.hasHoles, holeCount, data.holesDescription)}
          />
          <Summary
            label="Крепления"
            value={mountingSummary(
              data.hasFasteners,
              fastenerCount,
              data.fastenersDescription,
            )}
          />
          <Summary
            label="Рисунок"
            value={patternSummary(material.pattern)}
          />
          <Summary
            label="Текст"
            value={textSummary(data.appearance?.textDecoration)}
          />
          <Summary
            label="Декор"
            value={mountingSummary(
              data.hasDecoration,
              decorCount,
              data.decorationDescription,
            )}
          />
          <Summary
            label="Ручки"
            value={handleCount === 0 ? "нет" : `${handleCount} шт.`}
          />
          <Summary
            label="Крышка"
            value={lid ? LID_TYPE_LABELS[lid.type] : "нет"}
          />
        </div>

        {handleCount > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-700">
            <div className="mb-1 font-medium">Ручки:</div>
            <ul className="list-disc space-y-0.5 pl-5">
              {accessories.map((a) => (
                <li key={a.id}>{formatHandleSummary(a)}</li>
              ))}
            </ul>
          </div>
        )}

        {lid && (
          <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-700">
            <div className="mb-1 font-medium">Крышка:</div>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>Тип: {LID_TYPE_LABELS[lid.type]}</li>
              <li>Посадка: {LID_FIT_LABELS[lid.fit]}</li>
              <li>Толщина: {lid.thicknessMm} мм</li>
              {lid.fit === "overlay" && <li>Свес: {lid.overhangMm} мм</li>}
              {lid.fit === "inset" && <li>Зазор: {lid.clearanceMm} мм</li>}
            </ul>
            {lid.hinged && (
              <p className="mt-1 text-xs text-amber-700">
                Петли показаны схематично — конструкцию уточняет оператор.
              </p>
            )}
          </div>
        )}

        {(data.clientComment ||
          data.referenceDescription ||
          data.optionalReferenceLinks) && (
          <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-700">
            {data.clientComment && (
              <div>
                <span className="font-medium">Комментарий:</span> {data.clientComment}
              </div>
            )}
            {data.referenceDescription && (
              <div className="mt-1">
                <span className="font-medium">Референс:</span> {data.referenceDescription}
              </div>
            )}
            {data.optionalReferenceLinks && (
              <div className="mt-1">
                <span className="font-medium">Ссылки:</span> {data.optionalReferenceLinks}
              </div>
            )}
          </div>
        )}
      </div>

      <DesignManufacturingSummary
        scene={scene}
        legacy={{ heightMm: data.heightMm }}
      />

      <div className="mt-6">
        <ManufacturabilityPanel
          checks={manufacturabilityChecks}
          variant="review"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Имя <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="Иван Петров"
            invalid={!!errors.clientName}
            {...register("clientName")}
          />
          {errors.clientName && (
            <div className="mt-1 text-sm text-red-600">
              {errors.clientName.message as string}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            invalid={!!errors.clientEmail}
            {...register("clientEmail")}
          />
          {errors.clientEmail && (
            <div className="mt-1 text-sm text-red-600">
              {errors.clientEmail.message as string}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">Телефон</label>
          <Input
            type="tel"
            placeholder="+375 29 123-45-67"
            invalid={!!errors.clientPhone}
            {...register("clientPhone")}
          />
          {errors.clientPhone && (
            <div className="mt-1 text-sm text-red-600">
              {errors.clientPhone.message as string}
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Удобное время связи
          </label>
          <Select {...register("preferredContactTime")}>
            {PREFERRED_CONTACT_TIMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-brand-600"
          {...register("consentPersonalData")}
        />
        <span className="text-sm text-gray-700">
          Я согласен на обработку моих персональных данных, чтобы получить ответ по заявке.
        </span>
      </label>
      {errors.consentPersonalData && (
        <div className="mt-1 text-sm text-red-600">
          {errors.consentPersonalData.message as string}
        </div>
      )}
    </div>
  );
}

/**
 * Human-readable section summary. `count` compartments use `count - 1`
 * partition walls, so we spell both out: 0/1 → no partitions, N → "N секций,
 * N−1 перегородок".
 */
/**
 * Mounting-feature summary (holes / fasteners): "нет" when disabled, otherwise
 * the element count ("N шт.") plus the operator's free-text note. Falls back to
 * "да" when enabled with neither a count nor a note (legacy payload).
 */
function mountingSummary(
  enabled: boolean | undefined,
  count: number,
  description: string | undefined,
): string {
  if (!enabled) return "нет";
  const parts: string[] = [];
  if (count > 0) parts.push(`${count} шт.`);
  const note = description?.trim();
  if (note) parts.push(note);
  return parts.length > 0 ? parts.join(" · ") : "да";
}

/** Corner-radius summary: "нет" when zero (e.g. plain rectangle / circle), the
 *  rounded mm value otherwise. Mirrors the manufacturing summary's radius row. */
function radiusSummary(radius: number): string {
  return radius > 0 ? `${Math.round(radius)} мм` : "нет";
}

/**
 * Surface-pattern summary derived from the scene's resolved pattern: "нет" when
 * inactive, an operator note for a custom pattern, otherwise the pattern label
 * plus its opacity (so a faint vs. dominant pattern reads at a glance).
 */
function patternSummary(pattern: VisualMaterialPattern): string {
  if (pattern.isCustom) return "свой рисунок (уточняет оператор)";
  if (!pattern.active) return "нет";
  const label = PATTERN_TYPE_LABELS[pattern.type] ?? pattern.type;
  return `${label} · непрозр. ${pattern.opacity.toFixed(2)}`;
}

/**
 * Surface-text summary: "нет" when disabled, the quoted label + face when set,
 * or a "text not entered yet" note when enabled without content. Never emits a
 * raw data URL — this is plain text only.
 */
function textSummary(
  text:
    | {
        enabled?: boolean;
        text?: string | null;
        placement?: string;
      }
    | undefined,
): string {
  if (!text?.enabled) return "нет";
  const value = (text.text ?? "").trim();
  if (!value) return "включён, текст не задан";
  const place = text.placement
    ? TEXT_PLACEMENT_LABELS[text.placement as TextPlacement]
    : undefined;
  return place ? `«${value}» · ${place}` : `«${value}»`;
}

function sectionsSummary(sectionsCount: number | undefined): string {
  const count = Math.max(0, Math.floor(sectionsCount ?? 0));
  if (count <= 1) return "Без перегородок (1 секция)";
  const walls = count - 1;
  return `${count} секций, ${walls} ${pluralizeWalls(walls)}`;
}

/** Russian pluralization for "перегородка". */
function pluralizeWalls(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "перегородка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return "перегородки";
  return "перегородок";
}

function Summary({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

// Same look as Summary, but with a small colour swatch — keeps the row compact
// while still showing the actual chosen hex (important for "custom" colours).
function ColorSummary({
  label,
  colorValue,
  hex,
}: {
  label: string;
  colorValue: string | undefined;
  hex: string | undefined;
}) {
  const labelText = labelOf(COLORS, colorValue);
  const swatch = hex && HEX_COLOR_RE.test(hex) ? hex : DEFAULT_BASE_HEX;
  const hasSelection = !!colorValue;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-2 text-right font-medium text-gray-900">
        {hasSelection && (
          <span
            className="inline-block h-4 w-4 rounded-full border border-gray-300"
            style={{ background: swatch }}
            aria-hidden
          />
        )}
        {hasSelection ? labelText : "—"}
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
