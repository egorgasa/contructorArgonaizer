"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  next: string;
  initialError?: string;
}

export function AdminLoginForm({ next, initialError }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error ?? "Не удалось войти");
        setSubmitting(false);
        return;
      }
      // Redirect to original target.
      router.push(safeNext(next));
      router.refresh();
    } catch {
      setError("Сеть недоступна");
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-gray-800">Пароль</label>
      <Input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        invalid={!!error}
        autoFocus
        required
      />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <Button type="submit" disabled={submitting || !password} className="w-full">
        {submitting ? "Проверяем..." : "Войти"}
      </Button>
    </form>
  );
}

/** Defensively scope next-target to in-app paths only. */
function safeNext(next: string): string {
  if (!next.startsWith("/")) return "/admin";
  if (next.startsWith("//")) return "/admin";
  return next;
}
