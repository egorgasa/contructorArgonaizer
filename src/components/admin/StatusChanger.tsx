"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { REQUEST_STATUSES } from "@/lib/constants";
import { RequestStatusBadge } from "./RequestStatusBadge";

interface Props {
  requestId: string;
  currentStatus: string;
}

export function StatusChanger({ requestId, currentStatus }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState<string>(currentStatus);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = target && target !== currentStatus && !saving;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus: target, reason: reason || undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Не удалось изменить статус");
      }
      setReason("");
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
        <CardTitle>Статус заявки</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Текущий:</span>
          <RequestStatusBadge status={currentStatus} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Новый статус
          </label>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            {REQUEST_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Комментарий к смене (необязательно)
          </label>
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: уточнили размеры по телефону"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button disabled={!canSubmit} onClick={save}>
          {saving ? "Сохраняем..." : "Изменить статус"}
        </Button>
      </CardBody>
    </Card>
  );
}
