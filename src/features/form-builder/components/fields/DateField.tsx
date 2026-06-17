"use client";

import { Input } from "@/components/ui/Input";
import { FormItem } from "../../ui/FormItem";
import type { DateField as DateFieldSchema } from "../../types/field";

interface Props {
  field: DateFieldSchema;
  value: string | null | undefined;
  error?: string;
  onChange: (value: string) => void;
}

export function DateField({ field, value, error, onChange }: Props) {
  return (
    <FormItem field={field} htmlFor={field.id} error={error}>
      <Input
        id={field.id}
        type="date"
        value={value ?? ""}
        min={field.min}
        max={field.max}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormItem>
  );
}
