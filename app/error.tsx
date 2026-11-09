"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Что-то пошло не так</h1>
      <p className="max-w-2xl text-lg text-ink-soft">
        Страница не загрузилась. Попробуйте обновить её — ваши сохранённые результаты не пропадут.
      </p>
      {error.digest ? (
        <p className="text-base text-muted">Код ошибки для поддержки: {error.digest}</p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => reset()} fullWidth className="sm:w-auto">
          Попробовать снова
        </Button>
        <Button href="/" variant="secondary" fullWidth className="sm:w-auto">
          На главную
        </Button>
      </div>
    </div>
  );
}
