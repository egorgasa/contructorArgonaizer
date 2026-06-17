"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminRequestError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("admin request detail error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="text-lg font-semibold text-red-900">Не удалось загрузить заявку</div>
      <div className="mt-2 text-sm text-red-800">
        Ошибка на стороне сервера. Возможно, заявка была удалена или БД временно недоступна.
      </div>
      {error.digest && (
        <div className="mt-2 text-xs text-red-700">Код ошибки: {error.digest}</div>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={reset}>
          Повторить
        </Button>
        <Link href="/admin">
          <Button>← К списку заявок</Button>
        </Link>
      </div>
    </div>
  );
}
