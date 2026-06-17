"use client";

import { Select } from "@/components/ui/Select";
import { FormItem } from "../../ui/FormItem";
import type { SelectField as SelectFieldSchema } from "../../types/field";

interface Props {
  field: SelectFieldSchema;
  value: string | null | undefined;
  error?: string;
  onChange: (value: string) => void;
}

export function SelectField({ field, value, error, onChange }: Props) {
  return (
    <FormItem field={field} htmlFor={field.id} error={error}>
      <Select
        id={field.id}
        value={value ?? ""}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {field.placeholder ?? "Select an option"}
        </option>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </FormItem>
  );
}
