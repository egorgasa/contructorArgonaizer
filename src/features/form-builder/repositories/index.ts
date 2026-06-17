import { LocalStorageFormRepository } from "./localStorageFormRepository";
import { LocalStorageSubmissionRepository } from "./localStorageSubmissionRepository";
import type { FormRepository, SubmissionRepository } from "./types";

// Single shared instance per browser tab. Repositories are stateless
// wrappers over localStorage so a singleton is safe and cheap.
let formRepoInstance: FormRepository | null = null;
let submissionRepoInstance: SubmissionRepository | null = null;

export function getFormRepository(): FormRepository {
  if (formRepoInstance === null) {
    formRepoInstance = new LocalStorageFormRepository();
  }
  return formRepoInstance;
}

export function getSubmissionRepository(): SubmissionRepository {
  if (submissionRepoInstance === null) {
    submissionRepoInstance = new LocalStorageSubmissionRepository();
  }
  return submissionRepoInstance;
}

export type {
  FormRepository,
  FormSchemaMeta,
  SubmissionMeta,
  SubmissionRepository,
} from "./types";
