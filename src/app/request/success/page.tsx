import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RequestSuccessDetails } from "@/components/constructor/RequestSuccessDetails";

export const metadata = {
  title: "Заявка отправлена — 3D-print.studio",
};

interface PageProps {
  searchParams: { number?: string; upload_warning?: string };
}

const NEXT_STEPS = [
  "Мы проверим параметры изделия.",
  "Уточним детали, если потребуется.",
  "Подготовим оценку стоимости и сроков.",
  "Свяжемся с вами по указанным контактам.",
];

export default function RequestSuccessPage({ searchParams }: PageProps) {
  const number = searchParams.number;
  const uploadWarning = searchParams.upload_warning;

  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">Заявка отправлена</h1>
      <p className="mt-2 text-sm text-gray-600">
        Мы получили вашу конфигурацию и скоро свяжемся с вами.
      </p>

      {/* Number block (with copy) + safe summary — client island reading
          sessionStorage; degrades gracefully without a number or summary. */}
      <RequestSuccessDetails number={number} />

      {uploadWarning && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
          <div className="font-medium">Заявка сохранена, но возникла проблема с файлами</div>
          <div className="mt-1 text-amber-800">{uploadWarning}</div>
          <div className="mt-2 text-xs text-amber-700">
            Оператор свяжется с вами и попросит прислать фото отдельно.
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-left">
        <div className="mb-2 text-sm font-semibold text-gray-900">Что дальше</div>
        <ol className="space-y-1 text-sm text-gray-600">
          {NEXT_STEPS.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-medium text-brand-600">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
        <Link href="/constructor">
          <Button variant="secondary">Создать новую заявку</Button>
        </Link>
        <Link href="/">
          <Button>Вернуться на главную</Button>
        </Link>
      </div>
    </div>
  );
}
