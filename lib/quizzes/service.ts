import { prisma } from "@/lib/db";
import { ContentStatus } from "@/lib/generated/prisma/enums";

import { isPlayableQuizSize, playableQuizQuestionIds, type QuizQuestionLink } from "./rules";

/** Выпуск в списке темы: только название, описание и число вопросов. */
export type TopicQuizSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  questionCount: number;
};

export type QuizDetails = TopicQuizSummary & {
  topic: {
    id: string;
    slug: string;
    title: string;
    category: { slug: string; title: string };
  };
};

const quizQuestionsSelect = {
  orderBy: { order: "asc" as const },
  select: {
    order: true,
    question: { select: { id: true, topicId: true, status: true } },
  },
};

function playableCount(links: readonly QuizQuestionLink[], topicId: string): number {
  return playableQuizQuestionIds(links, topicId).length;
}

/**
 * Выпуски темы, которые можно пройти прямо сейчас.
 * Выпуск с архивными вопросами или меньше чем 10 вопросами не показываем.
 */
export async function getTopicQuizzes(topicId: string): Promise<TopicQuizSummary[]> {
  const quizzes = await prisma.quiz.findMany({
    where: { topicId, status: ContentStatus.PUBLISHED },
    orderBy: [{ createdAt: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      questions: quizQuestionsSelect,
    },
  });

  return quizzes
    .map((quiz) => ({
      id: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      description: quiz.description,
      questionCount: playableCount(quiz.questions, topicId),
    }))
    .filter((quiz) => isPlayableQuizSize(quiz.questionCount));
}

/** Постоянная ссылка `/tests/[topicSlug]/[quizSlug]`. */
export async function getQuizBySlug(
  topicSlug: string,
  quizSlug: string,
): Promise<QuizDetails | null> {
  const quiz = await prisma.quiz.findFirst({
    where: {
      slug: quizSlug,
      status: ContentStatus.PUBLISHED,
      topic: { slug: topicSlug, status: ContentStatus.PUBLISHED },
    },
    select: {
      id: true,
      topicId: true,
      slug: true,
      title: true,
      description: true,
      topic: {
        select: {
          id: true,
          slug: true,
          title: true,
          category: { select: { slug: true, title: true } },
        },
      },
      questions: quizQuestionsSelect,
    },
  });

  if (!quiz) return null;

  const questionCount = playableCount(quiz.questions, quiz.topicId);
  if (!isPlayableQuizSize(questionCount)) return null;

  return {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description,
    questionCount,
    topic: quiz.topic,
  };
}

export type PlayableQuiz = {
  id: string;
  topicId: string;
  title: string;
  questionIds: string[];
};

export type PlayableQuizLookup =
  { status: "ok"; quiz: PlayableQuiz } | { status: "not_found" } | { status: "unavailable" };

/**
 * Проверяет выпуск перед созданием попытки.
 * `not_found` — выпуск скрыт или удалён; `unavailable` — набор перестал быть
 * полным (например, вопросы ушли в архив).
 */
export async function lookupPlayableQuiz(quizId: string): Promise<PlayableQuizLookup> {
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      status: ContentStatus.PUBLISHED,
      topic: { status: ContentStatus.PUBLISHED },
    },
    select: {
      id: true,
      topicId: true,
      title: true,
      questions: quizQuestionsSelect,
    },
  });

  if (!quiz) return { status: "not_found" };

  const questionIds = playableQuizQuestionIds(quiz.questions, quiz.topicId);
  if (!isPlayableQuizSize(questionIds.length)) return { status: "unavailable" };

  return {
    status: "ok",
    quiz: { id: quiz.id, topicId: quiz.topicId, title: quiz.title, questionIds },
  };
}
