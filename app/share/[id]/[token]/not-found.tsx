import type { Metadata } from "next";

import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Результат не открывается",
  robots: { index: false, follow: false },
};

export default function SharedResultNotFound() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-base font-semibold text-accent">Ссылка на результат</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Результат не открывается</h1>
      <p className="text-lg text-ink-soft">
        Возможно, ссылка скопирована не полностью или результат больше не доступен. Попросите
        прислать ссылку ещё раз — или пройдите тест сами.
      </p>
      <Button href="/tests">Выбрать тест</Button>
    </div>
  );
}
