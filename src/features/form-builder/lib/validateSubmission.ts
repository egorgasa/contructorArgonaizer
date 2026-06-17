import type {
  CheckboxField,
  ColorField,
  DateField,
  FormField,
  ImageField,
  NumberField,
  RadioField,
  SelectField,
  TextField,
  TextareaField,
} from "../types/field";
import type { FormSchema } from "../types/schema";
import type {
  FieldErrors,
  FieldValue,
  FormValues,
  ImageFieldValue,
} from "../types/submission";
import { FIELD_META } from "./fieldMeta";
import { assertNever } from "./exhaustive";

// ---- Empty-value detection -------------------------------------------------

function isImageValue(v: FieldValue): v is ImageFieldValue {
  return typeof v === "object" && v !== null && "kind" in v && v.kind === "image";
}

// True if the value should be treated as "not filled in".
// Note: this is a structural emptiness check. It does NOT decide whether a
// required checkbox should be considered filled — that is handled at the
// validator level (only `true` satisfies a required checkbox).
export function isEmptyFieldValue(value: FieldValue): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return false; // 0 is not empty
  if (typeof value === "boolean") return false; // false is not "empty" by itself
  if (isImageValue(value)) return false;
  // Unknown shape — treat as empty defensively.
  return true;
}

// ---- Helpers ---------------------------------------------------------------

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(v: string): boolean {
  return HEX_COLOR_RE.test(v);
}

// ISO date-only format yyyy-mm-dd. We compare strings lexicographically,
// which is correct for that canonical format.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidIsoDate(v: string): boolean {
  return ISO_DATE_RE.test(v);
}

// ---- Per-type validators ---------------------------------------------------
//
// Each validator returns a string error message or null. They never check
// `required` themselves — required is enforced once, centrally, in
// `validateField`. These validators only deal with shape/range checks
// applicable when a value is present.

function validateTextLike(
  field: TextField | TextareaField,
  value: FieldValue,
): string | null {
  if (typeof value !== "string") return "Value must be text.";
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    return `Up to ${field.maxLength} characters.`;
  }
  return null;
}

function validateNumber(field: NumberField, value: FieldValue): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Enter a valid number.";
  }
  if (field.min !== undefined && value < field.min) {
    return `Must be ≥ ${field.min}.`;
  }
  if (field.max !== undefined && value > field.max) {
    return `Must be ≤ ${field.max}.`;
  }
  return null;
}

function validateSelectLike(
  field: SelectField | RadioField,
  value: FieldValue,
): string | null {
  if (typeof value !== "string") return "Pick one of the available options.";
  const allowed = field.options.map((o) => o.value);
  if (!allowed.includes(value)) return "Pick one of the available options.";
  return null;
}

function validateCheckbox(
  field: CheckboxField,
  value: FieldValue,
): string | null {
  // The empty/required pipeline calls this only when there is *some* value
  // present and the field is not required. In that case any boolean is OK
  // and any non-boolean is a type error. Required-true is enforced upstream.
  void field;
  if (typeof value !== "boolean") return "Invalid value.";
  return null;
}

function validateDate(field: DateField, value: FieldValue): string | null {
  if (typeof value !== "string" || !isValidIsoDate(value)) {
    return "Enter a valid date.";
  }
  if (field.min && value < field.min) return `Must be on or after ${field.min}.`;
  if (field.max && value > field.max) return `Must be on or before ${field.max}.`;
  return null;
}

function validateImage(field: ImageField, value: FieldValue): string | null {
  if (!isImageValue(value)) return "Upload an image.";
  if (field.accept && field.accept.length > 0 && !field.accept.includes(value.mimeType)) {
    return `Unsupported file type: ${value.mimeType || "unknown"}.`;
  }
  if (typeof field.maxSizeMb === "number") {
    const maxBytes = field.maxSizeMb * 1024 * 1024;
    if (value.size > maxBytes) return `File is too large. Max ${field.maxSizeMb} MB.`;
  }
  return null;
}

function validateColor(field: ColorField, value: FieldValue): string | null {
  void field;
  if (typeof value !== "string" || !isValidHexColor(value)) {
    return "Enter a color in #RRGGBB format.";
  }
  return null;
}

// ---- Per-field dispatch ----------------------------------------------------

function validateField(field: FormField, value: FieldValue): string | null {
  // Display-only blocks are never validated.
  if (!FIELD_META[field.type].isInput) return null;

  const empty = isEmptyFieldValue(value);

  // Required-handling. Required checkbox is special: it requires `true`,
  // not just "not empty" (because `false` is structurally a valid bool).
  if (field.type === "checkbox") {
    if (field.required && value !== true) return "This field is required.";
    if (!field.required && empty) return null;
    return validateCheckbox(field, value);
  }

  if (empty) {
    if (field.required) return "This field is required.";
    return null;
  }

  // Value present — dispatch to type-specific shape/range validator.
  switch (field.type) {
    case "text":
    case "textarea":
      return validateTextLike(field, value);
    case "number":
      return validateNumber(field, value);
    case "select":
    case "radio":
      return validateSelectLike(field, value);
    case "date":
      return validateDate(field, value);
    case "image":
      return validateImage(field, value);
    case "color":
      return validateColor(field, value);
    case "staticText":
    case "heading":
    case "divider":
      // Unreachable thanks to the isInput guard above, but the union
      // demands the case for exhaustiveness.
      return null;
    default:
      return assertNever(field);
  }
}

// ---- Public API ------------------------------------------------------------

export function validateSubmission(
  schema: FormSchema,
  values: FormValues,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of schema.fields) {
    const msg = validateField(field, values[field.id]);
    if (msg !== null) errors[field.id] = msg;
  }
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  for (const _ in errors) return true;
  return false;
}
