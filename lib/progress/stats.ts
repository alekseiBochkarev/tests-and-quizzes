import { percent } from "./topicAggregate";
import { dateFromKey, localDateKey } from "./time";

/**
 * Агрегаты прогресса и начисление баллов.
 * Формулы — docs/03-progress-model.md §4.1, §5.
 *
 * Агрегат темы живёт в `./topicAggregate`: он без зависимостей, чтобы его мог
 * импортировать CLI. Здесь — реэкспорт, чтобы существующие импорты не менялись.
 */

export { computeTopicAggregate, topicLevel } from "./topicAggregate";
export type { ProgressForAggregate, TopicAggregate } from "./topicAggregate";

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
