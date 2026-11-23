import { describe, expect, it } from "vitest";

import { ContentStatus } from "@/lib/generated/prisma/enums";
import {
  isPlayableQuizSize,
  playableQuizQuestionIds,
  type QuizQuestionLink,
} from "@/lib/quizzes/rules";

const TOPIC_ID = "topic-1";

function link(
  id: string,
  order: number,
  status: ContentStatus = ContentStatus.PUBLISHED,
  topicId = TOPIC_ID,
): QuizQuestionLink {
  return { order, question: { id, topicId, status } };
}

describe("isPlayableQuizSize", () => {
  it("разрешает только целое число вопросов от 10 до 12", () => {
    expect(isPlayableQuizSize(9)).toBe(false);
    expect(isPlayableQuizSize(10)).toBe(true);
    expect(isPlayableQuizSize(11)).toBe(true);
    expect(isPlayableQuizSize(12)).toBe(true);
    expect(isPlayableQuizSize(13)).toBe(false);
    expect(isPlayableQuizSize(10.5)).toBe(false);
  });
});

describe("playableQuizQuestionIds", () => {
  it("возвращает вопросы в порядке выпуска, а не в порядке связей", () => {
    const links = [link("q3", 2), link("q1", 0), link("q2", 1)];

    expect(playableQuizQuestionIds(links, TOPIC_ID)).toEqual(["q1", "q2", "q3"]);
  });

  it("не включает архивные и черновые вопросы", () => {
    const links = [
      link("published", 0),
      link("archived", 1, ContentStatus.ARCHIVED),
      link("draft", 2, ContentStatus.DRAFT),
    ];

    expect(playableQuizQuestionIds(links, TOPIC_ID)).toEqual(["published"]);
  });

  it("не включает вопросы из другой темы", () => {
    const links = [link("own", 0), link("foreign", 1, ContentStatus.PUBLISHED, "topic-2")];

    expect(playableQuizQuestionIds(links, TOPIC_ID)).toEqual(["own"]);
  });

  it("убирает дубликаты, даже если связь повторяется", () => {
    const links = [link("q1", 0), link("q1", 1), link("q2", 2)];

    expect(playableQuizQuestionIds(links, TOPIC_ID)).toEqual(["q1", "q2"]);
  });

  it("после архивации части вопросов набор может стать короче минимума", () => {
    const links = Array.from({ length: 10 }, (_, index) => link(`q${index}`, index));
    links[4] = link("q4", 4, ContentStatus.ARCHIVED);

    const ids = playableQuizQuestionIds(links, TOPIC_ID);

    expect(ids).toHaveLength(9);
    expect(isPlayableQuizSize(ids.length)).toBe(false);
  });
});
