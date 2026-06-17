"use client";

import { useCallback, useState } from "react";
import type { FormSchema } from "../types/schema";
import type {
  FieldErrors,
  FieldValue,
  FormSubmission,
  FormValues,
} from "../types/submission";
import { hasErrors, validateSubmission } from "../lib/validateSubmission";
import { generateId } from "../lib/id";

export interface UseFormFillResult {
  values: FormValues;
  errors: FieldErrors;
  submittedSubmission: FormSubmission | null;

  setValue: (fieldId: string, value: FieldValue) => void;
  setValues: (values: FormValues) => void;
  validate: () => boolean;
  submit: () => FormSubmission | null;
  reset: () => void;
}

export function useFormFill(schema: FormSchema): UseFormFillResult {
  const [values, setValuesState] = useState<FormValues>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submittedSubmission, setSubmittedSubmission] = useState<FormSubmission | null>(
    null,
  );

  const setValue = useCallback((fieldId: string, value: FieldValue) => {
    setValuesState((prev) => ({ ...prev, [fieldId]: value }));
    // Clear the error for this field on change — re-validated on submit.
    setErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const setValues = useCallback((next: FormValues) => {
    setValuesState((prev) => {
      // Clear errors only for keys whose values actually changed.
      // This keeps the bulk setter compatible with FormRenderer's
      // "replace the whole values map" onChange contract while still
      // behaving like a per-field setter for error UX.
      setErrors((prevErrors) => {
        let changed = false;
        const nextErrors = { ...prevErrors };
        for (const key of Object.keys(prevErrors)) {
          if (prev[key] !== next[key]) {
            delete nextErrors[key];
            changed = true;
          }
        }
        return changed ? nextErrors : prevErrors;
      });
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const nextErrors = validateSubmission(schema, values);
    setErrors(nextErrors);
    return !hasErrors(nextErrors);
  }, [schema, values]);

  const submit = useCallback((): FormSubmission | null => {
    const nextErrors = validateSubmission(schema, values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      setSubmittedSubmission(null);
      return null;
    }
    const submission: FormSubmission = {
      id: generateId("sub"),
      formId: schema.id,
      formVersion: schema.version,
      values,
      createdAt: new Date().toISOString(),
    };
    setSubmittedSubmission(submission);
    return submission;
  }, [schema, values]);

  const reset = useCallback(() => {
    setValuesState({});
    setErrors({});
    setSubmittedSubmission(null);
  }, []);

  return {
    values,
    errors,
    submittedSubmission,
    setValue,
    setValues,
    validate,
    submit,
    reset,
  };
}
