import type { Metadata } from "next";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Проверьте себя",
};

const steps = [
  {
    title: "Выберите тест",
    text: "10–12 вопросов по знакомым темам: история, кино, литература, география.",
  },
  {
    title: "Отвечайте без спешки",
    text: "Без таймера и автоперехода. После каждого ответа — короткое объяснение.",
  },
  {
    title: "Сохраните результаты",
    text: "Войдите, чтобы вернуться к тестам и видеть, что уже освоено.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section aria-labelledby="hero-title" className="space-y-6">
        <p className="text-base font-semibold tracking-wide text-accent uppercase">
          Тесты для спокойной проверки знаний
        </p>
        <h1 id="hero-title" className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Проверьте себя
        </h1>
        <p className="max-w-2xl text-xl text-ink-soft">
          Короткие тесты по истории, кино, литературе и географии. Крупный текст, понятные
          объяснения и никакой спешки.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button href="/tests" fullWidth className="sm:w-auto">
            Выбрать тест
          </Button>
          <Button href="/login" variant="secondary" fullWidth className="sm:w-auto">
            Войти
          </Button>
        </div>
        <p className="text-base text-muted">
          Каталог тестов скоро появится. Пока можно посмотреть, как устроен сайт.
        </p>
      </section>

      <section aria-labelledby="how-title" className="space-y-4">
        <h2 id="how-title" className="text-2xl font-bold">
          Как это работает
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <p className="text-base font-bold text-accent">Шаг {index + 1}</p>
              <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-base text-ink-soft">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <Alert variant="neutral" title="Бесплатно и без звонков">
        Для сохранения результатов нужна только почта. Мы не звоним и не присылаем СМС — только
        письмо для подтверждения адреса.
      </Alert>
    </div>
  );
}
