import type { FormSubmission } from "../types/submission";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSubmissionShape(v: unknown): v is FormSubmission {
  if (!isObject(v)) return false;
  if (typeof v.id !== "string" || v.id === "") return false;
  if (typeof v.formId !== "string" || v.formId === "") return false;
  if (typeof v.formVersion !== "number") return false;
  if (typeof v.createdAt !== "string") return false;
  if (!isObject(v.values)) return false;
  return true;
}

export function serializeSubmission(submission: FormSubmission): string {
  return JSON.stringify(submission);
}

export function deserializeSubmission(raw: string): FormSubmission | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isSubmissionShape(parsed) ? parsed : null;
}
