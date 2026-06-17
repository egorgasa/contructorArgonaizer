"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormRenderer } from "../FormRenderer";
import { useFormFill } from "../../hooks/useFormFill";
import { hasErrors } from "../../lib/validateSubmission";
import type { FormSchema } from "../../types/schema";
import type { FormSubmission, FormValues } from "../../types/submission";

interface Props {
  schema: FormSchema;
  // Optional persistence hook called after the local validation passes.
  // If it returns null, we surface a "save failed" status but still keep
  // the locally-built submission visible in the result block.
  onSubmitSuccess?: (submission: FormSubmission) => Promise<FormSubmission | null>;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function isValuesNonEmpty(values: FormValues): boolean {
  for (const v of Object.values(values)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v === "") continue;
    if (typeof v === "boolean" && v === false) continue;
    return true;
  }
  return false;
}

export function FormFillPage({ schema, onSubmitSuccess }: Props) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { values, errors, submittedSubmission, setValues, submit, reset } =
    useFormFill(schema);

  const errorEntries = useMemo(() => {
    return schema.fields
      .filter((f) => f.id in errors)
      .map((f) => ({ id: f.id, label: f.label, message: errors[f.id] }));
  }, [schema.fields, errors]);

  const showErrorSummary = hasErrors(errors);
  const submitLabel = schema.settings.submitButtonLabel ?? "Submit";
  const isEmptyForm = schema.fields.length === 0;

  const handleSubmit = async () => {
    const sub = submit();
    if (sub === null) return;
    if (!onSubmitSuccess) return;
    setSaveStatus("saving");
    const saved = await onSubmitSuccess(sub);
    setSaveStatus(saved === null ? "error" : "saved");
  };

  const handleReset = () => {
    if (
      isValuesNonEmpty(values) &&
      typeof window !== "undefined" &&
      !window.confirm("Clear all entered values?")
    ) {
      return;
    }
    reset();
    setSaveStatus("idle");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {schema.title || "Untitled form"}
        </h1>
        {schema.description ? (
          <p className="mt-1 text-sm text-gray-600">{schema.description}</p>
        ) : null}
      </div>

      {showErrorSummary ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <p className="font-medium">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5">
            {errorEntries.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.label}:</span> {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Form</CardTitle>
        </CardHeader>
        <CardBody>
          {isEmptyForm ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm font-medium text-gray-700">
                This form has no fields yet
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Add fields in the builder before filling it.
              </p>
            </div>
          ) : (
            <>
              <FormRenderer
                schema={schema}
                values={values}
                errors={errors}
                onChange={setValues}
              />
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={saveStatus === "saving"}
                  aria-label={submitLabel}
                >
                  {saveStatus === "saving" ? "Submitting…" : submitLabel}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  disabled={saveStatus === "saving"}
                >
                  Reset
                </Button>
                {saveStatus === "saving" ? (
                  <span className="text-xs text-gray-500">Saving…</span>
                ) : saveStatus === "saved" ? (
                  <span className="text-xs text-green-700">Saved</span>
                ) : saveStatus === "error" ? (
                  <span
                    role="alert"
                    className="text-xs text-red-600"
                    title="Storage may be full. Try removing old submissions or large images."
                  >
                    Save failed
                  </span>
                ) : null}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {submittedSubmission ? (
        <Card>
          <CardHeader>
            <CardTitle>Submitted</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-green-700">
              Submission created successfully.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Reference: <span className="font-mono">{submittedSubmission.id}</span>
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-gray-600">
                View raw JSON
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
                {JSON.stringify(submittedSubmission, null, 2)}
              </pre>
            </details>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
