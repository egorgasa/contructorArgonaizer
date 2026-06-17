"use client";

import { FormItem } from "../../ui/FormItem";
import { RadioGroup } from "../../ui/RadioGroup";
import type { RadioField as RadioFieldSchema } from "../../types/field";

interface Props {
  field: RadioFieldSchema;
  value: string | null | undefined;
  error?: string;
  onChange: (value: string) => void;
}

export function RadioField({ field, value, error, onChange }: Props) {
  return (
    <FormItem field={field} htmlFor={field.id} error={error}>
      <RadioGroup
        name={field.id}
        value={value}
        options={field.options}
        invalid={Boolean(error)}
        onChange={onChange}
      />
    </FormItem>
  );
}
