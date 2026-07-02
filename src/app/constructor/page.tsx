import { ConstructorWizard } from "@/components/constructor/ConstructorWizard";

export const metadata = {
  title: "Конструктор заявки — 3D-print.studio",
};

export const dynamic = "force-dynamic";

export default function ConstructorPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Конструктор заявки
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Заполните параметры будущего изделия. Это займёт 3–5 минут.
      </p>
      <ConstructorWizard />
    </div>
  );
}
