"use client";

import { useCallback, useEffect, useState } from "react";
import { getFormRepository } from "../repositories";
import type { FormSchemaMeta } from "../repositories/types";
import type { FormSchema } from "../types/schema";

export interface UseSavedFormsResult {
  forms: FormSchemaMeta[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveForm: (form: FormSchema) => Promise<FormSchema | null>;
  removeForm: (id: string) => Promise<void>;
}

export function useSavedForms(): UseSavedFormsResult {
  const [forms, setForms] = useState<FormSchemaMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getFormRepository().list();
      setForms(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  // First render must be deterministic — only touch repository after mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getFormRepository().list();
        if (!cancelled) setForms(next);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load forms");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveForm = useCallback(async (form: FormSchema): Promise<FormSchema | null> => {
    setError(null);
    try {
      const saved = await getFormRepository().save(form);
      const next = await getFormRepository().list();
      setForms(next);
      return saved;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save form");
      return null;
    }
  }, []);

  const removeForm = useCallback(async (id: string) => {
    setError(null);
    try {
      await getFormRepository().remove(id);
      setForms((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove form");
    }
  }, []);

  return { forms, loading, error, reload, saveForm, removeForm };
}
