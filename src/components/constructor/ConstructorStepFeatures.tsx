"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SECTIONS_LIMITS } from "@/lib/constants";
import type { PrintRequestInput } from "@/lib/validations/print-request";
import {
  DEFAULT_PATTERN_HEX,
  DEFAULT_TEXT_HEX,
  HEX_COLOR_RE,
  PATTERN_PLACEMENTS,
  TEXT_PLACEMENTS,
  type PatternPlacement,
  type PatternType,
  type TextPlacement,
} from "@/lib/appearance";
import {
  countElementsBySource,
  createDecorElement,
  createFastenerElements,
  createHoleElement,
  createTextDecorationElement,
  elementSource,
  type DesignElement,
} from "@/lib/design";
import { DesignElementsEditor } from "./DesignElementsEditor";
import {
  ACCESSORY_SIDES,
  ACCESSORY_SIDE_LABELS,
  HANDLE_PROFILES,
  HANDLE_PROFILE_LABELS,
  createHandleAccessory,
  type Accessory,
  type AccessorySide,
  type HandleProfile,
} from "@/lib/accessories";
import {
  LID_TYPES,
  LID_TYPE_LABELS,
  LID_FITS,
  LID_FIT_LABELS,
  type LidFit,
  type LidType,
} from "@/lib/lid";

/** Pattern catalogue rendered as cards. `custom` is intentionally omitted —
 *  it's reserved for future upload flows (logos, raster textures) and isn't
 *  selectable from the procedural-pattern picker. */
const PATTERN_CARDS: ReadonlyArray<{
  value: Exclude<PatternType, "custom">;
  label: string;
  hint: string;
}> = [
  { value: "none", label: "Без узора", hint: "Гладкая поверхность" },
  { value: "stripes", label: "Полоски", hint: "Диагональные линии" },
  { value: "dots", label: "Точки", hint: "Регулярные кружки" },
  { value: "grid", label: "Сетка", hint: "Квадратная решётка" },
  { value: "honeycomb", label: "Соты", hint: "Гексагональные ячейки" },
  { value: "waves", label: "Волны", hint: "Синусоидальные линии" },
];

const PLACEMENT_LABELS: Record<PatternPlacement, string> = {
  all: "Везде",
  front: "Перед",
  sides: "Боковые",
  top: "Сверху",
};

const TEXT_PLACEMENT_LABELS: Record<TextPlacement, string> = {
  front: "Перед",
  back: "Зад",
  left: "Слева",
  right: "Справа",
  top: "Сверху",
};

/** Maximum length of the decorative text — matches the Zod schema. */
const TEXT_MAX_LEN = 40;

/**
 * Default normalized top-view centre for the bridged text element, keyed by the
 * chosen 3D face. Mirrors `textDecorationPosition` in the scene builder but in
 * [0..1] element space: front sits near the front edge, back near the back, the
 * sides toward their edge, and top dead-centre. Used when first creating the
 * element and when the user changes the face *without* having dragged it.
 */
const TEXT_PLACEMENT_XY: Record<TextPlacement, { x: number; y: number }> = {
  front: { x: 0.5, y: 0.8 },
  back: { x: 0.5, y: 0.2 },
  left: { x: 0.3, y: 0.5 },
  right: { x: 0.7, y: 0.5 },
  top: { x: 0.5, y: 0.5 },
};

/** Tolerance for "has the user moved the text element off its face default?" */
const TEXT_POSITION_EPS = 0.001;

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) < TEXT_POSITION_EPS;
}

/**
 * Safe default opacity applied the first time a pattern is switched on. The
 * schema default is 1 (fully opaque), which makes the pattern blanket the base
 * colour and *looks* like the colour was reset. Dropping to a translucent value
 * keeps both the base colour and the pattern visible. Only applied when the
 * current opacity is in the "too high to see the colour" band, so a user who
 * deliberately raised it isn't overridden.
 */
const SAFE_PATTERN_OPACITY = 0.3;
/** Opacity at/above which the pattern visibly swallows the base colour. */
const PATTERN_OPACITY_WARN = 0.9;

interface ConstructorStepFeaturesProps {
  /** Selected design element id (UI-only). Threaded from the wizard so the
   *  editor and the design preview stay in sync. */
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
}

