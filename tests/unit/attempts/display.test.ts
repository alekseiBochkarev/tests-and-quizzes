import { describe, expect, it } from "vitest";

import { attemptKindLabel, attemptTitle } from "@/lib/attempts/display";

const empty = {
  mode: "TRAINING",
  quizTitle: null,
  topicTitle: null,
  categoryTitle: null,
};

describe("attemptTitle", () => {
  it("«Тест дня» важнее названий темы", () => {
    expect(
      attemptTitle({ ...empty, mode: "DAILY", topicTitle: "История", quizTitle: "Выпуск" }),
    ).toBe("Тест дня");
  });

  it("название выпуска важнее темы", () => {
    expect(
      attemptTitle({
        ...empty,
        quizTitle: "История: основной выпуск",
        topicTitle: "История",
        categoryTitle: "Общие знания",
      }),
    ).toBe("История: основной выпуск");
  });

  it("падает до темы, раздела и нейтральной подписи", () => {
    expect(attemptTitle({ ...empty, topicTitle: "История" })).toBe("История");
    expect(attemptTitle({ ...empty, categoryTitle: "Общие знания" })).toBe("Общие знания");
    expect(attemptTitle(empty)).toBe("Тренировка");
  });
});

describe("attemptKindLabel", () => {
  it("у выпуска есть уточнение формата", () => {
    expect(attemptKindLabel({ ...empty, quizTitle: "История: основной выпуск" })).toBe(
      "Выпуск «История: основной выпуск»",
    );
  });

  it("у теста дня и темы подпись совпадает с названием", () => {
    expect(attemptKindLabel({ ...empty, mode: "DAILY" })).toBe("Тест дня");
    expect(attemptKindLabel({ ...empty, topicTitle: "История" })).toBe("История");
  });
});
