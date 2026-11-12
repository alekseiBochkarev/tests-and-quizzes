/**
 * Выбор вопросов для тренировки (docs/05-learning-experience.md §6.2).
 *
 * Приоритет: просроченные → новые → слабые → часто ошибочные → интересные.
 * Недавно виденные вопросы уходят вниз, чтобы не повторять одно и то же
 * несколько тренировок подряд.
 */

export type QuestionCandidate = {
  questionId: string;
  topicId: string;
  seenCount: number;
  wrongCount: number;
  masteryLevel: number;
  nextReviewAt: Date | null;
  lastSeenAt: Date | null;
  interestWeight?: number;
};

export type SelectQuestionsOptions = {
  count: number;
  now: Date;
  /** Для тренировки по разделу вопросы распределяются по темам. */
  balanceByTopic?: boolean;
};

const DAY_MS = 86_400_000;

/** Детерминированный «шум» 0–30: тесты воспроизводимы, порядок не жёсткий. */
function stableNoise(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash % 31);
}

export function scoreQuestion(candidate: QuestionCandidate, now: Date): number {
  let score = 0;

  if (candidate.nextReviewAt && candidate.nextReviewAt.getTime() <= now.getTime()) {
    score += 1_000;
  }

  if (candidate.seenCount === 0) {
    score += 300;
  }

  score += (5 - candidate.masteryLevel) * 60;
  score += candidate.wrongCount * 10;

  if ((candidate.interestWeight ?? 0) > 0) {
    score += 40;
  }

  if (
    candidate.lastSeenAt &&
    now.getTime() - candidate.lastSeenAt.getTime() < DAY_MS
  ) {
    score -= 200;
  }

  score += stableNoise(candidate.questionId);

  return score;
}

export type ScoredCandidate = QuestionCandidate & { score: number };

function sortByScore(a: ScoredCandidate, b: ScoredCandidate): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.questionId.localeCompare(b.questionId);
}

function takeRoundRobin(groups: ScoredCandidate[][], count: number): ScoredCandidate[] {
  const selected: ScoredCandidate[] = [];
  let index = 0;

  while (selected.length < count) {
    let taken = false;

    for (const group of groups) {
      const candidate = group[index];
      if (candidate) {
        selected.push(candidate);
        taken = true;
        if (selected.length >= count) break;
      }
    }

    if (!taken) break;
    index += 1;
  }

  return selected;
}

/**
 * Возвращает до `count` вопросов. Если вопросов меньше — возвращает все.
 */
export function selectQuestions(
  candidates: QuestionCandidate[],
  options: SelectQuestionsOptions,
): QuestionCandidate[] {
  const count = Math.max(0, Math.trunc(options.count));
  if (count === 0) return [];

  const scored = candidates.map((candidate) => ({
    ...candidate,
    score: scoreQuestion(candidate, options.now),
  }));

  if (!options.balanceByTopic) {
    return scored.sort(sortByScore).slice(0, count);
  }

  const byTopic = new Map<string, ScoredCandidate[]>();
  for (const candidate of scored) {
    const group = byTopic.get(candidate.topicId);
    if (group) {
      group.push(candidate);
    } else {
      byTopic.set(candidate.topicId, [candidate]);
    }
  }

  const groups = [...byTopic.values()]
    .map((group) => group.sort(sortByScore))
    .sort((a, b) => sortByScore(a[0]!, b[0]!));

  return takeRoundRobin(groups, count);
}

/** Сколько вопросов реально будет в тренировке. */
export function plannedQuestionCount(available: number, requested: number): number {
  return Math.max(0, Math.min(available, Math.trunc(requested)));
}
