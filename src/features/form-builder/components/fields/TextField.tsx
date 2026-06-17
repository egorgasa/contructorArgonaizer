"use client";

import { Input } from "@/components/ui/Input";
import { FormItem } from "../../ui/FormItem";
import type { TextField as TextFieldSchema } from "../../types/field";

interface Props {
  field: TextFieldSchema;
  value: string | null | undefined;
  error?: string;
  onChange: (value: string) => void;
}

export function TextField({ field, value, error, onChange }: Props) {
  return (
    <FormItem field={field} htmlFor={field.id} error={error}>
      <Input
        id={field.id}
        type="text"
        value={value ?? ""}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormItem>
  );
}
