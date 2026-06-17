"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminListError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("admin list error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="text-lg font-semibold text-red-900">Не удалось загрузить заявки</div>
      <div className="mt-2 text-sm text-red-800">
        Что-то пошло не так на стороне сервера. Попробуйте обновить страницу.
      </div>
      {error.digest && (
        <div className="mt-2 text-xs text-red-700">Код ошибки: {error.digest}</div>
      )}
      <div className="mt-4">
        <Button variant="secondary" onClick={reset}>
          Повторить попытку
        </Button>
      </div>
    </div>
  );
}
