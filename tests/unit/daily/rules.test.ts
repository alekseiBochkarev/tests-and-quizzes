import { describe, expect, it } from "vitest";

import {
  DAILY_MIN_QUESTIONS,
  DAILY_TEST_SIZE,
  dailyDate,
  dailyDateKey,
  isDailySetPlayable,
  selectDailyQuestions,
  type DailyCandidate,
} from "@/lib/daily/rules";
import { dateFromKey } from "@/lib/progress/time";

function makeCandidates(topics: number, perTopic: number): DailyCandidate[] {
  return Array.from({ length: topics }, (_, topicIndex) =>
    Array.from({ length: perTopic }, (_, questionIndex) => ({
      topicId: `topic-${topicIndex + 1}`,
      questionId: `question-${topicIndex + 1}-${questionIndex + 1}`,
    })),
  ).flat();
}

describe("dailyDateKey", () => {
  it("переключает день в 00:00 по Москве", () => {
    expect(dailyDateKey(new Date("2026-11-11T20:59:59.000Z"))).toBe("2026-11-11");
    expect(dailyDateKey(new Date("2026-11-11T21:00:00.000Z"))).toBe("2026-11-12");
  });

  it("даёт UTC-полночь московской даты для колонки date", () => {
    expect(dailyDate(new Date("2026-11-11T21:30:00.000Z"))).toEqual(dateFromKey("2026-11-12"));
  });
});

describe("isDailySetPlayable", () => {
  it("требует минимум 5 вопросов", () => {
    expect(isDailySetPlayable(DAILY_MIN_QUESTIONS - 1)).toBe(false);
    expect(isDailySetPlayable(DAILY_MIN_QUESTIONS)).toBe(true);
    expect(isDailySetPlayable(DAILY_TEST_SIZE)).toBe(true);
  });
});

describe("selectDailyQuestions", () => {
  it("берёт 5–7 вопросов из разных тем", () => {
    const selected = selectDailyQuestions(makeCandidates(10, 3), "2026-11-24");

    expect(selected).toHaveLength(DAILY_TEST_SIZE);
    expect(new Set(selected.map((item) => item.topicId)).size).toBe(DAILY_TEST_SIZE);
    expect(new Set(selected.map((item) => item.questionId)).size).toBe(DAILY_TEST_SIZE);
  });

  it("не зависит от порядка входного списка", () => {
    const candidates = makeCandidates(10, 3);
    const first = selectDailyQuestions(candidates, "2026-11-24");
    const second = selectDailyQuestions([...candidates].reverse(), "2026-11-24");

    expect(second).toEqual(first);
  });

  it("добирает вопросы из тех же тем, если тем меньше размера набора", () => {
    const selected = selectDailyQuestions(makeCandidates(3, 3), "2026-11-24");

    expect(selected).toHaveLength(DAILY_TEST_SIZE);
    expect(new Set(selected.map((item) => item.topicId)).size).toBe(3);
  });

  it("не повторяет вопрос и не добирает лишнее", () => {
    const candidates = [
      ...makeCandidates(1, 1),
      { topicId: "topic-1", questionId: "question-1-1" },
      { topicId: "topic-2", questionId: "question-2-1" },
    ];

    const selected = selectDailyQuestions(candidates, "2026-11-24");

    expect(selected).toHaveLength(2);
    expect(new Set(selected.map((item) => item.questionId)).size).toBe(2);
    expect(isDailySetPlayable(selected.length)).toBe(false);
  });

  it("возвращает пустой набор при size = 0", () => {
    expect(selectDailyQuestions(makeCandidates(5, 2), "2026-11-24", 0)).toEqual([]);
  });
});
