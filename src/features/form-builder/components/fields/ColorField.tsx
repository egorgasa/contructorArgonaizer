"use client";

import { FormItem } from "../../ui/FormItem";
import type { ColorField as ColorFieldSchema } from "../../types/field";

interface Props {
  field: ColorFieldSchema;
  value: string | null | undefined;
  error?: string;
  onChange: (value: string) => void;
}

// Color picker is a thin wrapper over native <input type="color">. The
// native control already insists on a non-empty hex string, so we treat
// "empty" as "user hasn't interacted yet" and show #000000 in the picker
// while still keeping null/undefined as the stored value.
export function ColorField({ field, value, error, onChange }: Props) {
  const display = typeof value === "string" && value !== "" ? value : "#000000";
  const hasValue = typeof value === "string" && value !== "";

  return (
    <FormItem field={field} htmlFor={field.id} error={error}>
      <div className="flex items-center gap-3">
        <input
          id={field.id}
          type="color"
          value={display}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
        />
        <span className="font-mono text-sm text-gray-700">
          {hasValue ? display.toUpperCase() : "—"}
        </span>
      </div>
    </FormItem>
  );
}
