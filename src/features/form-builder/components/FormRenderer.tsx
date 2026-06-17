"use client";

import { useMemo } from "react";
import type { FormField } from "../types/field";
import type { FormSchema } from "../types/schema";
import type { FieldValue, FormValues } from "../types/submission";
import { sortFields } from "../lib/sortFields";
import { isDisplayBlock } from "../lib/fieldCapabilities";
import { FieldRenderer } from "./FieldRenderer";

interface Props {
  schema: FormSchema;
  values: FormValues;
  errors?: Record<string, string>;
  onChange: (values: FormValues) => void;
}

// FormRenderer is schema-driven: it knows about FormSchema, FormValues
// and the field registry — nothing about builder, persistence, validation
// rules or routing. Layout is the only piece it owns.
//
// Layout rules:
//   - mobile: always 1 column;
//   - single-column: every field full width;
//   - two-column: input fields with `width: "half"` take 1 column,
//     everything else (full inputs + display blocks) takes both columns.
export function FormRenderer({ schema, values, errors, onChange }: Props) {
  const ordered = useMemo(() => sortFields(schema.fields), [schema.fields]);
  const twoColumn = schema.settings.layout === "two-column";

  const setFieldValue = (fieldId: string, value: FieldValue) => {
    onChange({ ...values, [fieldId]: value });
  };

  const gridClass = twoColumn
    ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
    : "grid grid-cols-1 gap-4";

  return (
    <form className={gridClass} onSubmit={(e) => e.preventDefault()} noValidate>
      {ordered.map((field) => (
        <div key={field.id} className={cellClass(field, twoColumn)}>
          <FieldRenderer
            field={field}
            value={values[field.id]}
            error={errors?.[field.id]}
            onChange={(v) => setFieldValue(field.id, v)}
          />
        </div>
      ))}
    </form>
  );
}

function cellClass(field: FormField, twoColumn: boolean): string {
  if (!twoColumn) return "col-span-1";
  // Display blocks always span the full row to keep visual rhythm.
  if (isDisplayBlock(field)) return "sm:col-span-2";
  return field.width === "half" ? "sm:col-span-1" : "sm:col-span-2";
}
