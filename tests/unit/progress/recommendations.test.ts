import { describe, expect, it } from "vitest";

import { recommendTopics, scoreTopic } from "@/lib/progress/recommendations";
import { addDays } from "@/lib/progress/time";

const now = new Date("2026-11-12T10:00:00.000Z");

describe("scoreTopic", () => {
  it("поднимает тему с просроченными вопросами", () => {
    const due = scoreTopic(
      {
        topicId: "due",
        interestWeight: 0,
        dueQuestions: 5,
        progress: 20,
        unseenQuestions: 10,
        lastActivityAt: null,
      },
      now,
    );
    const calm = scoreTopic(
      {
        topicId: "calm",
        interestWeight: 0,
        dueQuestions: 0,
        progress: 20,
        unseenQuestions: 10,
        lastActivityAt: null,
      },
      now,
    );

    expect(due.score).toBeGreaterThan(calm.score);
    expect(due.reason).toBe("review");
  });

  it("учитывает явный интерес", () => {
    const interested = scoreTopic(
      {
        topicId: "interest",
        interestWeight: 2,
        dueQuestions: 0,
        progress: 50,
        unseenQuestions: 5,
        lastActivityAt: null,
      },
      now,
    );

    expect(interested.reason).toBe("interest");
    expect(interested.score).toBe(2 * 50 + 0 + 50 * 0.5 + 5 * 0.3);
  });

  it("снижает недавно активную тему", () => {
    const recent = scoreTopic(
      {
        topicId: "recent",
        interestWeight: 1,
        dueQuestions: 0,
        progress: 50,
        unseenQuestions: 5,
        lastActivityAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      now,
    );
    const old = scoreTopic(
      {
        topicId: "old",
        interestWeight: 1,
        dueQuestions: 0,
        progress: 50,
        unseenQuestions: 5,
        lastActivityAt: addDays(now, -10),
      },
      now,
    );

    expect(recent.score).toBe(old.score - 60);
  });

  it("не выходит за границы прогресса 0–100", () => {
    const low = scoreTopic(
      {
        topicId: "low",
        interestWeight: 0,
        dueQuestions: 0,
        progress: -50,
        unseenQuestions: 0,
        lastActivityAt: null,
      },
      now,
    );
    const high = scoreTopic(
      {
        topicId: "high",
        interestWeight: 0,
        dueQuestions: 0,
        progress: 150,
        unseenQuestions: 0,
        lastActivityAt: null,
      },
      now,
    );

    expect(low.score).toBe(50);
    expect(high.score).toBe(0);
  });
});

describe("recommendTopics", () => {
  it("сортирует по убыванию и ограничивает количество", () => {
    const result = recommendTopics(
      [
        {
          topicId: "a",
          interestWeight: 0,
          dueQuestions: 0,
          progress: 90,
          unseenQuestions: 1,
          lastActivityAt: null,
        },
        {
          topicId: "b",
          interestWeight: 2,
          dueQuestions: 0,
          progress: 10,
          unseenQuestions: 10,
          lastActivityAt: null,
        },
        {
          topicId: "c",
          interestWeight: 1,
          dueQuestions: 5,
          progress: 50,
          unseenQuestions: 5,
          lastActivityAt: null,
        },
      ],
      now,
      2,
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.topicId).toBe("c");
    expect(result[1]?.topicId).toBe("b");
  });

  it("при равенстве сортирует по topicId для стабильности", () => {
    const inputs = ["b", "a"].map((topicId) => ({
      topicId,
      interestWeight: 0,
      dueQuestions: 0,
      progress: 50,
      unseenQuestions: 5,
      lastActivityAt: null,
    }));

    expect(recommendTopics(inputs, now).map((item) => item.topicId)).toEqual(["a", "b"]);
  });
});
