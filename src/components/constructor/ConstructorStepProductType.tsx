"use client";

import { useFormContext } from "react-hook-form";
import { PRODUCT_TYPES } from "@/lib/constants";
import type { PrintRequestInput } from "@/lib/validations/print-request";

export function ConstructorStepProductType() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<PrintRequestInput>();
  const selected = watch("productType");

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Что мы делаем?</h2>
      <p className="mb-6 text-sm text-gray-600">
        Выберите тип изделия — это поможет нам подобрать правильные вопросы.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRODUCT_TYPES.map((t) => {
          const isActive = selected === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() =>
                setValue("productType", t.value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className={`rounded-xl border p-4 text-left transition ${
                isActive
                  ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="text-base font-semibold text-gray-900">{t.label}</div>
              <div className="mt-1 text-xs text-gray-600">{t.description}</div>
            </button>
          );
        })}
      </div>

      {errors.productType && (
        <div className="mt-3 text-sm text-red-600">{errors.productType.message as string}</div>
      )}
    </div>
  );
}
