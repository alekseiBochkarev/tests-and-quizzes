"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { AttemptState } from "@/lib/attempts/service";
import { questionLevelLabel } from "@/lib/ui/text";
import { cn } from "@/lib/utils/cn";

type Question = AttemptState["questions"][number];

type Feedback = {
  isCorrect: boolean;
  correctOptionId: string | null;
  explanation: string | null;
  xpAwarded: number;
  masteryLevel?: number;
  answeredCount: number;
  correctCount: number;
};

type ApiErrorBody = {
  error?: { message?: string };
};

function storedFeedback(question: Question): Feedback | null {
  if (!question.answered) return null;
  return {
    isCorrect: question.isCorrect === true,
    correctOptionId: question.correctOptionId,
    explanation: question.explanation,
    xpAwarded: question.xpAwarded,
    answeredCount: 0,
    correctCount: 0,
  };
}

/**
 * Прохождение тренировки.
 *
 * Ответ отправляется на сервер и проверяется там; до ответа правильный вариант
 * не приходит в браузер. Повторная отправка безопасна: сервер вернёт сохранённый
 * результат и не начислит баллы дважды.
 */
export function AttemptPlayer({ attempt }: { attempt: AttemptState }) {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>(attempt.questions);
  const [answeredCount, setAnsweredCount] = useState(attempt.answeredCount);
  const [correctCount, setCorrectCount] = useState(attempt.correctCount);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = attempt.questions.findIndex((question) => !question.answered);
    return firstUnanswered === -1 ? Math.max(0, attempt.questions.length - 1) : firstUnanswered;
  });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(() => {
    const firstUnanswered = attempt.questions.findIndex((question) => !question.answered);
    if (firstUnanswered !== -1) return null;
    return storedFeedback(attempt.questions[attempt.questions.length - 1]!);
  });
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[currentIndex];
  const total = questions.length;
  const title = attempt.topicTitle ?? attempt.categoryTitle ?? "Тренировка";
  const isLast = currentIndex >= total - 1;
  const resumed = attempt.answeredCount > 0;

  async function submitAnswer() {
    if (!question || !selectedOptionId || feedback) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/attempts/${attempt.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, optionId: selectedOptionId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(payload?.error?.message ?? "Не удалось проверить ответ.");
      }

      const payload = (await response.json()) as {
        data: Feedback & { questionCount: number };
      };
      const next = payload.data;

      setFeedback({
        isCorrect: next.isCorrect,
        correctOptionId: next.correctOptionId,
        explanation: next.explanation,
        xpAwarded: next.xpAwarded,
        masteryLevel: next.masteryLevel,
        answeredCount: next.answeredCount,
        correctCount: next.correctCount,
      });
      setAnsweredCount(next.answeredCount);
      setCorrectCount(next.correctCount);
      setQuestions((current) =>
        current.map((item, index) =>
          index === currentIndex
            ? {
                ...item,
                answered: true,
                selectedOptionId,
                isCorrect: next.isCorrect,
                correctOptionId: next.correctOptionId,
                explanation: next.explanation,
                xpAwarded: next.xpAwarded,
              }
            : item,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось проверить ответ.");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    const nextIndex = questions.findIndex(
      (item, index) => index > currentIndex && !item.answered,
    );
    const target = nextIndex === -1 ? Math.min(total - 1, currentIndex + 1) : nextIndex;

    setCurrentIndex(target);
    setSelectedOptionId(null);
    setFeedback(null);
    setError(null);
  }

  async function finish() {
    setFinishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/attempts/${attempt.id}/finish`, { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(payload?.error?.message ?? "Не удалось завершить тренировку.");
      }
      router.push(`/attempts/${attempt.id}/result`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось завершить тренировку.");
      setFinishing(false);
    }
  }

  async function abandon() {
    setAbandoning(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/attempts/${attempt.id}/abandon`, { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(payload?.error?.message ?? "Не удалось сохранить прогресс.");
      }
      router.push(`/attempts/${attempt.id}/result`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить прогресс.");
      setAbandoning(false);
    }
  }

  if (!question) {
    return (
      <Alert variant="error" title="Тренировка пуста">
        В этой тренировке нет вопросов. Вернитесь в{" "}
        <Link href="/tests" className="font-semibold underline underline-offset-4">
          каталог
        </Link>
        .
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-base font-semibold tracking-wide text-accent uppercase">{title}</p>
          <p className="text-lg font-semibold text-ink">
            Вопрос {currentIndex + 1} из {total}
            <span className="block text-base font-normal text-muted">
              Верных ответов: {correctCount}
            </span>
          </p>
        </div>
        <ProgressBar
          value={total > 0 ? (answeredCount / total) * 100 : 0}
          label={`Отвечено ${answeredCount} из ${total}`}
        />
        {resumed ? (
          <p className="text-base text-muted">
            Вы продолжаете тренировку. Уже отвечено: {answeredCount} из {total}.
          </p>
        ) : null}
      </div>

      <Card className="space-y-5">
        <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{question.text}</h1>

        <fieldset className="space-y-3" disabled={Boolean(feedback) || submitting}>
          <legend className="text-lg font-semibold text-ink">Выберите один вариант</legend>

          {question.options.map((option, optionIndex) => {
            const selected = selectedOptionId === option.id;
            const isCorrectOption = feedback && feedback.correctOptionId === option.id;
            const isWrongSelection = feedback && selected && !feedback.isCorrect;

            return (
              <label
                key={option.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-start gap-3 rounded-control border-2 px-4 py-3 text-lg leading-snug transition-colors",
                  "border-line-strong bg-surface text-ink hover:bg-accent-soft",
                  selected && !feedback && "border-accent bg-accent-soft",
                  isCorrectOption && "border-success bg-success-soft",
                  isWrongSelection && "border-danger bg-danger-soft",
                  feedback && "cursor-default",
                )}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={selected}
                  onChange={() => setSelectedOptionId(option.id)}
                  className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="font-semibold text-muted">{optionIndex + 1}. </span>
                  {option.text}
                </span>
              </label>
            );
          })}
        </fieldset>

        <div aria-live="polite" className="space-y-4">
          {feedback ? (
            <Alert
              variant={feedback.isCorrect ? "success" : "error"}
              title={feedback.isCorrect ? "Верно" : "Неверно"}
            >
              <p>{feedback.explanation}</p>
              <p className="mt-2 text-base text-ink-soft">
                {feedback.isCorrect ? "Начислено баллов: " : "Баллы за участие: "}
                {feedback.xpAwarded}
                {typeof feedback.masteryLevel === "number" ? (
                  <> · Освоение: {questionLevelLabel(feedback.masteryLevel)}</>
                ) : null}
              </p>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="error" title="Что-то не получилось">
              {error}
            </Alert>
          ) : null}
        </div>

        {!feedback ? (
          <Button
            type="button"
            onClick={() => void submitAnswer()}
            disabled={!selectedOptionId || submitting}
            fullWidth
            className="sm:w-auto"
          >
            {submitting ? "Проверяем…" : "Ответить"}
          </Button>
        ) : isLast || answeredCount >= total ? (
          <Button
            type="button"
            onClick={() => void finish()}
            disabled={finishing}
            fullWidth
            className="sm:w-auto"
          >
            {finishing ? "Подводим итог…" : "Показать результат"}
          </Button>
        ) : (
          <Button type="button" onClick={goNext} fullWidth className="sm:w-auto">
            Следующий вопрос
          </Button>
        )}
      </Card>

      <div className="space-y-4">
        {confirmExit ? (
          <Card className="space-y-4 border-line-strong">
            <h2 className="text-xl font-bold">Прервать тренировку?</h2>
            <p className="text-base text-ink-soft">
              Уже данные ответы сохранятся, баллы за них останутся. Вернуться к этой тренировке
              будет нельзя — но можно начать новую.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button type="button" onClick={() => setConfirmExit(false)} disabled={abandoning}>
                Продолжить тренировку
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void abandon()}
                disabled={abandoning}
              >
                {abandoning ? "Сохраняем…" : "Прервать и выйти"}
              </Button>
            </div>
          </Card>
        ) : (
          <Button type="button" variant="quiet" onClick={() => setConfirmExit(true)}>
            Выйти из тренировки
          </Button>
        )}

        {error && confirmExit ? (
          <Alert variant="error" title="Не удалось выйти">
            {error}
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
