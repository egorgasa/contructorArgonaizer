import type {
  CheckboxField,
  DividerField,
  FormField,
  HeadingField,
  StaticTextField,
} from "../types/field";

// Capability predicates over the discriminated FormField union.
// They narrow `field` so callers don't need casts.

export type DisplayBlock = StaticTextField | HeadingField | DividerField;

export function isDisplayBlock(field: FormField): field is DisplayBlock {
  return (
    field.type === "staticText" ||
    field.type === "heading" ||
    field.type === "divider"
  );
}

// Fields that semantically support a `placeholder` shown inside the input.
export type FieldWithPlaceholder = Extract<
  FormField,
  { type: "text" | "textarea" | "number" | "select" }
>;

export function hasPlaceholder(field: FormField): field is FieldWithPlaceholder {
  return (
    field.type === "text" ||
    field.type === "textarea" ||
    field.type === "number" ||
    field.type === "select"
  );
}

// Fields that carry an `options` array.
export type FieldWithOptions = Extract<FormField, { type: "select" | "radio" }>;

export function hasOptions(field: FormField): field is FieldWithOptions {
  return field.type === "select" || field.type === "radio";
}

// Checkbox is laid out differently in canvas (inline label) — exposed
// as its own predicate to avoid scattering string comparisons.
export function isCheckbox(field: FormField): field is CheckboxField {
  return field.type === "checkbox";
}
