"use client";

import type { FormField } from "../types/field";
import type { FieldValue } from "../types/submission";
import { FIELD_RENDERERS } from "./registry";

interface Props {
  field: FormField;
  value: FieldValue;
  error?: string;
  onChange: (value: FieldValue) => void;
}

// FieldRenderer is a dumb dispatcher: it picks the renderer for the field
// type from the registry and forwards props. No business logic here.
// Adding a new field type does not require touching this file.
export function FieldRenderer({ field, value, error, onChange }: Props) {
  // The mapped registry guarantees a renderer per FormFieldType, but a
  // runtime indexed lookup loses the discriminant link between `field.type`
  // and the renderer's `FieldByType<T>`. We widen the renderer's signature
  // at the dispatch boundary; the field is statically a FormField member.
  const Renderer = FIELD_RENDERERS[field.type] as React.ComponentType<{
    field: FormField;
    value: FieldValue;
    error?: string;
    onChange: (value: FieldValue) => void;
  }>;

  return <Renderer field={field} value={value} error={error} onChange={onChange} />;
}
