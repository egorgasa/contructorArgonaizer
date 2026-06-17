"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { useSavedSubmissions } from "@/features/form-builder/hooks/useSavedSubmissions";
import { getFormRepository, getSubmissionRepository } from "@/features/form-builder/repositories";
import type { FormSchema } from "@/features/form-builder/types/schema";
import type { FormSubmission } from "@/features/form-builder/types/submission";

export default function SubmissionsListPage() {
  const params = useParams<{ formId: string }>();
  const formId = params?.formId ?? null;
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState<boolean>(true);

  const { submissions, loading, error, removeSubmission } = useSavedSubmissions(formId);

  useEffect(() => {
    if (formId === null) return;
    let cancelled = false;
    (async () => {
      const s = await getFormRepository().get(formId);
      if (!cancelled) {
        setSchema(s);
        setSchemaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Submissions</h1>
          {schema ? (
            <p className="text-sm text-gray-600">
              For form: <span className="font-medium">{schema.title || "Untitled form"}</span>
            </p>
          ) : null}
        </div>
        {formId ? (
          <Link href={`/forms/${formId}/fill`}>
            <Button variant="secondary" size="sm">
              Fill again
            </Button>
          </Link>
        ) : null}
      </div>

      {schemaLoading ? null : schema === null ? (
        <Card>
          <CardHeader>
            <CardTitle>Form not found</CardTitle>
          </CardHeader>
          <CardBody>
            <Link href="/forms">
              <Button variant="secondary" size="sm">
                Back to forms
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All submissions</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : submissions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              No submissions yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {submissions.map((s) => (
                <SubmissionRow
                  key={s.id}
                  id={s.id}
                  formId={s.formId}
                  formVersion={s.formVersion}
                  createdAt={s.createdAt}
                  onRemove={() => {
                    if (
                      typeof window === "undefined" ||
                      window.confirm("Delete this submission?")
                    ) {
                      void removeSubmission(s.id);
                    }
                  }}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

interface RowProps {
  id: string;
  formId: string;
  formVersion: number;
  createdAt: string;
  onRemove: () => void;
}

function SubmissionRow({ id, formId, formVersion, createdAt, onRemove }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setBusy(true);
    const full = await getSubmissionRepository().get(id);
    setBusy(false);
    setSubmission(full);
    setExpanded(true);
  };

  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-gray-700">{id}</p>
          <p className="text-xs text-gray-500">
            v{formVersion} · {formatDate(createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={toggle}
            disabled={busy}
            aria-label={expanded ? "Hide submission JSON" : "View submission JSON"}
          >
            {expanded ? "Hide" : busy ? "Loading…" : "View"}
          </Button>
          <Link href={`/forms/${formId}/submissions/${id}/print`}>
            <Button variant="secondary" size="sm" aria-label="Open print view">
              Print
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            aria-label="Delete submission"
            onClick={onRemove}
          >
            Delete
          </Button>
        </div>
      </div>
      {expanded ? (
        <pre className="mt-3 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
          {submission === null ? "Not found" : JSON.stringify(submission, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
