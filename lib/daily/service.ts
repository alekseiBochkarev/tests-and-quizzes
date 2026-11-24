import { isUniqueViolation } from "@/lib/auth/api";
import { AttemptError, abandonAttempt, createAttemptRecord } from "@/lib/attempts/service";
import { prisma } from "@/lib/db";
import { AttemptMode, AttemptStatus, ContentStatus } from "@/lib/generated/prisma/enums";

import {
  DAILY_BONUS_XP,
  dailyDate,
  dailyDateKey,
  isDailySetPlayable,
  selectDailyQuestions,
} from "./rules";

/**
 * «Тест дня»: один набор на московскую дату, одна попытка на пользователя.
 * Набор общий для всех; прогресс, баллы и mastery считаются как у обычной
 * попытки, плюс бонус за завершение.
 */

export type DailyStatus = "available" | "in_progress" | "completed" | "abandoned";

export type DailyStatusInfo = {
  status: DailyStatus;
  attemptId: string | null;
  questionCount: number | null;
  correctCount: number | null;
  bonusXp: number;
};

export type StartDailyResult = {
  attemptId: string;
  questionCount: number;
  status: DailyStatus;
  created: boolean;
};

type DailyAttemptRow = {
  id: string;
  status: AttemptStatus;
  questionCount: number;
  correctCount: number;
};

function statusOf(attempt: DailyAttemptRow): DailyStatus {
  if (attempt.status === AttemptStatus.COMPLETED) return "completed";
  if (attempt.status === AttemptStatus.ABANDONED) return "abandoned";
  return "in_progress";
}

function toStatusInfo(attempt: DailyAttemptRow | null): DailyStatusInfo {
  if (!attempt) {
    return {
      status: "available",
      attemptId: null,
      questionCount: null,
      correctCount: null,
      bonusXp: DAILY_BONUS_XP,
    };
  }

  return {
    status: statusOf(attempt),
    attemptId: attempt.id,
    questionCount: attempt.questionCount,
    correctCount: attempt.correctCount,
    bonusXp: DAILY_BONUS_XP,
  };
}

function todayAttempt(userId: string, date: Date) {
  return prisma.attempt.findUnique({
    where: { userId_dailyDate: { userId, dailyDate: date } },
    select: {
      id: true,
      status: true,
      questionCount: true,
      correctCount: true,
    },
  });
}

/** Статус карточки «Тест дня» на главной. */
export async function getDailyStatus(
  userId: string,
  now: Date = new Date(),
): Promise<DailyStatusInfo> {
  const attempt = await todayAttempt(userId, dailyDate(now));
  return toStatusInfo(attempt);
}

/** Закрывает незавершённые наборы прошлых дней: на новый день они не переносятся. */
async function closeStaleDaily(userId: string, today: Date): Promise<void> {
  const stale = await prisma.attempt.findMany({
    where: {
      userId,
      mode: AttemptMode.DAILY,
      status: AttemptStatus.IN_PROGRESS,
      dailyDate: { lt: today },
    },
    select: { id: true },
  });

  for (const attempt of stale) {
    await abandonAttempt(attempt.id, userId);
  }
}

/**
 * Идемпотентный старт: повторный запрос в тот же день возвращает ту же попытку,
 * независимо от того, идёт она, завершена или прервана.
 */
export async function startDailyAttempt(
  userId: string,
  now: Date = new Date(),
): Promise<StartDailyResult> {
  const date = dailyDate(now);

  const existing = await todayAttempt(userId, date);
  if (existing) {
    return {
      attemptId: existing.id,
      questionCount: existing.questionCount,
      status: statusOf(existing),
      created: false,
    };
  }

  await closeStaleDaily(userId, date);

  const [user, questions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    prisma.question.findMany({
      where: { status: ContentStatus.PUBLISHED, topic: { status: ContentStatus.PUBLISHED } },
      select: { id: true, topicId: true },
    }),
  ]);

  if (!user) throw new AttemptError("unauthorized", 401, "Нужно войти в аккаунт.");

  const selected = selectDailyQuestions(
    questions.map((question) => ({ questionId: question.id, topicId: question.topicId })),
    dailyDateKey(now),
  );

  if (!isDailySetPlayable(selected.length)) {
    throw new AttemptError(
      "daily_unavailable",
      409,
      "Тест дня пока недоступен: не хватает вопросов. Попробуйте позже.",
    );
  }

  try {
    const created = await createAttemptRecord({
      userId,
      timezone: user.timezone,
      mode: AttemptMode.DAILY,
      questionIds: selected.map((question) => question.questionId),
      dailyDate: date,
    });

    return {
      attemptId: created.id,
      questionCount: created.questionCount,
      status: "in_progress",
      created: true,
    };
  } catch (error) {
    // Параллельный старт: уникальный индекс (userId, dailyDate) пропустил
    // только одну попытку. Возвращаем её, а не ошибку.
    if (!isUniqueViolation(error)) throw error;

    const winner = await todayAttempt(userId, date);
    if (!winner) throw error;

    return {
      attemptId: winner.id,
      questionCount: winner.questionCount,
      status: statusOf(winner),
      created: false,
    };
  }
}
