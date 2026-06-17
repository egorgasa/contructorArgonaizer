"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormBuilderPage } from "@/features/form-builder/components/builder/FormBuilderPage";
import { getFormRepository } from "@/features/form-builder/repositories";
import type { FormSchema } from "@/features/form-builder/types/schema";

type LoadState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; message: string }
  | { kind: "ready"; schema: FormSchema };

export default function FormBuilderRoute() {
  const params = useParams<{ formId: string }>();
  const formId = params?.formId ?? null;
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (formId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const schema = await getFormRepository().get(formId);
        if (cancelled) return;
        if (schema === null) setState({ kind: "notFound" });
        else setState({ kind: "ready", schema });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Failed to load form",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const saveForm = useCallback(
    async (schema: FormSchema): Promise<FormSchema | null> => {
      try {
        return await getFormRepository().save(schema);
      } catch {
        return null;
      }
    },
    [],
  );

  if (state.kind === "loading") {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  if (state.kind === "notFound") {
    return <NotFoundCard />;
  }
  if (state.kind === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Couldn’t load form</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
          <Link href="/forms">
            <Button variant="secondary" size="sm">
              Back to forms
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return <FormBuilderPage initialSchema={state.schema} onSave={saveForm} />;
}

function NotFoundCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Form not found</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-sm text-gray-600">
          This form doesn’t exist or has been removed.
        </p>
        <Link href="/forms">
          <Button variant="secondary" size="sm">
            Back to forms
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}
