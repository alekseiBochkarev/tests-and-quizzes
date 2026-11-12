import { addDays, elapsedDays } from "@/lib/progress/time";

/**
 * Освоение вопроса (mastery 0–5) по docs/03-progress-model.md §3.
 *
 * Правила намеренно простые: ошибка — не приговор, а сигнал вернуть вопрос
 * в очередь повторения. Все переходы покрыты unit-тестами.
 */

export const MAX_MASTERY = 5;
export const MASTERED_FROM = 4;

export type QuestionProgressState = {
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  correctStreak: number;
  attemptsWithCorrect: number;
  masteryLevel: number;
  lastSeenAt: Date | null;
  nextReviewAt: Date | null;
};

export type QuestionProgressInput = {
  isCorrect: boolean;
  now: Date;
};

export type QuestionProgressUpdate = QuestionProgressState & {
  masteryBefore: number;
  masteryAfter: number;
};

export type QuestionProgressDefaults = Partial<QuestionProgressState>;

export function emptyQuestionProgress(): QuestionProgressState {
  return {
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    correctStreak: 0,
    attemptsWithCorrect: 0,
    masteryLevel: 0,
    lastSeenAt: null,
    nextReviewAt: null,
  };
}

function reviewIntervalDays(masteryLevel: number): number {
  switch (masteryLevel) {
    case 2:
      return 3;
    case 3:
      return 7;
    case 4:
      return 16;
    case 5:
      return 35;
    default:
      return 1;
  }
}

/** Следующий mastery при верном ответе. */
export function masteryAfterCorrect(current: QuestionProgressState, now: Date): number {
  const mastery = current.masteryLevel;
  const streak = current.correctStreak + 1;

  if (mastery <= 1) return 2;
  if (mastery === 2) return streak >= 2 ? 3 : 2;
  if (mastery === 3) {
    return streak >= 3 && current.attemptsWithCorrect + 1 >= 2 ? 4 : 3;
  }
  if (mastery === 4) {
    const waited = current.lastSeenAt ? elapsedDays(current.lastSeenAt, now) : 0;
    return waited >= 7 ? 5 : 4;
  }

  return 5;
}

/** Следующий mastery при неверном ответе. */
export function masteryAfterWrong(current: QuestionProgressState): number {
  switch (current.masteryLevel) {
    case 0:
      return 1;
    case 1:
      return 1;
    case 2:
      return 1;
    default:
      // 3 → 2, 4 → 3, 5 → 3 (падение на 2 для освоенного).
      return current.masteryLevel === 5 ? 3 : current.masteryLevel - 1;
  }
}

/**
 * Обновление прогресса после одного ответа.
 *
 * `attemptsWithCorrect` увеличивается на 1 при верном ответе: в одной попытке
 * вопрос задаётся один раз, поэтому каждый верный ответ — вклад новой попытки.
 */
export function nextQuestionProgress(
  currentInput: QuestionProgressDefaults | undefined,
  input: QuestionProgressInput,
): QuestionProgressUpdate {
  const current: QuestionProgressState = {
    ...emptyQuestionProgress(),
    ...currentInput,
  };

  const masteryBefore = current.masteryLevel;
  const masteryAfter = input.isCorrect
    ? masteryAfterCorrect(current, input.now)
    : masteryAfterWrong(current);

  const nextReviewAt = input.isCorrect
    ? addDays(input.now, reviewIntervalDays(masteryAfter))
    : addDays(input.now, 1);

  return {
    seenCount: current.seenCount + 1,
    correctCount: current.correctCount + (input.isCorrect ? 1 : 0),
    wrongCount: current.wrongCount + (input.isCorrect ? 0 : 1),
    correctStreak: input.isCorrect ? current.correctStreak + 1 : 0,
    attemptsWithCorrect: current.attemptsWithCorrect + (input.isCorrect ? 1 : 0),
    masteryLevel: masteryAfter,
    lastSeenAt: input.now,
    nextReviewAt,
    masteryBefore,
    masteryAfter,
  };
}

/** Пора ли повторить вопрос. */
export function isDue(progress: { nextReviewAt: Date | null }, now: Date): boolean {
  return progress.nextReviewAt !== null && progress.nextReviewAt.getTime() <= now.getTime();
}
