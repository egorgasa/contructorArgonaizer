"use client";

import { Textarea } from "@/components/ui/Textarea";
import { FormItem } from "../../ui/FormItem";
import type { TextareaField as TextareaFieldSchema } from "../../types/field";

interface Props {
  field: TextareaFieldSchema;
  value: string | null | undefined;
  error?: string;
  onChange: (value: string) => void;
}

export function TextareaField({ field, value, error, onChange }: Props) {
  return (
    <FormItem field={field} htmlFor={field.id} error={error}>
      <Textarea
        id={field.id}
        value={value ?? ""}
        placeholder={field.placeholder}
        rows={field.rows}
        maxLength={field.maxLength}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormItem>
  );
}
