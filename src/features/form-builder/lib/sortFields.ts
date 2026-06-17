import type { FormField } from "../types/field";

// Stable sort by `order`. Returns a new array; does not mutate input.
export function sortFields<F extends FormField>(fields: readonly F[]): F[] {
  return [...fields].sort((a, b) => a.order - b.order);
}
