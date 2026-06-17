"use client";

import type { DividerField } from "../../types/field";

interface Props {
  field: DividerField;
}

// Layout (grid cell + width) is owned by FormRenderer.
export function DividerBlock({ field: _field }: Props) {
  void _field;
  return <hr className="border-t border-gray-200" />;
}
