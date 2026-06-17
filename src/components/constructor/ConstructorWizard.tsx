"use client";

import { useCallback, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  printRequestSchema,
  STEP_FIELDS,
  type PrintRequestInput,
} from "@/lib/validations/print-request";
import { createDefaultAppearance } from "@/lib/appearance";
import { createDefaultDesign, type DesignElement } from "@/lib/design";
import { createDefaultLid } from "@/lib/lid";
import { buildConstructorVisualScene } from "@/lib/constructor-visual-scene";
import { buildManufacturabilityChecks } from "@/lib/constructor-manufacturability";
import {
  buildRequestSuccessSummary,
  storeRequestSuccessSummary,
} from "@/lib/request-success-summary";
import { Button } from "@/components/ui/Button";
import { ConstructorStepProductType } from "./ConstructorStepProductType";
import { ConstructorPresetPicker } from "./ConstructorPresetPicker";
import { ConstructorStepPurpose } from "./ConstructorStepPurpose";
import { ConstructorStepDimensions } from "./ConstructorStepDimensions";
import { ConstructorStepMaterial } from "./ConstructorStepMaterial";
import { ConstructorStepFeatures } from "./ConstructorStepFeatures";
import { ConstructorStepComment } from "./ConstructorStepComment";
import { ConstructorStepReview } from "./ConstructorStepReview";
import { ProductPreviewTabs } from "./ProductPreviewTabs";
import { ManufacturabilityPanel } from "./ManufacturabilityPanel";
import type { PendingFile } from "./FileUploader";

type StepKey = keyof typeof STEP_FIELDS;

const STEPS: { key: StepKey; title: string }[] = [
  { key: "productType", title: "Тип изделия" },
  { key: "purpose", title: "Назначение" },
  { key: "dimensions", title: "Размеры и форма" },
  { key: "material", title: "Материал и цвет" },
  { key: "features", title: "Дополнительно" },
  { key: "comment", title: "Комментарий" },
  { key: "review", title: "Проверка" },
];

const DEFAULTS: PrintRequestInput = {
  productType: "" as PrintRequestInput["productType"],
  purpose: "",
  usageEnvironment: [],
  widthMm: 180,
  depthMm: 120,
  heightMm: 60,
  wallThicknessMm: 2.0,
  shape: "rectangular",
  cornerRadiusMm: 0,
  material: "",
  color: "",
  strength: "standard",
  sectionsCount: 0,
  hasHoles: false,
  holesDescription: "",
  hasFasteners: false,
  fastenersDescription: "",
  hasDecoration: false,
  decorationDescription: "",
  referenceDescription: "",
  optionalReferenceLinks: "",
  clientComment: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  preferredContactTime: "any",
  consentPersonalData: false,
  // Visual layer — sync'd from material/color in ConstructorStepMaterial.
  appearance: createDefaultAppearance(),
  // Top-view design layer — base shape kind + overlay/engrave/cutout
  // elements. Mirrored to/from the legacy shape/cornerRadius/width/depth
  // fields by ConstructorStepDimensions.
  design: createDefaultDesign(),
  // Constructive accessories (handles). Empty by default; populated in the
  // Features step. Flows straight into the submit payload via JSON.stringify.
  accessories: [],
  // Lid configuration — disabled by default; toggled in the Features step.
  lid: createDefaultLid(),
};

