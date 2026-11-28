import { describe, expect, it } from "vitest";

import {
  importInputSchema,
  questionInputSchema,
  topicInputSchema,
} from "@/lib/admin/schemas";

const validTopic = {
  categoryId: "cat_1",
  title: "Советское кино",
  slug: "soviet-cinema",
  description: "Фильмы, которые смотрели все.",
  coverUrl: "",
  status: "DRAFT",
};

const validQuestion = {
  text: "В каком году вышел фильм «Москва слезам не верит»?",
  explanation: "Фильм Владимира Меньшова вышел в 1979 году.",
  options: ["1975", "1979", "1981", "1984"],
  correctIndex: 1,
  difficulty: 2,
  imageUrl: "",
  imageLicense: "",
  imageSource: "",
  imageAlt: "",
  status: "PUBLISHED",
};

describe("topicInputSchema", () => {
  it("принимает корректную тему", () => {
    const parsed = topicInputSchema.safeParse(validTopic);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slug).toBe("soviet-cinema");
      expect(parsed.data.coverUrl).toBeNull();
      expect(parsed.data.status).toBe("DRAFT");
    }
  });

  it("нормализует адрес: пробелы и верхний регистр", () => {
    const parsed = topicInputSchema.safeParse({ ...validTopic, slug: "  Soviet-Cinema  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.slug).toBe("soviet-cinema");
  });

  it("отклоняет недопустимый адрес", () => {
    for (const slug of ["Советское-кино", "soviet cinema", "soviet_cinema", "-start", "a"]) {
      const parsed = topicInputSchema.safeParse({ ...validTopic, slug });
      expect(parsed.success, `slug: ${slug}`).toBe(false);
    }
  });

  it("требует название не короче двух символов", () => {
    expect(topicInputSchema.safeParse({ ...validTopic, title: "Я" }).success).toBe(false);
  });

  it("отклоняет не-http ссылку на обложку", () => {
    expect(
      topicInputSchema.safeParse({ ...validTopic, coverUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("приводит порядок к целому числу и не принимает отрицательный", () => {
    const parsed = topicInputSchema.safeParse({ ...validTopic, order: "3" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.order).toBe(3);

    expect(topicInputSchema.safeParse({ ...validTopic, order: -1 }).success).toBe(false);
    expect(topicInputSchema.safeParse({ ...validTopic, order: 1.5 }).success).toBe(false);
  });
});

describe("questionInputSchema", () => {
  it("принимает корректный опубликованный вопрос", () => {
    const parsed = questionInputSchema.safeParse(validQuestion);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("PUBLISHED");
      expect(parsed.data.imageUrl).toBeNull();
    }
  });

  it("не публикует вопрос без объяснения", () => {
    const parsed = questionInputSchema.safeParse({ ...validQuestion, explanation: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "explanation")).toBe(true);
    }
  });

  it("разрешает черновик без объяснения", () => {
    const parsed = questionInputSchema.safeParse({
      ...validQuestion,
      explanation: "",
      status: "DRAFT",
    });
    expect(parsed.success).toBe(true);
  });

  it("требует ровно четыре варианта", () => {
    expect(
      questionInputSchema.safeParse({ ...validQuestion, options: ["1", "2", "3"] }).success,
    ).toBe(false);
    expect(
      questionInputSchema.safeParse({ ...validQuestion, options: ["1", "2", "3", "4", "5"] })
        .success,
    ).toBe(false);
  });

  it("отклоняет повторяющиеся варианты", () => {
    const parsed = questionInputSchema.safeParse({
      ...validQuestion,
      options: ["1979", "1979", "1981", "1984"],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "options")).toBe(true);
    }
  });

  it("проверяет индекс правильного ответа и сложность", () => {
    expect(questionInputSchema.safeParse({ ...validQuestion, correctIndex: 4 }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...validQuestion, correctIndex: -1 }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...validQuestion, difficulty: 0 }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...validQuestion, difficulty: 4 }).success).toBe(false);
  });

  it("принимает изображение со свободной лицензией и описанием", () => {
    const parsed = questionInputSchema.safeParse({
      ...validQuestion,
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/example.jpg",
      imageLicense: "CC BY-SA 4.0",
      imageSource: "https://commons.wikimedia.org/wiki/File:Example.jpg",
      imageAlt: "Фотография здания Большого театра",
    });
    expect(parsed.success).toBe(true);
  });

  it("требует описание и лицензию, если есть изображение", () => {
    const withoutAlt = questionInputSchema.safeParse({
      ...validQuestion,
      imageUrl: "https://example.com/photo.jpg",
      imageLicense: "CC0",
    });
    expect(withoutAlt.success).toBe(false);
    if (!withoutAlt.success) {
      expect(withoutAlt.error.issues.some((issue) => issue.path[0] === "imageAlt")).toBe(true);
    }

    const withoutLicense = questionInputSchema.safeParse({
      ...validQuestion,
      imageUrl: "https://example.com/photo.jpg",
      imageAlt: "Пример изображения",
    });
    expect(withoutLicense.success).toBe(false);
    if (!withoutLicense.success) {
      expect(withoutLicense.error.issues.some((issue) => issue.path[0] === "imageLicense")).toBe(
        true,
      );
    }
  });

  it("отклоняет лицензию, которая не разрешает свободное использование", () => {
    const parsed = questionInputSchema.safeParse({
      ...validQuestion,
      imageUrl: "https://example.com/photo.jpg",
      imageLicense: "All rights reserved",
      imageAlt: "Пример изображения",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "imageLicense")).toBe(true);
    }
  });
});

describe("importInputSchema", () => {
  it("требует тему и данные", () => {
    expect(importInputSchema.safeParse({ topicId: "", data: {} }).success).toBe(false);
    expect(importInputSchema.safeParse({ topicId: "topic_1" }).success).toBe(false);
  });

  it("принимает объект questions", () => {
    const parsed = importInputSchema.safeParse({
      topicId: "topic_1",
      data: { questions: [validQuestion] },
    });
    expect(parsed.success).toBe(true);
  });
});
