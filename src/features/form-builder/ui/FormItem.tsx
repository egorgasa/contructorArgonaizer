"use client";

import { ReactNode } from "react";
import type { FormField } from "../types/field";

interface FormItemProps {
  field: FormField;
  htmlFor?: string;
  error?: string;
  // For checkbox-like fields we render the label next to the control,
  // not above it. The renderer can opt into that layout via `inlineLabel`.
  inlineLabel?: boolean;
  children: ReactNode;
}

// FormItem owns the field's *internal* layout (label, description, error)
// but NOT its grid placement — FormRenderer wraps each field in its own
// grid cell with the correct col-span. Keeping FormItem free of grid
// classes prevents stale double-spanning after Slice 7's layout refactor.
export function FormItem({ field, htmlFor, error, inlineLabel, children }: FormItemProps) {
  if (inlineLabel) {
    return (
      <div>
        <div className="flex items-start gap-2">
          {children}
          <div className="min-w-0">
            <label
              htmlFor={htmlFor}
              className="block text-sm font-medium text-gray-900"
            >
              {field.label}
              {field.required ? <span className="ml-0.5 text-red-600">*</span> : null}
            </label>
            {field.description ? (
              <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>
            ) : null}
          </div>
        </div>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-sm font-medium text-gray-900"
      >
        {field.label}
        {field.required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      {field.description ? (
        <p className="mb-1 text-xs text-gray-500">{field.description}</p>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
