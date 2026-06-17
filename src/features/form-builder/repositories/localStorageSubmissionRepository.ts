import {
  deserializeSubmission,
  serializeSubmission,
} from "../lib/serializeSubmission";
import type { FormSubmission } from "../types/submission";
import {
  toSubmissionMeta,
  type SubmissionMeta,
  type SubmissionRepository,
} from "./types";

const SUBMISSION_INDEX_PREFIX = "formbuilder:submissions:";
const SUBMISSION_KEY_PREFIX = "formbuilder:submission:";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function indexKey(formId: string) {
  return `${SUBMISSION_INDEX_PREFIX}${formId}`;
}
function subKey(id: string) {
  return `${SUBMISSION_KEY_PREFIX}${id}`;
}

function readIndex(storage: Storage, formId: string): SubmissionMeta[] {
  const raw = storage.getItem(indexKey(formId));
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: SubmissionMeta[] = [];
    for (const entry of parsed) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).id === "string" &&
        typeof (entry as Record<string, unknown>).formId === "string" &&
        typeof (entry as Record<string, unknown>).formVersion === "number" &&
        typeof (entry as Record<string, unknown>).createdAt === "string"
      ) {
        result.push(entry as SubmissionMeta);
      }
    }
    return result;
  } catch {
    return [];
  }
}

function writeIndex(storage: Storage, formId: string, list: SubmissionMeta[]) {
  storage.setItem(indexKey(formId), JSON.stringify(list));
}

function sortDesc(a: SubmissionMeta, b: SubmissionMeta): number {
  if (a.createdAt === b.createdAt) return 0;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export class LocalStorageSubmissionRepository implements SubmissionRepository {
  async list(formId: string): Promise<SubmissionMeta[]> {
    const storage = getStorage();
    if (storage === null) return [];

    const index = readIndex(storage, formId);
    const live: SubmissionMeta[] = [];
    let mutated = false;
    for (const meta of index) {
      const raw = storage.getItem(subKey(meta.id));
      if (raw === null) {
        mutated = true;
        continue;
      }
      if (deserializeSubmission(raw) === null) {
        mutated = true;
        storage.removeItem(subKey(meta.id));
        continue;
      }
      live.push(meta);
    }
    if (mutated) writeIndex(storage, formId, live);
    return [...live].sort(sortDesc);
  }

  async get(id: string): Promise<FormSubmission | null> {
    const storage = getStorage();
    if (storage === null) return null;
    const raw = storage.getItem(subKey(id));
    if (raw === null) return null;
    const parsed = deserializeSubmission(raw);
    if (parsed === null) {
      storage.removeItem(subKey(id));
      return null;
    }
    return parsed;
  }

  async save(submission: FormSubmission): Promise<FormSubmission> {
    const storage = getStorage();
    if (storage === null) {
      throw new Error("localStorage is not available in this environment");
    }
    storage.setItem(subKey(submission.id), serializeSubmission(submission));
    const index = readIndex(storage, submission.formId);
    const filtered = index.filter((m) => m.id !== submission.id);
    filtered.push(toSubmissionMeta(submission));
    writeIndex(storage, submission.formId, filtered);
    return submission;
  }

  async remove(id: string): Promise<void> {
    const storage = getStorage();
    if (storage === null) return;
    const raw = storage.getItem(subKey(id));
    storage.removeItem(subKey(id));
    if (raw === null) return;
    const parsed = deserializeSubmission(raw);
    if (parsed === null) return;
    const index = readIndex(storage, parsed.formId);
    writeIndex(
      storage,
      parsed.formId,
      index.filter((m) => m.id !== id),
    );
  }
}
