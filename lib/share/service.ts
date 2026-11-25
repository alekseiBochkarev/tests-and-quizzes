import { cache } from "react";

import { prisma } from "@/lib/db";
import { AttemptStatus } from "@/lib/generated/prisma/enums";

/**
 * Данные публичной страницы результата (GRW-01).
 *
 * Выборка намеренно узкая: только итог и названия темы/выпуска. Почта, имя
 * и ответы не запрашиваются вообще, поэтому их нельзя случайно вывести на
 * публичную страницу или в OG-карточку.
 *
 * Шарить можно только завершённую попытку: прерванная тренировка и попытка
 * в процессе не дают осмысленного результата.
 */

export type SharedAttempt = {
  id: string;
  mode: string;
  questionCount: number;
  correctCount: number;
  percent: number;
  finishedAt: Date | null;
  topicTitle: string | null;
  categoryTitle: string | null;
  quizTitle: string | null;
};

async function loadSharedAttempt(attemptId: string): Promise<SharedAttempt | null> {
  if (!attemptId) return null;

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, status: AttemptStatus.COMPLETED },
    select: {
      id: true,
      mode: true,
      questionCount: true,
      correctCount: true,
      finishedAt: true,
      topic: { select: { title: true } },
      category: { select: { title: true } },
      quiz: { select: { title: true } },
    },
  });

  if (!attempt) return null;

  return {
    id: attempt.id,
    mode: attempt.mode,
    questionCount: attempt.questionCount,
    correctCount: attempt.correctCount,
    percent:
      attempt.questionCount > 0
        ? Math.round((attempt.correctCount / attempt.questionCount) * 100)
        : 0,
    finishedAt: attempt.finishedAt,
    topicTitle: attempt.topic?.title ?? null,
    categoryTitle: attempt.category?.title ?? null,
    quizTitle: attempt.quiz?.title ?? null,
  };
}

/** `cache` склеивает вызовы из generateMetadata и страницы в один запрос. */
export const getSharedAttempt = cache(loadSharedAttempt);
