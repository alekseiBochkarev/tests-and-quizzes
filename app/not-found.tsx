import type { Metadata } from "next";

import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Страница не найдена",
};

export default function NotFound() {
  return (
    <div className="space-y-6">
      <p className="text-base font-semibold text-accent">Страница не найдена</p>
      <h1 className="text-4xl font-bold tracking-tight">Такой страницы нет</h1>
      <p className="max-w-2xl text-lg text-ink-soft">
        Возможно, ссылка устарела или в адресе опечатка. Вернитесь на главную — там всё на месте.
      </p>
      <Button href="/" fullWidth className="sm:w-auto">
        На главную
      </Button>
    </div>
  );
}
