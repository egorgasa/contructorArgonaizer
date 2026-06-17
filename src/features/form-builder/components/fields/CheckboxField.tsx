"use client";

import { Checkbox } from "../../ui/Checkbox";
import { FormItem } from "../../ui/FormItem";
import type { CheckboxField as CheckboxFieldSchema } from "../../types/field";

interface Props {
  field: CheckboxFieldSchema;
  value: boolean | null | undefined;
  error?: string;
  onChange: (value: boolean) => void;
}

export function CheckboxField({ field, value, error, onChange }: Props) {
  return (
    <FormItem field={field} htmlFor={field.id} error={error} inlineLabel>
      <Checkbox
        id={field.id}
        checked={Boolean(value)}
        invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.checked)}
      />
    </FormItem>
  );
}
