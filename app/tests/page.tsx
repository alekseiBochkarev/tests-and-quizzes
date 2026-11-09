import type { Metadata } from "next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Тесты",
};

export default function TestsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Тесты</h1>
      <Card className="space-y-4">
        <h2 className="text-2xl font-bold">Каталог тестов скоро появится</h2>
        <p className="max-w-2xl text-lg text-ink-soft">
          Мы готовим первые тесты по истории, кино, литературе и географии. Загляните позже — здесь
          появятся темы и короткие тесты на 10–12 вопросов.
        </p>
        <div>
          <Button href="/" variant="secondary">
            На главную
          </Button>
        </div>
      </Card>
    </div>
  );
}
