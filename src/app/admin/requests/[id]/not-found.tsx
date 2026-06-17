import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function RequestNotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="text-lg font-semibold text-gray-900">Заявка не найдена</div>
      <div className="mt-2 text-sm text-gray-600">
        Возможно, ссылка устарела или заявка была удалена.
      </div>
      <div className="mt-4">
        <Link href="/admin">
          <Button>← К списку заявок</Button>
        </Link>
      </div>
    </div>
  );
}
