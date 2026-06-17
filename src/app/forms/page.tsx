"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { useSavedForms } from "@/features/form-builder/hooks/useSavedForms";

export default function FormsListPage() {
  const { forms, loading, error, removeForm } = useSavedForms();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
        <Link href="/forms/new">
          <Button>Create form</Button>
        </Link>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Saved forms</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : forms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm text-gray-600">No forms yet.</p>
              <div className="mt-3">
                <Link href="/forms/new">
                  <Button size="sm">Create form</Button>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {forms.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {f.title || "Untitled form"}
                    </p>
                    {f.description ? (
                      <p className="truncate text-xs text-gray-500">{f.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {f.fieldCount} fields
                      {f.updatedAt ? ` · updated ${formatDate(f.updatedAt)}` : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/forms/${f.id}/builder`}>
                      <Button variant="secondary" size="sm" aria-label={`Edit ${f.title}`}>
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/forms/${f.id}/fill`}>
                      <Button variant="secondary" size="sm" aria-label={`Fill ${f.title}`}>
                        Fill
                      </Button>
                    </Link>
                    <Link href={`/forms/${f.id}/submissions`}>
                      <Button variant="secondary" size="sm" aria-label={`Submissions for ${f.title}`}>
                        Submissions
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Delete ${f.title}`}
                      onClick={() => {
                        if (
                          typeof window === "undefined" ||
                          window.confirm(`Delete "${f.title || "Untitled form"}"? Submissions will be deleted too.`)
                        ) {
                          void removeForm(f.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
