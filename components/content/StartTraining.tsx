"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { questionWord } from "@/lib/ui/text";
import { cn } from "@/lib/utils/cn";

const COUNT_OPTIONS = [10, 15, 20, 30] as const;

type Count = (typeof COUNT_OPTIONS)[number];

type ApiErrorBody = {
  error?: { message?: string };
};

/**
 * Начало тренировки: выбор количества вопросов и запуск.
 *
 * Гость видит выбор, но при запуске уходит на вход — прогресс без аккаунта
 * сохранить нельзя. 30 вопросов помечены как длинная тренировка: это осознанный
 * выбор, а не вариант по умолчанию.
 */
export function StartTraining({
  topicId,
  categoryId,
  maxQuestions,
  isAuthenticated,
  loginNext,
  reviewCount = 0,
}: {
  topicId?: string;
  categoryId?: string;
  maxQuestions: number;
  isAuthenticated: boolean;
  loginNext: string;
  reviewCount?: number;
}) {
  const router = useRouter();
  const [count, setCount] = useState<Count>(10);
  const [starting, setStarting] = useState(false);
  const [reviewStarting, setReviewStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCounts = COUNT_OPTIONS.filter((option) => option <= maxQuestions);
  const plannedCount = Math.min(count, maxQuestions);

  async function start(mode: "TRAINING" | "REVIEW") {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }

    if (mode === "TRAINING") setStarting(true);
    else setReviewStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(topicId ? { topicId } : {}),
          ...(categoryId ? { categoryId } : {}),
          count,
          mode,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(payload?.error?.message ?? "Не удалось начать тренировку.");
      }

      const payload = (await response.json()) as { data: { attemptId: string } };
      router.push(`/attempts/${payload.data.attemptId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось начать тренировку.");
      setStarting(false);
      setReviewStarting(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Начать тренировку</h2>
        <p className="text-base text-ink-soft">
          {maxQuestions >= 10
            ? "Выберите, сколько вопросов хотите пройти. Без таймера — можно отвечать спокойно."
            : `В этой теме ${maxQuestions} ${questionWord(maxQuestions)} — пройдём все за одну тренировку.`}
        </p>
      </div>

      {maxQuestions >= 10 ? (
        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold text-ink">Количество вопросов</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {availableCounts.map((option) => {
              const selected = option === count;
              return (
                <label
                  key={option}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-control border-2 px-4 py-3 text-lg font-semibold transition-colors",
                    selected
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-line-strong bg-surface text-ink hover:bg-accent-soft",
                  )}
                >
                  <input
                    type="radio"
                    name="question-count"
                    value={option}
                    checked={selected}
                    onChange={() => setCount(option)}
                    className="h-6 w-6 shrink-0 accent-[var(--color-accent)]"
                  />
                  <span>
                    {option} вопросов
                    {option === 30 ? (
                      <span className="block text-base font-normal text-muted">
                        Длинная тренировка, можно прервать в любой момент
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {!isAuthenticated ? (
        <Alert variant="neutral" title="Нужен аккаунт">
          Каталог открыт всем, а тренировки сохраняются в аккаунте. Войдите или зарегистрируйтесь —
          это бесплатно.
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error" title="Не получилось начать">
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          onClick={() => void start("TRAINING")}
          disabled={starting || reviewStarting}
        >
          {starting
            ? "Начинаем…"
            : isAuthenticated
              ? `Начать: ${plannedCount} ${questionWord(plannedCount)}`
              : "Войти и начать"}
        </Button>

        {isAuthenticated && reviewCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void start("REVIEW")}
            disabled={starting || reviewStarting}
          >
            {reviewStarting ? "Начинаем…" : `Повторить ошибки (${reviewCount})`}
          </Button>
        ) : null}
      </div>

      {isAuthenticated && reviewCount > 0 ? (
        <p className="text-base text-muted">
          Повторение включает вопросы, где были ошибки, и те, что пора освежить.
        </p>
      ) : null}
    </Card>
  );
}
