"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DailyStatusInfo, StartDailyResult } from "@/lib/daily/service";
import { DAILY_MIN_QUESTIONS, DAILY_TEST_SIZE } from "@/lib/daily/rules";
import { questionWord } from "@/lib/ui/text";

type ApiErrorBody = {
  error?: { message?: string };
};

/**
 * Карточка «Теста дня» на главной.
 *
 * Старт идемпотентен: повторный клик и повторный запрос возвращают ту же
 * попытку. Завершённый или прерванный тест открывается сразу на результате.
 */
export function DailyTestCard({ daily }: { daily: DailyStatusInfo }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/daily/start", { method: "POST" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(payload?.error?.message ?? "Не удалось начать тест дня.");
      }

      const payload = (await response.json()) as { data: StartDailyResult };
      const next = payload.data;
      const suffix = next.status === "in_progress" ? "" : "/result";
      router.push(`/attempts/${next.attemptId}${suffix}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось начать тест дня.");
      setStarting(false);
    }
  }

  return (
    <Card className="space-y-4 border-2 border-accent bg-accent-soft">
      {daily.status === "available" ? (
        <>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-ink">
              {DAILY_MIN_QUESTIONS}–{DAILY_TEST_SIZE} {questionWord(DAILY_TEST_SIZE)} из разных тем
              — по одному короткому вопросу. Без таймера и спешки.
            </p>
            <p className="text-base text-ink-soft">
              За завершение — +{daily.bonusXp} баллов. Пропуск дня ничего не блокирует: серия
              просто начнётся заново.
            </p>
          </div>

          {error ? (
            <Alert variant="error" title="Не получилось начать">
              {error}
            </Alert>
          ) : null}

          <Button type="button" onClick={() => void start()} disabled={starting} fullWidth>
            {starting ? "Начинаем…" : "Начать тест дня"}
          </Button>
        </>
      ) : null}

      {daily.status === "in_progress" && daily.attemptId ? (
        <>
          <p className="text-lg font-semibold text-ink">
            Вы начали тест дня. Можно продолжить с того места, где остановились.
          </p>
          <Button href={`/attempts/${daily.attemptId}`} fullWidth>
            Продолжить тест дня
          </Button>
        </>
      ) : null}

      {daily.status === "completed" && daily.attemptId ? (
        <>
          <p className="text-lg font-semibold text-ink">
            Сегодняшний тест дня пройден: {daily.correctCount ?? 0} из {daily.questionCount ?? 0}{" "}
            {questionWord(daily.questionCount ?? 0)} верно.
          </p>
          <p className="text-base text-ink-soft">Новый набор появится завтра после 00:00.</p>
          <Button href={`/attempts/${daily.attemptId}/result`} variant="secondary" fullWidth>
            Посмотреть результат
          </Button>
        </>
      ) : null}

      {daily.status === "abandoned" && daily.attemptId ? (
        <>
          <p className="text-lg font-semibold text-ink">
            Сегодняшний тест дня прерван. Ответы, которые вы успели дать, сохранены.
          </p>
          <Button href={`/attempts/${daily.attemptId}/result`} variant="secondary" fullWidth>
            Посмотреть результат
          </Button>
        </>
      ) : null}
    </Card>
  );
}
