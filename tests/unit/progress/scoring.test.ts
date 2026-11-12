import { describe, expect, it } from "vitest";

import {
  plannedQuestionCount,
  scoreQuestion,
  selectQuestions,
  type QuestionCandidate,
} from "@/lib/progress/scoring";
import { addDays } from "@/lib/progress/time";

const now = new Date("2026-11-12T10:00:00.000Z");

function candidate(overrides: Partial<QuestionCandidate> & { questionId: string }): QuestionCandidate {
  return {
    topicId: "topic-1",
    seenCount: 1,
    wrongCount: 0,
    masteryLevel: 2,
    nextReviewAt: null,
    lastSeenAt: addDays(now, -10),
    ...overrides,
  };
}

describe("scoreQuestion", () => {
  it("просроченный вопрос важнее нового", () => {
    const due = scoreQuestion(
      candidate({ questionId: "due", nextReviewAt: addDays(now, -1), seenCount: 2 }),
      now,
    );
    const unseen = scoreQuestion(candidate({ questionId: "new", seenCount: 0 }), now);

    expect(due).toBeGreaterThan(unseen);
  });

  it("новый вопрос важнее слабого, но не просроченного", () => {
    const unseen = scoreQuestion(candidate({ questionId: "new", seenCount: 0 }), now);
    const weak = scoreQuestion(
      candidate({ questionId: "weak", masteryLevel: 0, seenCount: 5, wrongCount: 4 }),
      now,
    );

    expect(unseen).toBeGreaterThan(weak);
  });

  it("штрафует недавно виденный вопрос", () => {
    const recent = scoreQuestion(
      candidate({
        questionId: "same",
        lastSeenAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      }),
      now,
    );
    const old = scoreQuestion(
      candidate({ questionId: "same", lastSeenAt: addDays(now, -10) }),
      now,
    );

    expect(recent).toBeLessThan(old);
  });

  it("добавляет интерес к теме", () => {
    const interested = scoreQuestion(candidate({ questionId: "q", interestWeight: 1 }), now);
    const neutral = scoreQuestion(candidate({ questionId: "q", interestWeight: 0 }), now);

    expect(interested - neutral).toBe(40);
  });
});

describe("selectQuestions", () => {
  it("возвращает не больше запрошенного количества", () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      candidate({ questionId: `q-${index}` }),
    );

    expect(selectQuestions(items, { count: 10, now })).toHaveLength(10);
  });

  it("возвращает все вопросы, если их меньше запрошенного", () => {
    const items = [candidate({ questionId: "a" }), candidate({ questionId: "b" })];

    expect(selectQuestions(items, { count: 30, now })).toHaveLength(2);
  });

  it("при count = 0 возвращает пустой список", () => {
    expect(selectQuestions([candidate({ questionId: "a" })], { count: 0, now })).toEqual([]);
  });

  it("сначала отдаёт просроченные", () => {
    const items = [
      candidate({ questionId: "new", seenCount: 0 }),
      candidate({ questionId: "due", nextReviewAt: addDays(now, -2) }),
      candidate({ questionId: "normal" }),
    ];

    const selected = selectQuestions(items, { count: 1, now });
    expect(selected[0]?.questionId).toBe("due");
  });

  it("для раздела распределяет вопросы по темам", () => {
    const items = [
      ...Array.from({ length: 8 }, (_, index) =>
        candidate({ questionId: `a-${index}`, topicId: "topic-a" }),
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        candidate({ questionId: `b-${index}`, topicId: "topic-b" }),
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        candidate({ questionId: `c-${index}`, topicId: "topic-c" }),
      ),
    ];

    const selected = selectQuestions(items, { count: 6, now, balanceByTopic: true });
    const topics = new Set(selected.map((item) => item.topicId));

    expect(selected).toHaveLength(6);
    expect(topics.size).toBe(3);
  });

  it("детерминирован при одинаковых данных", () => {
    const items = Array.from({ length: 20 }, (_, index) =>
      candidate({ questionId: `q-${index}` }),
    );

    const first = selectQuestions(items, { count: 10, now }).map((item) => item.questionId);
    const second = selectQuestions(items, { count: 10, now }).map((item) => item.questionId);

    expect(first).toEqual(second);
  });
});

describe("plannedQuestionCount", () => {
  it("не обещает больше, чем есть", () => {
    expect(plannedQuestionCount(24, 30)).toBe(24);
    expect(plannedQuestionCount(40, 20)).toBe(20);
  });
});
