import { describe, expect, it } from "vitest";

import { hasDuplicateOptions, questionContentChanged } from "@/lib/admin/contentRules";

const existing = {
  text: "Кто написал «Войну и мир»?",
  options: [
    { text: "А. С. Пушкин", isCorrect: false },
    { text: "Л. Н. Толстой", isCorrect: true },
    { text: "Ф. М. Достоевский", isCorrect: false },
    { text: "И. С. Тургенев", isCorrect: false },
  ],
};

describe("questionContentChanged", () => {
  it("не считает изменением тот же текст и те же варианты", () => {
    expect(
      questionContentChanged(existing, {
        text: existing.text,
        options: existing.options.map((option) => option.text),
        correctIndex: 1,
      }),
    ).toBe(false);
  });

  it("не зависит от пробелов по краям текста", () => {
    expect(
      questionContentChanged(existing, {
        text: `  ${existing.text}  `,
        options: existing.options.map((option) => option.text),
        correctIndex: 1,
      }),
    ).toBe(false);
  });

  it("замечает изменение текста", () => {
    expect(
      questionContentChanged(existing, {
        text: "Кто написал роман «Война и мир»?",
        options: existing.options.map((option) => option.text),
        correctIndex: 1,
      }),
    ).toBe(true);
  });

  it("замечает изменение правильного ответа", () => {
    expect(
      questionContentChanged(existing, {
        text: existing.text,
        options: existing.options.map((option) => option.text),
        correctIndex: 0,
      }),
    ).toBe(true);
  });

  it("замечает изменение варианта", () => {
    expect(
      questionContentChanged(existing, {
        text: existing.text,
        options: ["А. С. Пушкин", "Л. Н. Толстой", "Ф. М. Достоевский", "А. П. Чехов"],
        correctIndex: 1,
      }),
    ).toBe(true);
  });

  it("считает изменением пропавший вариант", () => {
    expect(
      questionContentChanged(existing, {
        text: existing.text,
        options: ["А. С. Пушкин", "Л. Н. Толстой", "Ф. М. Достоевский"],
        correctIndex: 1,
      }),
    ).toBe(true);
  });
});

describe("hasDuplicateOptions", () => {
  it("находит повторы с учётом регистра, ё и пробелов", () => {
    expect(hasDuplicateOptions(["Ёлка", "елка", "Сосна", "Дуб"])).toBe(true);
    expect(hasDuplicateOptions(["  Дуб ", "дуб", "Сосна", "Клён"])).toBe(true);
  });

  it("не считает разные варианты повтором", () => {
    expect(hasDuplicateOptions(["Дуб", "Сосна", "Клён", "Берёза"])).toBe(false);
  });
});
