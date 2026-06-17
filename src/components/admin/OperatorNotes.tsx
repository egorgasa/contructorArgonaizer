"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import type { StoredOperatorNote } from "@/types/print-request";

interface Props {
  requestId: string;
  notes: StoredOperatorNote[];
}

export function OperatorNotes({ requestId, notes }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Не удалось сохранить заметку");
      }
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Внутренние заметки оператора</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <Textarea
          rows={3}
          placeholder="Например: позвонил клиенту, уточнил толщину стенок — 2.5 мм"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Button disabled={saving || !body.trim()} onClick={submit}>
          {saving ? "Сохраняем..." : "Добавить заметку"}
        </Button>

        {notes.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-gray-100 pt-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <div className="whitespace-pre-wrap text-gray-800">{n.body}</div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
