"use client";

import { useCallback, useEffect, useState } from "react";
import { getSubmissionRepository } from "../repositories";
import type { SubmissionMeta } from "../repositories/types";
import type { FormSubmission } from "../types/submission";

export interface UseSavedSubmissionsResult {
  submissions: SubmissionMeta[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveSubmission: (s: FormSubmission) => Promise<FormSubmission | null>;
  removeSubmission: (id: string) => Promise<void>;
}

export function useSavedSubmissions(formId: string | null): UseSavedSubmissionsResult {
  const [submissions, setSubmissions] = useState<SubmissionMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(formId !== null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (formId === null) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getSubmissionRepository().list(formId);
      setSubmissions(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    if (formId === null) {
      setSubmissions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const next = await getSubmissionRepository().list(formId);
        if (!cancelled) setSubmissions(next);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load submissions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const saveSubmission = useCallback(
    async (s: FormSubmission): Promise<FormSubmission | null> => {
      setError(null);
      try {
        const saved = await getSubmissionRepository().save(s);
        const next = await getSubmissionRepository().list(s.formId);
        setSubmissions(next);
        return saved;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save submission");
        return null;
      }
    },
    [],
  );

  const removeSubmission = useCallback(async (id: string) => {
    setError(null);
    try {
      await getSubmissionRepository().remove(id);
      setSubmissions((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove submission");
    }
  }, []);

  return { submissions, loading, error, reload, saveSubmission, removeSubmission };
}
