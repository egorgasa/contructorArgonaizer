"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PrintButton } from "@/features/form-builder/components/print/PrintButton";
import { PrintableSubmissionView } from "@/features/form-builder/components/print/PrintableSubmissionView";
import {
  getFormRepository,
  getSubmissionRepository,
} from "@/features/form-builder/repositories";
import type { FormSchema } from "@/features/form-builder/types/schema";
import type { FormSubmission } from "@/features/form-builder/types/submission";
import "@/features/form-builder/components/print/print.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound"; what: "form" | "submission" }
  | { kind: "error"; message: string }
  | { kind: "ready"; schema: FormSchema; submission: FormSubmission };

export default function PrintSubmissionRoute() {
  const params = useParams<{ formId: string; submissionId: string }>();
  const formId = params?.formId ?? null;
  const submissionId = params?.submissionId ?? null;
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (formId === null || submissionId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const [schema, submission] = await Promise.all([
          getFormRepository().get(formId),
          getSubmissionRepository().get(submissionId),
        ]);
        if (cancelled) return;
        if (schema === null) {
          setState({ kind: "notFound", what: "form" });
          return;
        }
        if (submission === null) {
          setState({ kind: "notFound", what: "submission" });
          return;
        }
        setState({ kind: "ready", schema, submission });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Failed to load",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId, submissionId]);

  if (state.kind === "loading") {
    return (
      <div className="print-shell">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (state.kind === "notFound") {
    return (
      <div className="print-shell">
        <Card>
          <CardHeader>
            <CardTitle>
              {state.what === "form" ? "Form not found" : "Submission not found"}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-gray-600">
              {state.what === "form"
                ? "This form doesn’t exist or has been removed."
                : "This submission doesn’t exist or has been removed."}
            </p>
            {formId ? (
              <Link href={`/forms/${formId}/submissions`}>
                <Button variant="secondary" size="sm">
                  Back to submissions
                </Button>
              </Link>
            ) : (
              <Link href="/forms">
                <Button variant="secondary" size="sm">
                  Back to forms
                </Button>
              </Link>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="print-shell">
        <Card>
          <CardHeader>
            <CardTitle>Couldn’t load submission</CardTitle>
          </CardHeader>
          <CardBody>
            <p role="alert" className="text-sm text-red-700">
              {state.message}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="print-shell">
      <div className="print-toolbar no-print">
        <Link href={`/forms/${state.schema.id}/submissions`}>
          <Button variant="secondary" size="sm" aria-label="Back to submissions">
            ← Back to submissions
          </Button>
        </Link>
        <PrintButton />
      </div>
      <PrintableSubmissionView schema={state.schema} submission={state.submission} />
    </div>
  );
}
