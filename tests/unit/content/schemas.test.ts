import { describe, expect, it } from "vitest";

import { catalogResponseSchema, topicResponseSchema } from "@/lib/content/schemas";

function catalogTopic(overrides: Record<string, unknown> = {}) {
  return {
    id: "topic_1",
    slug: "soviet-cinema",
    title: "Советское кино",
    description: "Фильмы, которые смотрели все.",
    themeKey: "cinema",
    questionCount: 10,
    progress: null,
    ...overrides,
  };
}

function catalogCategory(topics: unknown[]) {
  return {
    id: "cat_1",
    slug: "iskusstvo",
    title: "Искусство",
    description: null,
    topics,
  };
}

function topicDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: "topic_1",
    slug: "literature",
    title: "Литература",
    description: null,
    themeKey: "literature",
    category: { slug: "nauka", title: "Наука" },
    questionCount: 12,
    progress: null,
    ...overrides,
  };
}

const progress = {
  progress: 40,
  coverage: 50,
  accuracy: 80,
  seenQuestions: 5,
  masteredQuestions: 3,
  totalQuestions: 10,
  level: 2,
  lastActivityAt: "2026-11-28T10:00:00.000Z",
};

describe("catalogResponseSchema", () => {
  it("принимает каталог с ключом оформления", () => {
    const parsed = catalogResponseSchema.safeParse({
      categories: [catalogCategory([catalogTopic()])],
    });
    expect(parsed.success).toBe(true);
  });

  it("принимает тему без оформления", () => {
    const parsed = catalogResponseSchema.safeParse({
      categories: [catalogCategory([catalogTopic({ slug: "paintings", themeKey: null })])],
    });
    expect(parsed.success).toBe(true);
  });

  it("принимает прогресс с датой последней активности", () => {
    const parsed = catalogResponseSchema.safeParse({
      categories: [catalogCategory([catalogTopic({ progress })])],
    });
    expect(parsed.success).toBe(true);
  });

  it("отклоняет неизвестный ключ оформления", () => {
    const parsed = catalogResponseSchema.safeParse({
      categories: [catalogCategory([catalogTopic({ themeKey: "neon" })])],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("topicResponseSchema", () => {
  it("принимает тему с ключом оформления", () => {
    const parsed = topicResponseSchema.safeParse({ topic: topicDetail() });
    expect(parsed.success).toBe(true);
  });

  it("принимает тему без оформления", () => {
    const parsed = topicResponseSchema.safeParse({
      topic: topicDetail({ slug: "technology", themeKey: null }),
    });
    expect(parsed.success).toBe(true);
  });

  it("принимает прогресс с датой последней активности", () => {
    const parsed = topicResponseSchema.safeParse({ topic: topicDetail({ progress }) });
    expect(parsed.success).toBe(true);
  });

  it("отклоняет неизвестный ключ оформления", () => {
    const parsed = topicResponseSchema.safeParse({
      topic: topicDetail({ themeKey: "neon" }),
    });
    expect(parsed.success).toBe(false);
  });
});
