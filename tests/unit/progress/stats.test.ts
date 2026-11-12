import { describe, expect, it } from "vitest";

import {
  accuracyPercent,
  computeTopicAggregate,
  nextDailyStreak,
  topicLevel,
  xpForAnswer,
  xpForCompletion,
} from "@/lib/progress/stats";
import { dateFromKey } from "@/lib/progress/time";

describe("computeTopicAggregate", () => {
  it("считает пример из docs/03-progress-model.md §4.4", () => {
    // 6 вопросов × mastery 2, 8 × 3, 4 × 4 = 52 балла mastery.
    const progresses = [
      ...Array.from({ length: 6 }, () => ({ masteryLevel: 2, seenCount: 1, correctCount: 1 })),
      ...Array.from({ length: 8 }, () => ({ masteryLevel: 3, seenCount: 1, correctCount: 1 })),
      ...Array.from({ length: 4 }, () => ({ masteryLevel: 4, seenCount: 1, correctCount: 1 })),
    ];
    // Всего 18 уникальных вопросов, 22 ответа, 15 верных.
    progresses[0]!.seenCount = 5;
    // Три вопроса видел, но пока не ответил верно — итого 15 верных из 22.
    progresses[3]!.correctCount = 0;
    progresses[7]!.correctCount = 0;
    progresses[15]!.correctCount = 0;

    const result = computeTopicAggregate(60, progresses);

    expect(result.seenQuestions).toBe(18);
    expect(result.masteredQuestions).toBe(4);
    expect(result.answeredCount).toBe(22);
    expect(result.correctCount).toBe(15);
    expect(result.coverage).toBeCloseTo(30, 5);
    expect(result.quality).toBeCloseTo(57.777, 2);
    expect(result.progress).toBeCloseTo(17.333, 2);
    expect(result.accuracy).toBeCloseTo(68.181, 2);
    expect(result.level).toBe(2);
  });

  it("пустая тема даёт нули без деления на ноль", () => {
    expect(computeTopicAggregate(0, [])).toMatchObject({
      totalQuestions: 0,
      seenQuestions: 0,
      progress: 0,
      coverage: 0,
      quality: 0,
      accuracy: 0,
      level: 0,
    });
  });

  it("не учитывает вопросы без просмотра в качестве и охвате", () => {
    const result = computeTopicAggregate(10, [
      { masteryLevel: 5, seenCount: 2, correctCount: 2 },
      { masteryLevel: 0, seenCount: 0, correctCount: 0 },
    ]);

    expect(result.seenQuestions).toBe(1);
    expect(result.coverage).toBe(10);
    expect(result.quality).toBe(100);
    expect(result.progress).toBe(10);
    expect(result.level).toBe(1);
  });
});

describe("topicLevel", () => {
  it.each([
    [0, 0],
    [4.9, 0],
    [5, 1],
    [15, 2],
    [35, 3],
    [60, 4],
    [85, 5],
    [100, 5],
  ])("progress %f → уровень %i", (progress, level) => {
    expect(topicLevel(progress)).toBe(level);
  });
});

describe("xpForAnswer", () => {
  it("начисляет баллы по правилам", () => {
    expect(xpForAnswer(true, false)).toBe(10);
    expect(xpForAnswer(true, true)).toBe(12);
    expect(xpForAnswer(false, false)).toBe(2);
    expect(xpForAnswer(false, true)).toBe(2);
  });
});

describe("xpForCompletion", () => {
  it("даёт бонус за завершение и идеальный результат", () => {
    expect(xpForCompletion(false)).toBe(5);
    expect(xpForCompletion(true)).toBe(30);
  });
});

describe("nextDailyStreak", () => {
  const timezone = "Europe/Moscow";

  it("первый активный день начинает серию", () => {
    const result = nextDailyStreak(
      { dailyStreak: 0, longestStreak: 0, lastActiveDate: null },
      new Date("2026-11-12T10:00:00.000Z"),
      timezone,
    );

    expect(result.dailyStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.lastActiveDate).toEqual(dateFromKey("2026-11-12"));
  });

  it("вчерашняя активность продолжает серию", () => {
    const result = nextDailyStreak(
      {
        dailyStreak: 4,
        longestStreak: 7,
        lastActiveDate: dateFromKey("2026-11-11"),
      },
      new Date("2026-11-12T10:00:00.000Z"),
      timezone,
    );

    expect(result.dailyStreak).toBe(5);
    expect(result.longestStreak).toBe(7);
  });

  it("повторная активность в тот же день не увеличивает серию", () => {
    const result = nextDailyStreak(
      {
        dailyStreak: 4,
        longestStreak: 4,
        lastActiveDate: dateFromKey("2026-11-12"),
      },
      new Date("2026-11-12T20:00:00.000Z"),
      timezone,
    );

    expect(result.dailyStreak).toBe(4);
  });

  it("пропуск дня сбрасывает серию, но сохраняет рекорд", () => {
    const result = nextDailyStreak(
      {
        dailyStreak: 9,
        longestStreak: 9,
        lastActiveDate: dateFromKey("2026-11-09"),
      },
      new Date("2026-11-12T10:00:00.000Z"),
      timezone,
    );

    expect(result.dailyStreak).toBe(1);
    expect(result.longestStreak).toBe(9);
  });

  it("учитывает локальный часовой пояс", () => {
    // 22:30 UTC 11 ноября — это уже 12 ноября в Москве.
    const result = nextDailyStreak(
      {
        dailyStreak: 1,
        longestStreak: 1,
        lastActiveDate: dateFromKey("2026-11-11"),
      },
      new Date("2026-11-11T22:30:00.000Z"),
      timezone,
    );

    expect(result.lastActiveDate).toEqual(dateFromKey("2026-11-12"));
    expect(result.dailyStreak).toBe(2);
  });
});

describe("accuracyPercent", () => {
  it("защищает от деления на ноль", () => {
    expect(accuracyPercent(0, 0)).toBe(0);
    expect(accuracyPercent(3, 4)).toBe(75);
  });
});
