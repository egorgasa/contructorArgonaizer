"use client";

import type { StaticTextField } from "../../types/field";

interface Props {
  field: StaticTextField;
}

// Display-only block. Does not call onChange and does not write to values.
// Rendered without a FormItem wrapper so it doesn't show a "required *" mark.
// Layout (grid cell + width) is owned by FormRenderer.
export function StaticTextBlock({ field }: Props) {
  return <p className="text-sm text-gray-700">{field.content}</p>;
}
