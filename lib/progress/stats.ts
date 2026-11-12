import { dateFromKey, localDateKey } from "@/lib/progress/time";

/**
 * Агрегаты прогресса и начисление баллов.
 * Формулы — docs/03-progress-model.md §4.1, §5.
 */

export type ProgressForAggregate = {
  masteryLevel: number;
  seenCount: number;
  correctCount: number;
};

export type TopicAggregate = {
  totalQuestions: number;
  seenQuestions: number;
  masteredQuestions: number;
  answeredCount: number;
  correctCount: number;
  masteryPoints: number;
  progress: number;
  coverage: number;
  quality: number;
  accuracy: number;
  level: number;
};

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

export function topicLevel(progress: number): number {
  if (progress >= 85) return 5;
  if (progress >= 60) return 4;
  if (progress >= 35) return 3;
  if (progress >= 15) return 2;
  if (progress >= 5) return 1;
  return 0;
}

export function computeTopicAggregate(
  totalQuestions: number,
  progresses: ProgressForAggregate[],
): TopicAggregate {
  const seen = progresses.filter((item) => item.seenCount > 0);
  const answeredCount = progresses.reduce((sum, item) => sum + item.seenCount, 0);
  const correctCount = progresses.reduce((sum, item) => sum + item.correctCount, 0);
  const masteryPoints = progresses.reduce((sum, item) => sum + item.masteryLevel, 0);
  const seenQuestions = seen.length;
  const masteredQuestions = progresses.filter((item) => item.masteryLevel >= 4).length;

  const coverage = percent(seenQuestions, totalQuestions);
  const quality = percent(masteryPoints, 5 * seenQuestions);
  const progress = Math.min(100, Math.max(0, (coverage * quality) / 100));

  return {
    totalQuestions,
    seenQuestions,
    masteredQuestions,
    answeredCount,
    correctCount,
    masteryPoints,
    progress,
    coverage,
    quality,
    accuracy: percent(correctCount, answeredCount),
    level: topicLevel(progress),
  };
}

/** Баллы за один ответ. */
export function xpForAnswer(isCorrect: boolean, wasDue: boolean): number {
  if (!isCorrect) return 2;
  return wasDue ? 12 : 10;
}

/** Баллы за завершение тренировки. */
export function xpForCompletion(isPerfect: boolean): number {
  return 5 + (isPerfect ? 25 : 0);
}

export type StreakState = {
  dailyStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
};

export type StreakUpdate = StreakState & { today: Date };

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Обновление серии дней по локальной дате пользователя.
 * Один завершённый тест в день = активный день.
 */
export function nextDailyStreak(
  current: StreakState,
  now: Date,
  timeZone: string,
): StreakUpdate {
  const todayKey = localDateKey(now, timeZone);
  const today = dateFromKey(todayKey);
  const lastKey = current.lastActiveDate ? dayKey(current.lastActiveDate) : null;

  if (lastKey === todayKey) {
    return { ...current, today };
  }

  const yesterdayKey = dateFromKey(todayKey);
  yesterdayKey.setUTCDate(yesterdayKey.getUTCDate() - 1);

  const nextStreak = lastKey === dayKey(yesterdayKey) ? current.dailyStreak + 1 : 1;

  return {
    dailyStreak: nextStreak,
    longestStreak: Math.max(current.longestStreak, nextStreak),
    lastActiveDate: today,
    today,
  };
}

export function accuracyPercent(correct: number, answered: number): number {
  return percent(correct, answered);
}