export function ConstructorWizard() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  // Controlled disclosure for the mobile preview block. We mount the canvas
  // only when the user opens it — avoids spinning up a WebGL context on
  // phones for users who never look at the preview, and prevents the form
  // from "jumping" by reserving collapsed height with a stable summary row.
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  // UI-only selection shared between the design-elements editor (features step)
  // and the design preview tab. Never written to form state or the payload.
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );

  const methods = useForm<PrintRequestInput>({
    resolver: zodResolver(printRequestSchema),
    mode: "onChange",
    defaultValues: DEFAULTS,
  });

  const currentStep = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  const watched = methods.watch();
  // Derived on every render (NOT memoized) for the same reason as `scene`
  // below: react-hook-form mutates nested values (`watched.appearance`,
  // `watched.design`) in place, keeping the SAME object reference across edits.
  // A useMemo keyed on those references never recomputes when only a nested
  // field changes (e.g. colour or pattern with no dimension change), so the 3D
  // body's `appearance` would stay stale until a tab remount. Building this
  // plain object each render is cheap and keeps the 3D viewer live.
  const previewProps = {
    shape: watched.shape || "rectangular",
    widthMm: Number(watched.widthMm) || 0,
    depthMm: Number(watched.depthMm) || 0,
    heightMm: Number(watched.heightMm) || 0,
    wallThicknessMm: Number(watched.wallThicknessMm) || 0,
    cornerRadiusMm: Number(watched.cornerRadiusMm) || 0,
    sectionsCount: Number(watched.sectionsCount) || 0,
    // Forwarded to ProductModel3D — drives mesh colour and (later layers)
    // material finish / opacity / patterns. ProductModel3D defends against
    // missing / malformed values internally.
    appearance: watched.appearance,
    // Forwarded to <DesignPreview /> (the "Дизайн" tab) — top-view base
    // shape + overlay/engrave/cutout element list.
    design: watched.design,
    // Legacy mounting flags — DesignPreview shows them schematically.
    hasHoles: !!watched.hasHoles,
    hasFasteners: !!watched.hasFasteners,
  };

  // Unified visual scene — the single derived view model every preview reads
  // from. Derived on every render (not memoized): react-hook-form mutates the
  // nested form values *in place*, so `watched.design` / `watched.appearance`
  // keep the SAME object reference across edits. A useMemo keyed on those
  // references would never recompute, freezing the preview — drag/resize, colour
  // and pattern would only appear after a tab remount. The builder is a cheap,
  // pure transform, so deriving it each render keeps Design / 2D / 3D and the
  // Review summary in lockstep with the live form. It is read-only and never
  // written back to form state or the payload.
  const scene = buildConstructorVisualScene(watched);

  // Non-blocking printability recommendations, derived from the live form +
  // scene on every render (NOT memoized — same in-place-mutation reason as the
  // scene above). Read-only UI hints: never written to form state or the
  // submit payload.
  const manufacturabilityChecks = buildManufacturabilityChecks({
    data: watched,
    scene,
  });

  // Patch a single design element in place (used by drag-to-position in the
  // preview). Reads/writes form state directly so the change lands in the
  // payload; selection itself stays UI-only.
  const updateDesignElement = useCallback(
    (id: string, patch: Partial<DesignElement>) => {
      const current = (methods.getValues("design.elements") ??
        []) as unknown as DesignElement[];
      const next = current.map((el) =>
        el.id === id ? { ...el, ...patch } : el,
      );
      methods.setValue("design.elements", next, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [methods],
  );

  const goNext = async () => {
    const fields = STEP_FIELDS[currentStep.key] as readonly (keyof PrintRequestInput)[];
    const ok = await methods.trigger(fields as (keyof PrintRequestInput)[], {
      shouldFocus: true,
    });
    if (!ok) return;
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => setStepIdx((i) => Math.max(i - 1, 0));

  const submit = methods.handleSubmit(async (data) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        // Friendlier Russian copy: a 422 means the data didn't pass server
        // validation, anything else is treated as a generic send failure.
        const fallback =
          res.status === 422
            ? "Не удалось отправить заявку: проверьте правильность заполнения полей."
            : "Не удалось отправить заявку. Попробуйте ещё раз.";
        throw new Error(json?.error && res.status !== 422 ? json.error : fallback);
      }
      const result = (await res.json()) as { id: string; publicNumber: string };

      // Save a safe, derived summary for the success page BEFORE we navigate
      // away. No raw payload / image data / contacts are stored — only labels,
      // dimensions and yes/no flags. Best-effort: storage failure never blocks
      // the redirect.
      storeRequestSuccessSummary(
        buildRequestSuccessSummary(data, result.publicNumber),
      );

      // If client added attachments, push them now. We don't block the redirect
      // on upload failure: the request itself is saved, and we surface a soft
      // warning to the user via the success page query.
      let uploadWarning: string | null = null;
      if (pendingFiles.length > 0) {
        try {
          const form = new FormData();
          for (const pf of pendingFiles) {
            form.append("files", pf.file, pf.file.name);
          }
          const uploadRes = await fetch(`/api/requests/${result.id}/files`, {
            method: "POST",
            body: form,
          });
          if (!uploadRes.ok) {
            const j = await uploadRes.json().catch(() => ({}));
            uploadWarning = j?.error ?? "Часть файлов не удалось загрузить.";
          }
        } catch {
          uploadWarning = "Часть файлов не удалось загрузить.";
        }
      }

      const successParams = new URLSearchParams({ number: result.publicNumber });
      if (uploadWarning) successParams.set("upload_warning", uploadWarning);
      router.push(`/request/success?${successParams.toString()}`);
    } catch (err) {
      // A `TypeError` from fetch means the request never reached the server
      // (offline / DNS / CORS) — show a connection-specific hint. Our own
      // thrown errors already carry user-facing Russian copy. The form state is
      // left untouched so the user keeps everything they entered.
      const message =
        err instanceof TypeError
          ? "Не удалось связаться с сервером. Проверьте подключение и попробуйте снова."
          : err instanceof Error
            ? err.message
            : "Неизвестная ошибка. Попробуйте ещё раз.";
      setSubmitError(message);
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={submit} noValidate>
        <ProgressBar steps={STEPS} current={stepIdx} />

        {/*
          Mobile: collapsible preview (3D/2D tabs) before the step content.
          Controlled (not a bare <details>) so we can lazy-mount the canvas —
          R3F would otherwise allocate a WebGL context on mount regardless of
          visibility.
        */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePreviewOpen((v) => !v)}
            aria-expanded={mobilePreviewOpen}
            className="flex w-full cursor-pointer select-none items-center justify-between font-medium text-gray-800"
          >
            <span>Схема изделия</span>
            <span aria-hidden="true" className="text-gray-500">
              {mobilePreviewOpen ? "▲" : "▼"}
            </span>
          </button>
          {mobilePreviewOpen && (
            <div className="mt-3">
              <ProductPreviewTabs
                productType={watched.productType}
                {...previewProps}
                scene={scene}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElement={updateDesignElement}
              />
              <div className="mt-3">
                <ManufacturabilityPanel checks={manufacturabilityChecks} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:gap-6 lg:mt-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            {currentStep.key === "productType" && (
              <>
                <ConstructorPresetPicker
                  onApplied={() => setSelectedElementId(null)}
                />
                <ConstructorStepProductType />
              </>
            )}
            {currentStep.key === "purpose" && <ConstructorStepPurpose />}
            {currentStep.key === "dimensions" && <ConstructorStepDimensions />}
            {currentStep.key === "material" && <ConstructorStepMaterial />}
            {currentStep.key === "features" && (
              <ConstructorStepFeatures
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
              />
            )}
            {currentStep.key === "comment" && (
              <ConstructorStepComment
                files={pendingFiles}
                onFilesChange={setPendingFiles}
                disabled={submitting}
              />
            )}
            {currentStep.key === "review" && <ConstructorStepReview />}
          </div>

          <aside className="hidden space-y-4 lg:sticky lg:top-4 lg:block lg:self-start">
            <ProductPreviewTabs
              productType={watched.productType}
              {...previewProps}
              scene={scene}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElement={updateDesignElement}
            />
            <ManufacturabilityPanel checks={manufacturabilityChecks} />
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600">
              <div className="mb-1 font-medium text-gray-800">Подсказка</div>
              Это упрощённая схема. Точную модель подготовит оператор после получения заявки.
            </div>
          </aside>
        </div>

        {submitError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="secondary"
            onClick={goBack}
            disabled={isFirst || submitting}
            className="w-full sm:w-auto"
          >
            ← Назад
          </Button>
          {isLast ? (
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Отправляем..." : "Отправить заявку"}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={submitting} className="w-full sm:w-auto">
              Далее →
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

function ProgressBar({
  steps,
  current,
}: {
  steps: { key: string; title: string }[];
  current: number;
}) {
  const pct = Math.round(((current + 1) / steps.length) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          Шаг {current + 1} из {steps.length}: <strong className="text-gray-900">{steps[current].title}</strong>
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
