import Link from "next/link";
import { Button } from "@/components/ui/Button";

const STEPS: { title: string; description: string }[] = [
  {
    title: "Заполните параметры",
    description:
      "Ответьте на простые вопросы: тип изделия, размеры, материал, цвет. Подсказки помогут на каждом шаге.",
  },
  {
    title: "Отправьте заявку",
    description:
      "Оставьте контакты и пришлите заявку. Никаких CAD-навыков не нужно — мы сами сделаем модель.",
  },
  {
    title: "Мы уточним детали",
    description:
      "Если что-то непонятно, мы свяжемся с вами в течение 24 часов и согласуем размеры и форму.",
  },
  {
    title: "Подготовим и напечатаем",
    description:
      "Соберём 3D-модель и напечатаем изделие на нашем принтере. Согласуем стоимость и сроки.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          3D-печать ваших идей —
          <br /> без CAD и сложных программ
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-600">
          Опишите нужное изделие через простой конструктор: органайзер, коробку,
          подставку или любую кастомную форму. Мы сами подготовим модель и напечатаем её.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/constructor">
            <Button size="lg">Создать заявку</Button>
          </Link>
          <Link href="/admin">
            <Button size="lg" variant="secondary">
              Войти как оператор
            </Button>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-center text-xl font-semibold text-gray-900">
          Как это работает
        </h2>
        <ol className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, idx) => (
            <li
              key={step.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {idx + 1}
              </div>
              <div className="mt-3 text-base font-semibold text-gray-900">{step.title}</div>
              <p className="mt-1 text-sm text-gray-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Не уверены, что нам подойдёт?
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Попробуйте просто пройти конструктор — это бесплатно и ни к чему не обязывает.
        </p>
        <div className="mt-4">
          <Link href="/constructor">
            <Button>Перейти в конструктор</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
