"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { createEmptyForm } from "@/features/form-builder/lib/createEmptyForm";
import { getFormRepository } from "@/features/form-builder/repositories";

// Client-side flow: create an empty schema, persist it through the
// repository, then redirect to its builder route. This is more reliable
// than a server-side redirect for a localStorage-backed repository.
export default function NewFormPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const schema = createEmptyForm({ title: "Untitled form" });
      const saved = await getFormRepository().save(schema);
      router.push(`/forms/${saved.id}/builder`);
    } catch (e) {
      setCreating(false);
      setError(e instanceof Error ? e.message : "Failed to create form");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new form</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-sm text-gray-600">
          A new empty form will be created and opened in the builder.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <Button onClick={create} disabled={creating}>
          {creating ? "Creating…" : "Create form"}
        </Button>
      </CardBody>
    </Card>
  );
}
