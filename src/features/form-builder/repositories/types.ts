import type { FormSchema } from "../types/schema";
import type { FormSubmission } from "../types/submission";

// Metadata projection for listings. Cheap to keep in an index so the
// list pages don't have to load every full form payload.
export interface FormSchemaMeta {
  id: string;
  title: string;
  description?: string;
  version: number;
  fieldCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmissionMeta {
  id: string;
  formId: string;
  formVersion: number;
  createdAt: string;
}

// Repositories are intentionally async. Even though the localStorage
// implementation is synchronous under the hood, the async surface lets
// us swap in an API/Prisma-backed implementation later without changing
// any consumer code.
export interface FormRepository {
  list(): Promise<FormSchemaMeta[]>;
  get(id: string): Promise<FormSchema | null>;
  save(form: FormSchema): Promise<FormSchema>;
  remove(id: string): Promise<void>;
}

export interface SubmissionRepository {
  list(formId: string): Promise<SubmissionMeta[]>;
  get(id: string): Promise<FormSubmission | null>;
  save(submission: FormSubmission): Promise<FormSubmission>;
  remove(id: string): Promise<void>;
}

// Helper for projecting a full schema into a meta record.
export function toFormMeta(form: FormSchema): FormSchemaMeta {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    version: form.version,
    fieldCount: form.fields.length,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}

export function toSubmissionMeta(s: FormSubmission): SubmissionMeta {
  return {
    id: s.id,
    formId: s.formId,
    formVersion: s.formVersion,
    createdAt: s.createdAt,
  };
}
