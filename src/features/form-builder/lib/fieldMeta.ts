import type { FormFieldType } from "../types/field";

// Pure, UI-free metadata per field type. Lives in `lib/` so non-UI layers
// (validation, persistence, future server code) can consume it without
// pulling in React. The renderer registry composes this with components
// in `components/registry.ts`.

export interface FieldMeta<T extends FormFieldType> {
  type: T;
  label: string;
  // false for display-only blocks (staticText, heading, divider).
  // Used by validation to skip non-input fields and by the palette
  // to split the layout/inputs groups.
  isInput: boolean;
}

// One typed entry per FormFieldType. The mapped type ensures that adding
// a new member to FormFieldType forces an entry here at compile time.
export const FIELD_META: { [T in FormFieldType]: FieldMeta<T> } = {
  text: { type: "text", label: "Text", isInput: true },
  textarea: { type: "textarea", label: "Textarea", isInput: true },
  number: { type: "number", label: "Number", isInput: true },
  checkbox: { type: "checkbox", label: "Checkbox", isInput: true },
  select: { type: "select", label: "Select", isInput: true },
  date: { type: "date", label: "Date", isInput: true },
  radio: { type: "radio", label: "Radio group", isInput: true },
  image: { type: "image", label: "Image", isInput: true },
  color: { type: "color", label: "Color", isInput: true },
  staticText: { type: "staticText", label: "Text block", isInput: false },
  heading: { type: "heading", label: "Heading", isInput: false },
  divider: { type: "divider", label: "Divider", isInput: false },
};

// Stable order for palette / iteration. The builder slice and any future
// UI that lists field types should derive ordering from here, not hardcode.
export const PALETTE_ORDER: FormFieldType[] = [
  "heading",
  "staticText",
  "divider",
  "text",
  "textarea",
  "number",
  "select",
  "radio",
  "checkbox",
  "date",
  "image",
  "color",
];
