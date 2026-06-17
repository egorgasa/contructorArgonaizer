import type { FieldId } from "./field";

// Image values are stored as a discriminated object branch so they round-trip
// safely through JSON. We intentionally keep the binary out of FieldValue and
// use a base64 data URL — when a real upload pipeline lands, we'll extend this
// branch with a `url` variant without breaking primitive consumers.
export interface ImageFieldValue {
  kind: "image";
  dataUrl: string;
  name: string;
  size: number;
  mimeType: string;
}

export type FieldValue =
  | string
  | number
  | boolean
  | ImageFieldValue
  | null
  | undefined;

export type FormValues = Record<FieldId, FieldValue>;

export interface FormSubmission {
  id: string;
  formId: string;
  formVersion: number;
  values: FormValues;
  createdAt: string;
  updatedAt?: string;
}

export interface FieldError {
  fieldId: FieldId;
  message: string;
}

// Map shape used by FormRenderer/FieldRenderer to surface validation
// errors next to each field. Keeping a plain map (not an array of
// {fieldId, message}) keeps lookup O(1) inside the renderer.
export type FieldErrors = Record<FieldId, string>;
