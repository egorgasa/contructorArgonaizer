"use client";

import { Input } from "@/components/ui/Input";
import { FormItem } from "../../ui/FormItem";
import type { NumberField as NumberFieldSchema } from "../../types/field";

interface Props {
  field: NumberFieldSchema;
  // We accept null/undefined for "empty"; emitted as null when cleared.
  value: number | null | undefined;
  error?: string;
  onChange: (value: number | null) => void;
}

export function NumberField({ field, value, error, onChange }: Props) {
  // Controlled <input type="number"> requires a string for an empty value
  // to keep the input clearable.
  const displayValue =
    value === null || value === undefined || Number.isNaN(value) ? "" : String(value);

  return (
    <FormItem field={field} htmlFor={field.id} error={error}>
      <Input
        id={field.id}
        type="number"
        value={displayValue}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        step={field.step}
        invalid={Boolean(error)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          const next = Number(raw);
          onChange(Number.isNaN(next) ? null : next);
        }}
      />
    </FormItem>
  );
}
