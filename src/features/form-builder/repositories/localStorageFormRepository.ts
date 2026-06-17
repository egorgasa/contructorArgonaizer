import { deserializeForm, serializeForm } from "../lib/serializeForm";
import type { FormSchema } from "../types/schema";
import {
  toFormMeta,
  type FormRepository,
  type FormSchemaMeta,
} from "./types";

const FORM_INDEX_KEY = "formbuilder:forms";
const FORM_KEY_PREFIX = "formbuilder:form:";
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

function formKey(id: string) {
  return `${FORM_KEY_PREFIX}${id}`;
}

// The index stores a typed projection (FormSchemaMeta[]) so list() doesn't
// have to deserialize every form. It is rebuilt defensively when reads
// encounter corruption.
function readIndex(storage: Storage): FormSchemaMeta[] {
  const raw = storage.getItem(FORM_INDEX_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: FormSchemaMeta[] = [];
    for (const entry of parsed) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).id === "string" &&
        typeof (entry as Record<string, unknown>).title === "string" &&
        typeof (entry as Record<string, unknown>).version === "number" &&
        typeof (entry as Record<string, unknown>).fieldCount === "number"
      ) {
        result.push(entry as FormSchemaMeta);
      }
    }
    return result;
  } catch {
    return [];
  }
}

function writeIndex(storage: Storage, index: FormSchemaMeta[]) {
  storage.setItem(FORM_INDEX_KEY, JSON.stringify(index));
}

function sortMetaDesc(a: FormSchemaMeta, b: FormSchemaMeta): number {
  const ak = a.updatedAt ?? a.createdAt ?? "";
  const bk = b.updatedAt ?? b.createdAt ?? "";
  if (ak === bk) return 0;
  return ak < bk ? 1 : -1;
}

function removeSubmissionsForForm(storage: Storage, formId: string) {
  const indexKey = `${SUBMISSION_INDEX_PREFIX}${formId}`;
  const rawIndex = storage.getItem(indexKey);
  if (rawIndex !== null) {
    try {
      const parsed: unknown = JSON.parse(rawIndex);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as Record<string, unknown>).id === "string"
          ) {
            const subId = (entry as Record<string, unknown>).id as string;
            storage.removeItem(`${SUBMISSION_KEY_PREFIX}${subId}`);
          }
        }
      }
    } catch {
      // ignore corrupted index
    }
  }
  storage.removeItem(indexKey);
}

export class LocalStorageFormRepository implements FormRepository {
  async list(): Promise<FormSchemaMeta[]> {
    const storage = getStorage();
    if (storage === null) return [];

    const index = readIndex(storage);
    // Drop entries whose form payload is missing or corrupted. We keep
    // the index clean by writing back when we had to filter.
    const live: FormSchemaMeta[] = [];
    let mutated = false;
    for (const meta of index) {
      const raw = storage.getItem(formKey(meta.id));
      if (raw === null) {
        mutated = true;
        continue;
      }
      if (deserializeForm(raw) === null) {
        mutated = true;
        storage.removeItem(formKey(meta.id));
        continue;
      }
      live.push(meta);
    }
    if (mutated) writeIndex(storage, live);
    return [...live].sort(sortMetaDesc);
  }

  async get(id: string): Promise<FormSchema | null> {
    const storage = getStorage();
    if (storage === null) return null;
    const raw = storage.getItem(formKey(id));
    if (raw === null) return null;
    const parsed = deserializeForm(raw);
    if (parsed === null) {
      // Clean up so the next list() doesn't keep tripping over it.
      storage.removeItem(formKey(id));
      return null;
    }
    return parsed;
  }

  async save(form: FormSchema): Promise<FormSchema> {
    const storage = getStorage();
    if (storage === null) {
      throw new Error("localStorage is not available in this environment");
    }
    const now = new Date().toISOString();
    const next: FormSchema = {
      ...form,
      createdAt: form.createdAt ?? now,
      updatedAt: now,
    };
    storage.setItem(formKey(next.id), serializeForm(next));

    const index = readIndex(storage);
    const filtered = index.filter((m) => m.id !== next.id);
    filtered.push(toFormMeta(next));
    writeIndex(storage, filtered);

    return next;
  }

  async remove(id: string): Promise<void> {
    const storage = getStorage();
    if (storage === null) return;
    storage.removeItem(formKey(id));
    const index = readIndex(storage);
    writeIndex(
      storage,
      index.filter((m) => m.id !== id),
    );
    // Best-effort: drop submissions for this form too.
    removeSubmissionsForForm(storage, id);
  }
}
