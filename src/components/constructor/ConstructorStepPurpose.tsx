"use client";

import { useFormContext } from "react-hook-form";
import { USAGE_ENVIRONMENTS } from "@/lib/constants";
import { Textarea } from "@/components/ui/Textarea";
import type { PrintRequestInput } from "@/lib/validations/print-request";

export function ConstructorStepPurpose() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<PrintRequestInput>();

  const usage = watch("usageEnvironment") ?? [];

  const toggleEnv = (value: string) => {
    const next = usage.includes(value)
      ? usage.filter((v) => v !== value)
      : [...usage, value];
    setValue("usageEnvironment", next, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-gray-900">Где и для чего</h2>
      <p className="mb-6 text-sm text-gray-600">
        Чем подробнее опишете, тем точнее мы подберём материал и форму.
      </p>

      <label className="mb-2 block text-sm font-medium text-gray-800">
        Назначение изделия <span className="text-red-500">*</span>
      </label>
      <Textarea
        placeholder="Например: держать ручки и стикеры на рабочем столе"
        invalid={!!errors.purpose}
        {...register("purpose")}
      />
      {errors.purpose && (
        <div className="mt-1 text-sm text-red-600">{errors.purpose.message as string}</div>
      )}

      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-gray-800">
          Условия использования <span className="text-red-500">*</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {USAGE_ENVIRONMENTS.map((env) => {
            const active = usage.includes(env.value);
            return (
              <label
                key={env.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                  active
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={active}
                  onChange={() => toggleEnv(env.value)}
                />
                <span className="text-gray-800">{env.label}</span>
              </label>
            );
          })}
        </div>
        {errors.usageEnvironment && (
          <div className="mt-1 text-sm text-red-600">
            {errors.usageEnvironment.message as string}
          </div>
        )}
      </div>
    </div>
  );
}
