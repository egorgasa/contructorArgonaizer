// Discriminated-union of all field types supported by the form builder.
// Slice 1 implemented: text, textarea, number, checkbox, select.
// Slice 2 adds: date, radio, image, color, staticText, heading, divider.

export type FieldId = string;

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "date"
  | "radio"
  | "image"
  | "color"
  | "staticText"
  | "heading"
  | "divider";

// Per-field print overrides. Optional — when absent, the field prints with
// its default label and is included in the printable view.
export interface FormFieldPrintOptions {
  visible?: boolean;
  label?: string;
}

export interface FormFieldBase {
  id: FieldId;
  type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  order: number;
  width?: "full" | "half";
  print?: FormFieldPrintOptions;
}

export interface TextField extends FormFieldBase {
  type: "text";
  maxLength?: number;
}

export interface TextareaField extends FormFieldBase {
  type: "textarea";
  rows?: number;
  maxLength?: number;
}

export interface NumberField extends FormFieldBase {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectField extends FormFieldBase {
  type: "select";
  options: SelectOption[];
}

export interface CheckboxField extends FormFieldBase {
  type: "checkbox";
  defaultChecked?: boolean;
}

export interface DateField extends FormFieldBase {
  type: "date";
  min?: string; // ISO yyyy-mm-dd
  max?: string;
}

export interface RadioOption {
  label: string;
  value: string;
}

export interface RadioField extends FormFieldBase {
  type: "radio";
  options: RadioOption[];
}

export type ImageMimeType = string;

export interface ImageField extends FormFieldBase {
  type: "image";
  accept?: ImageMimeType[];
  maxSizeMb?: number;
}

export interface ColorField extends FormFieldBase {
  type: "color";
}

// Display-only blocks. They are part of the schema for layout/print, but
// do not collect input and never write to FormValues.
export interface StaticTextField extends FormFieldBase {
  type: "staticText";
  content: string;
}

export interface HeadingField extends FormFieldBase {
  type: "heading";
  level?: 1 | 2 | 3;
}

export interface DividerField extends FormFieldBase {
  type: "divider";
}

export type FormField =
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | CheckboxField
  | DateField
  | RadioField
  | ImageField
  | ColorField
  | StaticTextField
  | HeadingField
  | DividerField;

// Helper: narrow the union by discriminant.
export type FieldByType<T extends FormFieldType> = Extract<FormField, { type: T }>;
