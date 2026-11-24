import { dateFromKey, localDateKey } from "@/lib/progress/time";

/**
 * Правила «Теста дня» (LRN-02, docs/03-progress-model.md §5.6).
 *
 * Набор один на всех и зависит только от московской даты: пользователь может
 * вернуться к тому же тесту в течение дня. Персонализация — v1.1.
 */

export const DAILY_TIMEZONE = "Europe/Moscow";
export const DAILY_TEST_SIZE = 7;
export const DAILY_MIN_QUESTIONS = 5;
export const DAILY_BONUS_XP = 30;

export type DailyCandidate = {
  questionId: string;
  topicId: string;
};

/** Ключ дня «Теста дня» по Москве: сброс в 00:00 МСК. */
export function dailyDateKey(now: Date): string {
  return localDateKey(now, DAILY_TIMEZONE);
}

/** Значение для колонки `Attempt.dailyDate`. */
export function dailyDate(now: Date): Date {
  return dateFromKey(dailyDateKey(now));
}

/** Набор играбелен, только если набралось хотя бы 5 вопросов. */
export function isDailySetPlayable(count: number): boolean {
  return count >= DAILY_MIN_QUESTIONS;
}

/** Стабильный «шум»: один и тот же день даёт один и тот же набор. */
function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function seededOrder(seed: string, id: string): number {
  return stableHash(`${seed}:${id}`);
}

/**
 * Выбирает 5–7 вопросов из разных тем.
 *
 * Сначала берём по одному вопросу из каждой темы в детерминированном порядке,
 * затем при нехватке тем добираем вторые вопросы. Внутри темы вопрос тоже
 * выбирается детерминированно по дате.
 */
export function selectDailyQuestions(
  candidates: readonly DailyCandidate[],
  dateKey: string,
  size: number = DAILY_TEST_SIZE,
): DailyCandidate[] {
  const limit = Math.max(0, Math.trunc(size));
  if (limit === 0) return [];

  const seenQuestions = new Set<string>();
  const byTopic = new Map<string, DailyCandidate[]>();

  for (const candidate of candidates) {
    if (seenQuestions.has(candidate.questionId)) continue;
    seenQuestions.add(candidate.questionId);

    const group = byTopic.get(candidate.topicId);
    if (group) {
      group.push(candidate);
    } else {
      byTopic.set(candidate.topicId, [candidate]);
    }
  }

  const groups = [...byTopic.entries()].map(([topicId, group]) => ({
    topicId,
    questions: [...group].sort((a, b) => {
      const diff = seededOrder(dateKey, a.questionId) - seededOrder(dateKey, b.questionId);
      return diff !== 0 ? diff : a.questionId.localeCompare(b.questionId);
    }),
  }));

  groups.sort((a, b) => {
    const diff = seededOrder(dateKey, a.topicId) - seededOrder(dateKey, b.topicId);
    return diff !== 0 ? diff : a.topicId.localeCompare(b.topicId);
  });

  const selected: DailyCandidate[] = [];
  let round = 0;

  while (selected.length < limit) {
    let taken = false;

    for (const group of groups) {
      const candidate = group.questions[round];
      if (!candidate) continue;

      selected.push(candidate);
      taken = true;
      if (selected.length >= limit) break;
    }

    if (!taken) break;
    round += 1;
  }

  return selected;
}
