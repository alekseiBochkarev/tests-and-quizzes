"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { questionWord } from "@/lib/ui/text";

type ApiErrorBody = {
  error?: { message?: string };
};

/**
 * Запуск готового выпуска.
 *
 * Выпуск всегда идёт целиком: количество вопросов задано набором, поэтому
 * выбора длины здесь нет. Гость уходит на вход и возвращается на эту же ссылку.
 */
export function StartQuiz({
  quizId,
  questionCount,
  isAuthenticated,
  loginNext,
}: {
  quizId: string;
  questionCount: number;
  isAuthenticated: boolean;
  loginNext: string;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, mode: "TRAINING" }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(payload?.error?.message ?? "Не удалось начать выпуск.");
      }

      const payload = (await response.json()) as { data: { attemptId: string } };
      router.push(`/attempts/${payload.data.attemptId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось начать выпуск.");
      setStarting(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Начать выпуск</h2>
        <p className="text-base text-ink-soft">
          В выпуске {questionCount} {questionWord(questionCount)} с объяснениями после каждого
          ответа. Без таймера — можно отвечать спокойно.
        </p>
      </div>

      {!isAuthenticated ? (
        <Alert variant="neutral" title="Нужен аккаунт">
          Ссылка на выпуск открыта всем, а результат сохраняется в аккаунте. Войдите или
          зарегистрируйтесь — это бесплатно.
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error" title="Не получилось начать">
          {error}
        </Alert>
      ) : null}

      <Button type="button" onClick={() => void start()} disabled={starting} fullWidth>
        {starting
          ? "Начинаем…"
          : isAuthenticated
            ? `Начать выпуск: ${questionCount} ${questionWord(questionCount)}`
            : "Войти и начать"}
      </Button>
    </Card>
  );
}