export function ConstructorStepFeatures({
  selectedElementId,
  onSelectElement,
}: ConstructorStepFeaturesProps = {}) {
  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<PrintRequestInput>();

  const hasHoles = watch("hasHoles");
  const hasFasteners = watch("hasFasteners");
  const hasDecoration = watch("hasDecoration");

  // Read the freshest design.elements list. The schema types this against the
  // validation input, so we cast through `unknown` (legacy/partial payloads may
  // not carry it yet) — same pattern as DesignElementsBlock below.
  const readDesignElements = (): DesignElement[] => {
    const raw = getValues("design.elements");
    return Array.isArray(raw) ? (raw as unknown as DesignElement[]) : [];
  };

  // Enabling "holes" auto-creates one system hole element (a circular cutout)
  // and selects it so it's immediately editable on the Design tab; disabling
  // removes every `source:"holes"` element so the payload never carries an
  // invisible orphan. The boolean field is kept in sync for the legacy summary.
  const handleHolesToggle = (checked: boolean) => {
    setValue("hasHoles", checked, { shouldDirty: true, shouldValidate: true });
    const current = readDesignElements();
    if (checked) {
      if (countElementsBySource(current, "holes") === 0) {
        const hole = createHoleElement();
        setValue("design.elements", [...current, hole], { shouldDirty: true });
        onSelectElement?.(hole.id);
      }
    } else {
      setValue(
        "design.elements",
        current.filter((el) => elementSource(el) !== "holes"),
        { shouldDirty: true },
      );
    }
  };

  // Same contract for fasteners — two circular cutout markers near the top
  // corners (MVP: fasteners are represented as mounting holes + an operator
  // note, see the description field).
  const handleFastenersToggle = (checked: boolean) => {
    setValue("hasFasteners", checked, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const current = readDesignElements();
    if (checked) {
      if (countElementsBySource(current, "fasteners") === 0) {
        const fasteners = createFastenerElements();
        setValue("design.elements", [...current, ...fasteners], {
          shouldDirty: true,
        });
        onSelectElement?.(fasteners[0]?.id ?? null);
      }
    } else {
      setValue(
        "design.elements",
        current.filter((el) => elementSource(el) !== "fasteners"),
        { shouldDirty: true },
      );
    }
  };

  // Enabling "decoration" auto-creates one editable decor element (a circular
  // overlay) and selects it so it shows up immediately on the Design tab and
  // can be dragged / restyled; disabling removes every `source:"decor"` element.
  // The free-text description stays as an operator note and the material colour
  // is never touched.
  const handleDecorationToggle = (checked: boolean) => {
    setValue("hasDecoration", checked, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const current = readDesignElements();
    if (checked) {
      if (countElementsBySource(current, "decor") === 0) {
        const decor = createDecorElement();
        setValue("design.elements", [...current, decor], {
          shouldDirty: true,
        });
        onSelectElement?.(decor.id);
      }
    } else {
      setValue(
        "design.elements",
        current.filter((el) => elementSource(el) !== "decor"),
        { shouldDirty: true },
      );
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Дополнительно</h2>
      <p className="mb-2 text-sm text-gray-600">
        Конструкция, отверстия и крепления, внешний вид. Заполняйте только то,
        что нужно — все блоки необязательны.
      </p>

      {/* ───────── Конструкция ───────── */}
      <FeatureGroup
        title="Конструкция"
        hint="Перегородки, крышка и ручки — из чего собрано изделие."
      >
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Количество секций / перегородок
          </label>
          <Input
            type="number"
            inputMode="numeric"
            min={SECTIONS_LIMITS.min}
            max={SECTIONS_LIMITS.max}
            step={1}
            invalid={!!errors.sectionsCount}
            {...register("sectionsCount", { valueAsNumber: true })}
          />
          <p className="mt-1 text-xs text-gray-500">
            1 секция — без перегородок, 3 секции — две перегородки. Секции
            делятся по ширине изделия. У органайзера и разделителя перегородки
            объёмные; у остальных типов они показаны схематично в предпросмотре.
          </p>
          {errors.sectionsCount && (
            <div className="mt-1 text-sm text-red-600">
              {errors.sectionsCount.message as string}
            </div>
          )}
        </div>

        <LidBlock />
        <HandlesBlock />
      </FeatureGroup>

      {/* ───────── Отверстия и крепления ───────── */}
      <FeatureGroup
        title="Отверстия и крепления"
        hint="Отверстия — технологические вырезы. Крепления — места под монтаж или винты."
      >
        <Toggle
          label="Отверстия / вырезы"
          checked={!!hasHoles}
          onCheckedChange={handleHolesToggle}
          active={!!hasHoles}
          description="Например: отверстие для провода, окошко, прорезь"
        />
        <p className="mt-1 text-xs text-gray-500">
          После включения отверстие появится в редакторе дизайна. Его можно
          перетащить и изменить размер.
        </p>
        {hasHoles && (
          <Textarea
            className="mt-2"
            placeholder="Опишите отверстия: расположение, размеры, форма"
            invalid={!!errors.holesDescription}
            {...register("holesDescription")}
          />
        )}
        {errors.holesDescription && (
          <div className="mt-1 text-sm text-red-600">
            {errors.holesDescription.message as string}
          </div>
        )}

        <Toggle
          label="Крепления"
          checked={!!hasFasteners}
          onCheckedChange={handleFastenersToggle}
          active={!!hasFasteners}
          description="Магниты, винты, липучки, защёлки"
        />
        <p className="mt-1 text-xs text-gray-500">
          Крепления создаются как монтажные отверстия. Их можно перемещать на
          схеме.
        </p>
        {hasFasteners && (
          <Textarea
            className="mt-2"
            placeholder="Опишите крепления и их расположение"
            invalid={!!errors.fastenersDescription}
            {...register("fastenersDescription")}
          />
        )}
        {errors.fastenersDescription && (
          <div className="mt-1 text-sm text-red-600">
            {errors.fastenersDescription.message as string}
          </div>
        )}
      </FeatureGroup>

      {/* ───────── Внешний вид ───────── */}
      <FeatureGroup
        title="Внешний вид"
        hint="Узор, текст, декор и изображения на поверхности изделия."
      >
        <Toggle
          label="Декоративный элемент"
          checked={!!hasDecoration}
          onCheckedChange={handleDecorationToggle}
          active={!!hasDecoration}
          description="Декор появится как редактируемый элемент в дизайне"
        />
        {hasDecoration && (
          <Textarea
            className="mt-2"
            placeholder="Например: надпись «Документы» на лицевой стенке"
            invalid={!!errors.decorationDescription}
            {...register("decorationDescription")}
          />
        )}
        {errors.decorationDescription && (
          <div className="mt-1 text-sm text-red-600">
            {errors.decorationDescription.message as string}
          </div>
        )}

        <PatternBlock />
        <TextDecorationBlock onSelectElement={onSelectElement} />
        <DesignElementsBlock
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
        />
      </FeatureGroup>
    </div>
  );
}

/**
 * Visual grouping wrapper for the Features step. Renders a small section header
 * + optional hint, with a divider between groups, so the long list of options
 * reads as three coherent blocks (Конструкция / Отверстия и крепления /
 * Внешний вид) instead of one flat scroll. Presentation only — no form state.
 */
function FeatureGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-gray-200 pt-5 first-of-type:mt-6 first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        {title}
      </h3>
      {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * "Ручки" — constructive side-mounted handles.
 *
 * Unlike the design-element blocks above, handles live in their own
 * `accessories` array (a separate construction model), not in `design.elements`.
 * No drag editing in this slice — side / profile / position / size are all
 * driven by selects + sliders here, and the previews (2D / 3D / Review) read the
 * handles straight off the shared scene.
 */
function HandlesBlock() {
  const { setValue, watch } = useFormContext<PrintRequestInput>();

  // react-hook-form types `watch` against the schema input; cast through
  // `unknown` so a legacy payload without `accessories` still yields an empty
  // list. setValue with a fresh array reference re-renders the previews.
  const raw = watch("accessories");
  const handles: Accessory[] = Array.isArray(raw)
    ? (raw as unknown as Accessory[])
    : [];

  const writeHandles = (next: Accessory[]) =>
    setValue("accessories", next, { shouldDirty: true });

  const addHandle = () => {
    writeHandles([...handles, createHandleAccessory()]);
  };

  const updateHandle = (id: string, patch: Partial<Accessory>) => {
    writeHandles(handles.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };

  const removeHandle = (id: string) => {
    writeHandles(handles.filter((h) => h.id !== id));
  };

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Ручки</h3>
        <button
          type="button"
          onClick={addHandle}
          className="rounded-md border border-brand-600 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
        >
          Добавить ручку
        </button>
      </div>
      <p className="mb-4 text-xs text-gray-600">
        Ручки отображаются сбоку изделия. Положение и размер задаются
        ползунками — это схематичный предпросмотр, профиль уточним в переписке.
      </p>

      {handles.length === 0 ? (
        <p className="text-xs text-gray-500">Ручки не добавлены.</p>
      ) : (
        <div className="space-y-4">
          {handles.map((handle, index) => (
            <HandleRow
              key={handle.id}
              index={index}
              handle={handle}
              onChange={(patch) => updateHandle(handle.id, patch)}
              onRemove={() => removeHandle(handle.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HandleRow({
  index,
  handle,
  onChange,
  onRemove,
}: {
  index: number;
  handle: Accessory;
  onChange: (patch: Partial<Accessory>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">Ручка {index + 1}</div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
        >
          Удалить
        </button>
      </div>

      {/* Side. */}
      <div className="mb-3">
        <div className="mb-1 text-xs font-medium text-gray-700">Сторона</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ACCESSORY_SIDES.map((side) => {
            const active = handle.side === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => onChange({ side: side as AccessorySide })}
                className={`rounded-md border px-2 py-1.5 text-sm transition ${
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                aria-pressed={active}
              >
                {ACCESSORY_SIDE_LABELS[side]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile. */}
      <div className="mb-3">
        <div className="mb-1 text-xs font-medium text-gray-700">Профиль</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {HANDLE_PROFILES.map((profile) => {
            const active = handle.profile === profile;
            return (
              <button
                key={profile}
                type="button"
                onClick={() => onChange({ profile: profile as HandleProfile })}
                className={`rounded-md border px-2 py-1.5 text-sm transition ${
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                aria-pressed={active}
              >
                {HANDLE_PROFILE_LABELS[profile]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HandleSlider
          label="Положение вдоль стороны"
          value={handle.x}
          onChange={(x) => onChange({ x })}
        />
        <HandleSlider
          label="Положение по высоте"
          value={handle.z}
          onChange={(z) => onChange({ z })}
        />
        <HandleSlider
          label="Длина"
          value={handle.length}
          min={0.05}
          onChange={(length) => onChange({ length })}
        />
        <HandleSlider
          label="Высота"
          value={handle.height}
          min={0.03}
          onChange={(height) => onChange({ height })}
        />
      </div>
    </div>
  );
}

function HandleSlider({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-mono text-gray-600">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
        aria-label={label}
      />
    </div>
  );
}

/**
 * "Крышка" — lid configuration.
 *
 * The lid is a top-level construction option (its own `lid` object on the form),
 * not an accessory and not a design element. The block writes the nested
 * `lid.*` fields via setValue; the previews (2D / 3D / Review) read the derived
 * `scene.lid`. No drag editing — toggle + selects + numeric inputs only.
 */
function LidBlock() {
  const { setValue, watch } = useFormContext<PrintRequestInput>();

  const enabled = !!watch("lid.enabled");
  const type = (watch("lid.type") ?? "flat") as LidType;
  const fit = (watch("lid.fit") ?? "overlay") as LidFit;
  const thicknessMm = Number(watch("lid.thicknessMm") ?? 3);
  const overhangMm = Number(watch("lid.overhangMm") ?? 2);
  const clearanceMm = Number(watch("lid.clearanceMm") ?? 0.5);

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-1 text-base font-semibold text-gray-900">Крышка</h3>
      <p className="mb-4 text-xs text-gray-600">
        Крышка отображается в 2D/3D и попадёт в заявку. Петли показываются
        схематично — точное прилегание уточним в переписке.
      </p>

      <Toggle
        label="Добавить крышку"
        checked={enabled}
        onCheckedChange={(checked) =>
          setValue("lid.enabled", checked, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        active={enabled}
        description="Закрывает изделие сверху"
      />

      {enabled && (
        <div className="mt-3 space-y-3">
          {/* Type. */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="mb-2 text-sm font-medium text-gray-800">Тип</div>
            <div className="grid grid-cols-3 gap-2">
              {LID_TYPES.map((t) => {
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setValue("lid.type", t, { shouldDirty: true })
                    }
                    className={`rounded-md border px-2 py-1.5 text-sm transition ${
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={active}
                  >
                    {LID_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fit. */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="mb-2 text-sm font-medium text-gray-800">Посадка</div>
            <div className="grid grid-cols-2 gap-2">
              {LID_FITS.map((f) => {
                const active = fit === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setValue("lid.fit", f, { shouldDirty: true })}
                    className={`rounded-md border px-2 py-1.5 text-sm transition ${
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={active}
                  >
                    {LID_FIT_LABELS[f]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              {fit === "overlay"
                ? "Накладная крышка выходит за габарит изделия на величину свеса."
                : "Внутренняя крышка входит внутрь корпуса с технологическим зазором."}
            </p>
          </div>

          {/* Numeric dimensions. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <LidNumber
              label="Толщина, мм"
              value={thicknessMm}
              min={0}
              max={50}
              onChange={(v) => setValue("lid.thicknessMm", v, { shouldDirty: true })}
            />
            <LidNumber
              label="Свес, мм"
              value={overhangMm}
              min={0}
              max={50}
              onChange={(v) => setValue("lid.overhangMm", v, { shouldDirty: true })}
            />
            <LidNumber
              label="Зазор, мм"
              value={clearanceMm}
              min={0}
              max={20}
              step={0.1}
              onChange={(v) => setValue("lid.clearanceMm", v, { shouldDirty: true })}
            />
          </div>

          {type === "hinged" && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
              Петли отображаются схематично.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LidNumber({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <label className="mb-1 block text-xs font-medium text-gray-700">
        {label}
      </label>
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/**
 * "Элементы дизайна" — top-view design elements (overlay / engrave / cutout).
 *
 * Lives in this step because it shares the "decoration" mental model with the
 * pattern + text blocks above. The block reads `design.elements` from form
 * state and writes back via setValue — keeps the editor stateless and lets the
 * Design preview tab react instantly.
 */
function DesignElementsBlock({
  selectedElementId,
  onSelectElement,
}: {
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
}) {
  const { setValue, watch } = useFormContext<PrintRequestInput>();

  // react-hook-form types `watch` against the schema input; cast through
  // `unknown` so a missing/legacy payload (where `design` is undefined) still
  // renders an empty list instead of crashing on `.map`.
  const elementsRaw = watch("design.elements");
  const elements: DesignElement[] = Array.isArray(elementsRaw)
    ? (elementsRaw as unknown as DesignElement[])
    : [];
  const hasHoles = !!watch("hasHoles");
  const hasFasteners = !!watch("hasFasteners");
  const hasDecoration = !!watch("hasDecoration");
  const textEnabled = !!watch("appearance.textDecoration.enabled");
  const textValue = (watch("appearance.textDecoration.text") ?? "").trim();

  const handleChange = (next: DesignElement[]) => {
    setValue("design.elements", next, { shouldDirty: true });
    // Deleting the last element of a managed kind turns its toggle off, so the
    // boolean field never claims a feature whose elements are all gone.
    if (hasHoles && countElementsBySource(next, "holes") === 0) {
      setValue("hasHoles", false, { shouldDirty: true });
    }
    if (hasFasteners && countElementsBySource(next, "fasteners") === 0) {
      setValue("hasFasteners", false, { shouldDirty: true });
    }
    if (hasDecoration && countElementsBySource(next, "decor") === 0) {
      setValue("hasDecoration", false, { shouldDirty: true });
    }
    // Deleting the bridged text element here turns the legacy text flag off.
    // Guarded on a non-empty text so clearing the input (which also removes the
    // element, but should keep the toggle on for re-typing) doesn't flip it.
    if (
      textEnabled &&
      textValue &&
      countElementsBySource(next, "textDecoration") === 0
    ) {
      setValue("appearance.textDecoration.enabled", false, { shouldDirty: true });
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-1 text-base font-semibold text-gray-900">
        Элементы дизайна
      </h3>
      <p className="mb-4 text-xs text-gray-600">
        Накладки, гравировки и сквозные вырезы поверх базовой формы.
        Предпросмотр — на вкладке «Дизайн».
      </p>
      <DesignElementsEditor
        elements={elements}
        onChange={handleChange}
        selectedElementId={selectedElementId}
        onSelectElement={onSelectElement}
      />
    </div>
  );
}

/**
 * "Рисунок и декор" — procedural-pattern picker.
 *
 * Stays inside ConstructorStepFeatures because patterns are part of the
 * decoration story the operator sees alongside the existing `hasDecoration`
 * free-text note. Selecting a non-`none` pattern flips `pattern.enabled`
 * automatically so the live 3D preview picks it up without a separate toggle.
 */
function PatternBlock() {
  const { setValue, watch } = useFormContext<PrintRequestInput>();

  const patternEnabled = !!watch("appearance.pattern.enabled");
  const patternType = (watch("appearance.pattern.type") ?? "none") as PatternType;
  const patternColorHex =
    watch("appearance.pattern.colorHex") ?? DEFAULT_PATTERN_HEX;
  const patternScale = watch("appearance.pattern.scale") ?? 1;
  const patternOpacity = watch("appearance.pattern.opacity") ?? 1;
  const patternPlacement =
    (watch("appearance.pattern.placement") ?? "all") as PatternPlacement;

  // <input type="color"> is strict about the value format. Fall back to the
  // catalogue default if the form somehow holds a malformed hex.
  const safeColor = HEX_COLOR_RE.test(patternColorHex)
    ? patternColorHex
    : DEFAULT_PATTERN_HEX;

  const choosePattern = (value: Exclude<PatternType, "custom">) => {
    // Only ever touch the nested pattern fields — never re-set the whole
    // `appearance` object, so `baseColorHex` (and every other surface setting)
    // is preserved and the colour never appears to "reset".
    setValue("appearance.pattern.type", value, { shouldDirty: true });
    // Sync enabled with the choice so users don't need a separate toggle.
    // none → off; everything else → on.
    setValue("appearance.pattern.enabled", value !== "none", {
      shouldDirty: true,
      shouldValidate: true,
    });
    // First time a pattern is switched on, soften an unsafe-high opacity so the
    // base colour stays visible underneath instead of being blanketed.
    if (value !== "none" && patternOpacity >= PATTERN_OPACITY_WARN) {
      setValue("appearance.pattern.opacity", SAFE_PATTERN_OPACITY, {
        shouldDirty: true,
      });
    }
  };

  const opacityTooHigh =
    patternEnabled && patternType !== "none" && patternOpacity >= PATTERN_OPACITY_WARN;

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-1 text-base font-semibold text-gray-900">Рисунок и декор</h3>
      <p className="mb-4 text-xs text-gray-600">
        Простые узоры на поверхности изделия. Это упрощённое превью — точную
        гравировку или вставку логотипа обсудим в личной переписке.
      </p>

      {/* ───── Pattern cards ───── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PATTERN_CARDS.map((p) => {
          const active = patternType === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => choosePattern(p.value)}
              className={`flex items-center gap-3 rounded-lg border p-2 text-left transition ${
                active
                  ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              aria-pressed={active}
            >
              <PatternSwatch type={p.value} color={safeColor} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900">
                  {p.label}
                </div>
                <div className="truncate text-[11px] text-gray-600">{p.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pattern controls — only meaningful when an actual pattern is picked. */}
      {patternEnabled && patternType !== "none" && (
        <div className="mt-4 space-y-3">
          {/* Pattern colour. */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <label
              htmlFor="pattern-color"
              className="text-sm font-medium text-gray-800"
            >
              Цвет узора:
            </label>
            <input
              id="pattern-color"
              type="color"
              value={safeColor}
              onChange={(e) =>
                setValue("appearance.pattern.colorHex", e.target.value, {
                  shouldDirty: true,
                })
              }
              className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
              aria-label="Цвет узора"
            />
            <span className="font-mono text-xs uppercase text-gray-600">
              {safeColor}
            </span>
          </div>

          {/* Scale slider. */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-sm">
              <label
                htmlFor="pattern-scale"
                className="font-medium text-gray-800"
              >
                Масштаб узора
              </label>
              <span className="font-mono text-xs text-gray-600">
                {Number(patternScale).toFixed(2)}
              </span>
            </div>
            <input
              id="pattern-scale"
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={patternScale}
              onChange={(e) =>
                setValue(
                  "appearance.pattern.scale",
                  Number(e.target.value),
                  { shouldDirty: true },
                )
              }
              className="w-full accent-brand-600"
              aria-label="Масштаб узора (0.5–5)"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-500">
              <span>мелко</span>
              <span>крупно</span>
            </div>
          </div>

          {/* Opacity slider. */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-sm">
              <label
                htmlFor="pattern-opacity"
                className="font-medium text-gray-800"
              >
                Прозрачность узора
              </label>
              <span className="font-mono text-xs text-gray-600">
                {Number(patternOpacity).toFixed(2)}
              </span>
            </div>
            <input
              id="pattern-opacity"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={patternOpacity}
              onChange={(e) =>
                setValue(
                  "appearance.pattern.opacity",
                  Number(e.target.value),
                  { shouldDirty: true },
                )
              }
              className="w-full accent-brand-600"
              aria-label="Прозрачность узора (0–1)"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-500">
              <span>еле виден</span>
              <span>насыщенно</span>
            </div>
            {opacityTooHigh && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                Высокая непрозрачность — рисунок плотно перекрывает базовый
                цвет. Уменьшите её, чтобы цвет был заметнее.
              </p>
            )}
          </div>

          {/* Placement. */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="mb-2 text-sm font-medium text-gray-800">
              Где разместить
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PATTERN_PLACEMENTS.map((p) => {
                const active = patternPlacement === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setValue("appearance.pattern.placement", p, {
                        shouldDirty: true,
                      })
                    }
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={active}
                  >
                    {PLACEMENT_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Текст на изделии" — short label preview.
 *
 * Live-controls the `appearance.textDecoration.*` form fields. Text is
 * rendered in the 3D viewport by `TextDecoration3D`; the Zod schema enforces
 * the 40-char cap and rejects empty text when the user has enabled the field,
 * so the form layer doesn't need its own validation.
 *
 * Empty text is allowed in *form state* — it only fails validation at submit
 * time. That keeps the live preview from showing a stale label while the
 * user is mid-typing or about to disable the field.
 */
function TextDecorationBlock({
  onSelectElement,
}: {
  onSelectElement?: (id: string | null) => void;
}) {
  const {
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useFormContext<PrintRequestInput>();

  const enabled = !!watch("appearance.textDecoration.enabled");
  const text = watch("appearance.textDecoration.text") ?? "";
  const colorHex =
    watch("appearance.textDecoration.colorHex") ?? DEFAULT_TEXT_HEX;
  const size = watch("appearance.textDecoration.size") ?? 16;
  const placement =
    (watch("appearance.textDecoration.placement") ?? "front") as TextPlacement;

  const safeColor = HEX_COLOR_RE.test(colorHex) ? colorHex : DEFAULT_TEXT_HEX;
  const textError = errors?.appearance?.textDecoration?.text?.message as
    | string
    | undefined;

  // ── Bridge: keep a `source:"textDecoration"` design element in sync with
  // these legacy fields so the label is a selectable / draggable element in the
  // shared visual scene (Design / 2D / 3D), without a second copy of the data.
  // All writes happen in these event handlers — never in render — so there's no
  // sync loop. The scene builder suppresses the material text layer while this
  // element exists, so there's no double render either.
  const readDesignElements = (): DesignElement[] => {
    const raw = getValues("design.elements");
    return Array.isArray(raw) ? (raw as unknown as DesignElement[]) : [];
  };
  const findTextElement = (els: DesignElement[]): DesignElement | undefined =>
    els.find((el) => elementSource(el) === "textDecoration");
  const writeElements = (next: DesignElement[]) =>
    setValue("design.elements", next, { shouldDirty: true });

  // Enabling with non-empty text creates the element (and selects it);
  // disabling removes it. Empty text on enable creates nothing — we wait for
  // the user to type so an empty label never appears in the scene.
  const handleEnabledChange = (checked: boolean) => {
    setValue("appearance.textDecoration.enabled", checked, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const els = readDesignElements();
    if (checked) {
      const value = (getValues("appearance.textDecoration.text") ?? "").trim();
      if (value && !findTextElement(els)) {
        const pos = TEXT_PLACEMENT_XY[placement];
        const el = createTextDecorationElement({
          text: value,
          fillColor: safeColor,
          x: pos.x,
          y: pos.y,
        });
        writeElements([...els, el]);
        onSelectElement?.(el.id);
      }
    } else {
      writeElements(els.filter((el) => elementSource(el) !== "textDecoration"));
    }
  };

  // Controlled <input> for text — the schema default is `null`, which HTML
  // can't bind to directly, so we coerce to "" on read and write back via
  // setValue. Typing also mirrors into the element's `text` (creating it on
  // first non-empty character) without ever resetting its position / size.
  const handleTextChange = (v: string) => {
    // Hard cap mirrors the schema; trims at the field level so paste-from-
    // clipboard doesn't briefly hold a 1000-char string in form state.
    const next = v.slice(0, TEXT_MAX_LEN);
    setValue("appearance.textDecoration.text", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const els = readDesignElements();
    const existing = findTextElement(els);
    if (next.trim()) {
      if (existing) {
        writeElements(
          els.map((el) =>
            el.id === existing.id ? { ...el, text: next } : el,
          ),
        );
      } else {
        const pos = TEXT_PLACEMENT_XY[placement];
        const el = createTextDecorationElement({
          text: next,
          fillColor: safeColor,
          x: pos.x,
          y: pos.y,
        });
        writeElements([...els, el]);
        onSelectElement?.(el.id);
      }
    } else if (existing) {
      // Cleared text → drop the element (the toggle stays on so the user can
      // keep typing); the material layer also stays hidden until text returns.
      writeElements(els.filter((el) => el.id !== existing.id));
    }
  };

  // Colour mirrors into the element's fillColor (so the top-view label and 3D
  // text agree). Position / size are left untouched.
  const handleColorChange = (v: string) => {
    setValue("appearance.textDecoration.colorHex", v, { shouldDirty: true });
    const els = readDesignElements();
    const existing = findTextElement(els);
    if (existing) {
      writeElements(
        els.map((el) =>
          el.id === existing.id ? { ...el, fillColor: v } : el,
        ),
      );
    }
  };

  // Changing the face re-centres the element to the new face default ONLY when
  // the user hasn't dragged it off the previous face default — otherwise their
  // hand-placed position is preserved.
  const handlePlacementChange = (p: TextPlacement) => {
    const prev = placement;
    setValue("appearance.textDecoration.placement", p, { shouldDirty: true });
    const els = readDesignElements();
    const existing = findTextElement(els);
    if (!existing) return;
    const prevDefault = TEXT_PLACEMENT_XY[prev];
    const untouched =
      approxEq(existing.x, prevDefault.x) && approxEq(existing.y, prevDefault.y);
    if (untouched) {
      const pos = TEXT_PLACEMENT_XY[p];
      writeElements(
        els.map((el) =>
          el.id === existing.id ? { ...el, x: pos.x, y: pos.y } : el,
        ),
      );
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-1 text-base font-semibold text-gray-900">
        Текст на изделии
      </h3>
      <p className="mb-4 text-xs text-gray-600">
        Короткая надпись на одной из граней. Текст можно переместить на схеме
        после добавления — это визуальный preview, не настоящая гравировка.
      </p>

      <Toggle
        label="Добавить текст"
        checked={enabled}
        onCheckedChange={handleEnabledChange}
        active={enabled}
        description={`До ${TEXT_MAX_LEN} символов на выбранной грани`}
      />

      {enabled && (
        <div className="mt-3 space-y-3">
          {/* Text input. */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <label
              htmlFor="text-decoration-text"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Текст
            </label>
            <input
              id="text-decoration-text"
              type="text"
              maxLength={TEXT_MAX_LEN}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Например: EGOR"
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
                textError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-gray-300 focus:border-brand-500 focus:ring-brand-100"
              }`}
              aria-invalid={!!textError}
              aria-describedby={textError ? "text-decoration-error" : undefined}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                {textError ? (
                  <span id="text-decoration-error" className="text-red-600">
                    {textError}
                  </span>
                ) : (
                  "Латиница работает; кириллица — на усмотрение шрифта"
                )}
              </span>
              <span className="font-mono text-gray-500">
                {text.length}/{TEXT_MAX_LEN}
              </span>
            </div>
          </div>

          {/* Colour. */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <label
              htmlFor="text-decoration-color"
              className="text-sm font-medium text-gray-800"
            >
              Цвет текста:
            </label>
            <input
              id="text-decoration-color"
              type="color"
              value={safeColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
              aria-label="Цвет текста"
            />
            <span className="font-mono text-xs uppercase text-gray-600">
              {safeColor}
            </span>
          </div>

          {/* Size slider (schema-defined 8..72 → millimetres of glyph height). */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-sm">
              <label
                htmlFor="text-decoration-size"
                className="font-medium text-gray-800"
              >
                Размер текста
              </label>
              <span className="font-mono text-xs text-gray-600">
                {Math.round(Number(size))} мм
              </span>
            </div>
            <input
              id="text-decoration-size"
              type="range"
              min={8}
              max={72}
              step={1}
              value={size}
              onChange={(e) =>
                setValue(
                  "appearance.textDecoration.size",
                  Number(e.target.value),
                  { shouldDirty: true },
                )
              }
              className="w-full accent-brand-600"
              aria-label="Размер текста в миллиметрах"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-500">
              <span>мелко</span>
              <span>крупно</span>
            </div>
          </div>

          {/* Placement. */}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <div className="mb-2 text-sm font-medium text-gray-800">
              Где разместить
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TEXT_PLACEMENTS.map((p) => {
                const active = placement === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePlacementChange(p)}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={active}
                  >
                    {TEXT_PLACEMENT_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tiny inline SVG swatch shown on each pattern card. Kept as SVG (not the
 * canvas helper) so it renders identically on the server and the client and
 * doesn't allocate a CanvasTexture per card / re-render. The visuals are
 * intentionally close — not identical — to the procedural texture so the
 * user gets a recognisable preview.
 */
function PatternSwatch({
  type,
  color,
}: {
  type: PatternType;
  color: string;
}) {
  const size = 40;
  if (type === "none") {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-[10px] text-gray-400"
        aria-hidden="true"
      >
        —
      </div>
    );
  }

  let content: React.ReactNode = null;
  switch (type) {
    case "stripes":
      content = (
        <g stroke={color} strokeWidth={3}>
          {[...Array(6)].map((_, i) => (
            <line
              key={i}
              x1={-10 + i * 10}
              y1={size + 10}
              x2={size + 10 + i * 10}
              y2={-10}
            />
          ))}
        </g>
      );
      break;
    case "dots":
      content = (
        <g fill={color}>
          {[...Array(3)].map((_, r) =>
            [...Array(3)].map((__, c) => (
              <circle
                key={`${r}-${c}`}
                cx={6 + c * 14}
                cy={6 + r * 14}
                r={3}
              />
            )),
          )}
        </g>
      );
      break;
    case "grid":
      content = (
        <g stroke={color} strokeWidth={1.5}>
          {[10, 20, 30].map((v) => (
            <line key={`v-${v}`} x1={v} y1={0} x2={v} y2={size} />
          ))}
          {[10, 20, 30].map((v) => (
            <line key={`h-${v}`} x1={0} y1={v} x2={size} y2={v} />
          ))}
        </g>
      );
      break;
    case "honeycomb": {
      const hex = (cx: number, cy: number, r: number) => {
        const pts: string[] = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
        }
        return pts.join(" ");
      };
      content = (
        <g stroke={color} strokeWidth={1.5} fill="none">
          <polygon points={hex(13, 13, 7)} />
          <polygon points={hex(27, 13, 7)} />
          <polygon points={hex(20, 25, 7)} />
          <polygon points={hex(13, 37, 7)} />
          <polygon points={hex(27, 37, 7)} />
        </g>
      );
      break;
    }
    case "waves":
      content = (
        <g stroke={color} strokeWidth={1.5} fill="none">
          {[10, 22, 34].map((y) => (
            <path
              key={y}
              d={`M0 ${y} Q 10 ${y - 6}, 20 ${y} T 40 ${y}`}
            />
          ))}
        </g>
      );
      break;
    case "custom":
    default:
      content = null;
      break;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="h-10 w-10 shrink-0 rounded border border-gray-300 bg-white"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}

function Toggle({
  label,
  description,
  registerProps,
  active,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  /** Uncontrolled wiring via react-hook-form. Omit when using the controlled
   *  `checked` / `onCheckedChange` pair (needed for toggles that run side
   *  effects, e.g. auto-creating design elements). */
  registerProps?: ReturnType<
    ReturnType<typeof useFormContext<PrintRequestInput>>["register"]
  >;
  active: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const controlled = onCheckedChange !== undefined;
  return (
    <label
      className={`mt-4 flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition ${
        active ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white"
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-brand-600"
        {...(controlled
          ? {
              checked: !!checked,
              onChange: (e) => onCheckedChange(e.target.checked),
            }
          : registerProps)}
      />
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-600">{description}</div>
      </div>
    </label>
  );
}
