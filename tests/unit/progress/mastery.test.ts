import { describe, expect, it } from "vitest";

import {
  emptyQuestionProgress,
  isDue,
  masteryAfterCorrect,
  masteryAfterWrong,
  nextQuestionProgress,
  type QuestionProgressState,
} from "@/lib/progress/mastery";
import { addDays } from "@/lib/progress/time";

const now = new Date("2026-11-12T10:00:00.000Z");

function state(overrides: Partial<QuestionProgressState>): QuestionProgressState {
  return { ...emptyQuestionProgress(), ...overrides };
}

describe("nextQuestionProgress: верные ответы", () => {
  it("первый верный ответ даёт mastery 2 и повтор через 3 дня", () => {
    const result = nextQuestionProgress(undefined, { isCorrect: true, now });

    expect(result.masteryAfter).toBe(2);
    expect(result.correctStreak).toBe(1);
    expect(result.attemptsWithCorrect).toBe(1);
    expect(result.seenCount).toBe(1);
    expect(result.wrongCount).toBe(0);
    expect(result.nextReviewAt).toEqual(addDays(now, 3));
  });

  it("второй верный ответ подряд поднимает до 3 и ставит повтор через 7 дней", () => {
    const current = state({
      seenCount: 1,
      correctCount: 1,
      correctStreak: 1,
      attemptsWithCorrect: 1,
      masteryLevel: 2,
      lastSeenAt: addDays(now, -3),
    });

    const result = nextQuestionProgress(current, { isCorrect: true, now });

    expect(result.masteryAfter).toBe(3);
    expect(result.correctStreak).toBe(2);
    expect(result.nextReviewAt).toEqual(addDays(now, 7));
  });

  it("третий верный ответ в разных попытках даёт 4 и повтор через 16 дней", () => {
    const current = state({
      seenCount: 2,
      correctCount: 2,
      correctStreak: 2,
      attemptsWithCorrect: 2,
      masteryLevel: 3,
      lastSeenAt: addDays(now, -7),
    });

    const result = nextQuestionProgress(current, { isCorrect: true, now });

    expect(result.masteryAfter).toBe(4);
    expect(result.attemptsWithCorrect).toBe(3);
    expect(result.nextReviewAt).toEqual(addDays(now, 16));
  });

  it("не поднимает до 4, если верный ответ только в одной попытке", () => {
    const current = state({
      seenCount: 2,
      correctCount: 2,
      correctStreak: 2,
      attemptsWithCorrect: 0,
      masteryLevel: 3,
      lastSeenAt: addDays(now, -1),
    });

    const result = nextQuestionProgress(current, { isCorrect: true, now });

    expect(result.masteryAfter).toBe(3);
  });

  it("поднимает до 5 только после интервала не меньше 7 дней", () => {
    const base = state({
      seenCount: 3,
      correctCount: 3,
      correctStreak: 3,
      attemptsWithCorrect: 3,
      masteryLevel: 4,
      lastSeenAt: addDays(now, -7),
    });

    const result = nextQuestionProgress(base, { isCorrect: true, now });
    expect(result.masteryAfter).toBe(5);
    expect(result.nextReviewAt).toEqual(addDays(now, 35));
  });

  it("оставляет 4, если с прошлого ответа прошло меньше 7 дней", () => {
    const base = state({
      seenCount: 3,
      correctCount: 3,
      correctStreak: 3,
      attemptsWithCorrect: 3,
      masteryLevel: 4,
      lastSeenAt: addDays(now, -3),
    });

    const result = nextQuestionProgress(base, { isCorrect: true, now });
    expect(result.masteryAfter).toBe(4);
  });
});

describe("nextQuestionProgress: ошибки", () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 3],
    [5, 3],
  ])("mastery %i после ошибки становится %i", (before, after) => {
    const current = state({ masteryLevel: before, correctStreak: 4 });
    expect(masteryAfterWrong(current)).toBe(after);
  });

  it("сбрасывает серию и ставит повтор на завтра", () => {
    const current = state({
      seenCount: 3,
      correctCount: 3,
      correctStreak: 3,
      attemptsWithCorrect: 2,
      masteryLevel: 4,
      lastSeenAt: addDays(now, -20),
    });

    const result = nextQuestionProgress(current, { isCorrect: false, now });

    expect(result.masteryAfter).toBe(3);
    expect(result.correctStreak).toBe(0);
    expect(result.wrongCount).toBe(1);
    expect(result.nextReviewAt).toEqual(addDays(now, 1));
    expect(result.attemptsWithCorrect).toBe(2);
  });
});

describe("masteryAfterCorrect: границы", () => {
  it("для mastery 5 остаётся 5", () => {
    const current = state({ masteryLevel: 5, correctStreak: 10 });
    expect(masteryAfterCorrect(current, now)).toBe(5);
  });

  it("isDue сравнивает дату повторения с текущим моментом", () => {
    expect(isDue({ nextReviewAt: addDays(now, -1) }, now)).toBe(true);
    expect(isDue({ nextReviewAt: addDays(now, 1) }, now)).toBe(false);
    expect(isDue({ nextReviewAt: null }, now)).toBe(false);
  });
});
