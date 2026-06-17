import type { FormField, FormFieldType } from "../types/field";
import type { FormSchema } from "../types/schema";

// Light, dependency-free structural guards. Goal: defensively accept only
// well-shaped payloads from localStorage and return null on anything off.
// Full type validation lives in TypeScript at write time; this guards the
// boundary at read time so a corrupted entry doesn't poison the UI.

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const FIELD_TYPES: ReadonlySet<FormFieldType> = new Set<FormFieldType>([
  "text",
  "textarea",
  "number",
  "select",
  "checkbox",
  "date",
  "radio",
  "image",
  "color",
  "staticText",
  "heading",
  "divider",
]);

function isFormFieldType(v: unknown): v is FormFieldType {
  return typeof v === "string" && FIELD_TYPES.has(v as FormFieldType);
}

// We do not deep-validate every per-type setting. The discriminant `type`
// plus base fields are required; per-type extras are accepted as-is (the
// renderer and validator handle missing optional fields gracefully).
function isFieldShape(v: unknown): v is FormField {
  if (!isObject(v)) return false;
  if (typeof v.id !== "string" || v.id === "") return false;
  if (!isFormFieldType(v.type)) return false;
  if (typeof v.label !== "string") return false;
  if (typeof v.order !== "number" || Number.isNaN(v.order)) return false;
  // For option-based fields we require an `options` array shape so the
  // renderer doesn't blow up. Each option must have string label/value.
  if (v.type === "select" || v.type === "radio") {
    if (!Array.isArray(v.options)) return false;
    for (const o of v.options) {
      if (!isObject(o)) return false;
      if (typeof o.label !== "string" || typeof o.value !== "string") return false;
    }
  }
  return true;
}

function isSchemaShape(v: unknown): v is FormSchema {
  if (!isObject(v)) return false;
  if (typeof v.id !== "string" || v.id === "") return false;
  if (typeof v.title !== "string") return false;
  if (typeof v.version !== "number") return false;
  if (!Array.isArray(v.fields)) return false;
  if (!v.fields.every(isFieldShape)) return false;
  if (!isObject(v.settings)) return false;
  return true;
}

export function serializeForm(form: FormSchema): string {
  return JSON.stringify(form);
}

export function deserializeForm(raw: string): FormSchema | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isSchemaShape(parsed) ? parsed : null;
}
