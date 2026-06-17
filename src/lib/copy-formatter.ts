import {
  COLORS,
  MATERIALS,
  PREFERRED_CONTACT_TIMES,
  PRODUCT_TYPES,
  REQUEST_STATUSES,
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
import type { PrintRequestData } from "@/lib/validations/print-request";
import type { PrintRequestDetail, StoredRequestFile } from "@/types/print-request";

/**
 * Render a request as plain human-readable text — suitable for pasting into
 * chats, emails, or internal tickets. No JSON, no code fences.
 *
 * Robust against partial / legacy payloads: we cast to a permissive shape and
 * fall back to dashes for any missing fields so an old request still renders.
 */
export function formatRequestAsText(detail: PrintRequestDetail): string {
  const p = detail.payload as Partial<PrintRequestData> | null;

  const lines: string[] = [];

  // Header
  lines.push(`Заявка ${detail.publicNumber}`);
  lines.push(`Статус: ${labelFor(REQUEST_STATUSES, detail.status)}`);
  lines.push(`Создана: ${formatDate(detail.createdAt)}`);
  lines.push("");

  // 1. Product
  lines.push("— Изделие —");
  lines.push(`Тип: ${labelFor(PRODUCT_TYPES, detail.productType)}`);
  if (p?.purpose) lines.push(`Назначение: ${p.purpose}`);
  if (p?.usageEnvironment?.length) {
    const env = p.usageEnvironment
      .map((v) => labelFor(USAGE_ENVIRONMENTS, v))
      .join(", ");
    lines.push(`Условия использования: ${env}`);
  }
  lines.push("");

  // 2. Dimensions
  lines.push("— Размеры и форма —");
  if (
    p?.widthMm !== undefined ||
    p?.depthMm !== undefined ||
    p?.heightMm !== undefined
  ) {
    lines.push(
      `Габариты (Ш×Г×В): ${p?.widthMm ?? "—"} × ${p?.depthMm ?? "—"} × ${p?.heightMm ?? "—"} мм`,
    );
  }
  if (p?.wallThicknessMm !== undefined) {
    lines.push(`Толщина стенки: ${p.wallThicknessMm} мм`);
  }
  if (p?.shape) {
    lines.push(`Форма: ${labelFor(SHAPES, p.shape)}`);
  }
  if (p?.shape === "rectangular" && (p?.cornerRadiusMm ?? 0) > 0) {
    lines.push(`Скругление углов: ${p?.cornerRadiusMm} мм`);
  }
  if ((p?.sectionsCount ?? 0) > 0) {
    lines.push(`Количество секций: ${p?.sectionsCount}`);
  }
  lines.push("");

  // 3. Material and color
  lines.push("— Материал и цвет —");
  if (p?.material) lines.push(`Материал: ${labelFor(MATERIALS, p.material)}`);
  if (p?.color) lines.push(`Цвет: ${labelFor(COLORS, p.color)}`);
  if (p?.strength) {
    lines.push(`Прочность: ${labelFor(STRENGTH_OPTIONS, p.strength)}`);
  }
  lines.push("");

  // 4. Extras
  const extras: string[] = [];
  if (p?.hasHoles && p?.holesDescription) {
    extras.push(`Отверстия/вырезы: ${p.holesDescription}`);
  }
  if (p?.hasFasteners && p?.fastenersDescription) {
    extras.push(`Крепления: ${p.fastenersDescription}`);
  }
  if (p?.hasDecoration && p?.decorationDescription) {
    extras.push(`Декор: ${p.decorationDescription}`);
  }
  if (extras.length > 0) {
    lines.push("— Дополнительные элементы —");
    lines.push(...extras);
    lines.push("");
  }

  // 4b. Appearance (Layer 9). Always emitted so the operator can see exactly
  // what the previewer rendered — even if the user left everything at default.
  const appearanceLines = formatAppearanceBlock(p?.appearance);
  if (appearanceLines.length > 0) {
    lines.push("— Внешний вид —");
    lines.push(...appearanceLines);
    lines.push("");
  }

  // 5. Comments & references
  const refLines: string[] = [];
  if (p?.clientComment) refLines.push(`Комментарий: ${p.clientComment}`);
  if (p?.referenceDescription) {
    refLines.push(`Описание референса: ${p.referenceDescription}`);
  }
  if (p?.optionalReferenceLinks) {
    refLines.push(`Ссылки: ${p.optionalReferenceLinks}`);
  }
  if (refLines.length > 0) {
    lines.push("— Комментарий и референсы —");
    lines.push(...refLines);
    lines.push("");
  }

  // 6. Files
  if (detail.files?.length > 0) {
    lines.push("— Приложенные файлы —");
    lines.push(...detail.files.map((f: StoredRequestFile) => `• ${f.filename} (${formatBytes(f.sizeBytes)})`));
    lines.push("");
  }

  // 7. Contacts
  lines.push("— Контакты клиента —");
  lines.push(`Имя: ${detail.clientName || "—"}`);
  if (detail.clientEmail) lines.push(`Email: ${detail.clientEmail}`);
  if (detail.clientPhone) lines.push(`Телефон: ${detail.clientPhone}`);
  if (p?.preferredContactTime) {
    lines.push(
      `Предпочтительное время: ${labelFor(PREFERRED_CONTACT_TIMES, p.preferredContactTime)}`,
    );
  }

  // Trim trailing blanks.
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  return lines.join("\n");
}

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/**
 * Render the appearance section as plain text for the copy-to-clipboard
 * button. Returns an empty array if `appearance` is missing entirely (legacy
 * payloads created before Layer 7/8) so the calling formatter can skip the
 * whole section. Otherwise emits every populated field — pattern / text
 * subsections are gated on their `enabled` flags so unused features don't
 * clutter the output.
 */
function formatAppearanceBlock(
  appearance: PrintRequestData["appearance"] | undefined,
): string[] {
  if (!appearance) return [];

  const out: string[] = [];

  // Material / base color is always emitted — these have schema defaults so
  // every modern payload carries them.
  out.push(`Материал: ${MATERIAL_TYPE_LABELS[appearance.materialType as MaterialType] ?? appearance.materialType}`);
  out.push(`Базовый цвет: ${appearance.baseColorHex}`);
  out.push(`Финиш: ${MATERIAL_FINISH_LABELS[appearance.materialFinish as MaterialFinish] ?? appearance.materialFinish}`);
  out.push(`Непрозрачность: ${formatRatio(appearance.opacity)}`);

  const pattern = appearance.pattern;
  if (pattern?.enabled && pattern.type !== "none") {
    out.push(
      `Узор: ${PATTERN_TYPE_LABELS[pattern.type as PatternType] ?? pattern.type}`,
    );
    out.push(`Цвет узора: ${pattern.colorHex}`);
    out.push(`Масштаб узора: ${formatScale(pattern.scale)}`);
    out.push(`Прозрачность узора: ${formatRatio(pattern.opacity)}`);
    out.push(
      `Размещение узора: ${PATTERN_PLACEMENT_LABELS[pattern.placement as PatternPlacement] ?? pattern.placement}`,
    );
  } else {
    out.push("Узор: нет");
  }

  const text = appearance.textDecoration;
  const safeText = (text?.text ?? "").trim();
  if (text?.enabled && safeText) {
    out.push(`Текст: «${safeText}»`);
    out.push(`Цвет текста: ${text.colorHex}`);
    out.push(`Размер текста: ${text.size} мм`);
    out.push(
      `Расположение текста: ${TEXT_PLACEMENT_LABELS[text.placement as TextPlacement] ?? text.placement}`,
    );
  } else {
    out.push("Текстовый декор: нет");
  }

  return out;
}

function formatRatio(value: number): string {
  // 0..1 ratio formatted as a decimal with at most 2 digits — keeps the copy
  // output stable across locales (no thin spaces, no commas as decimal sep).
  if (!Number.isFinite(value)) return "—";
  return Number(value.toFixed(2)).toString();
}

function formatScale(value: number): string {
  if (!Number.isFinite(value)) return "—";
  // Scale is 0.5..5; one decimal is enough resolution.
  return Number(value.toFixed(1)).toString();
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}
