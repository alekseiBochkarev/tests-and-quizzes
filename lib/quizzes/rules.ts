import { ContentStatus } from "@/lib/generated/prisma/enums";

/**
 * Правила готового выпуска.
 *
 * Выпуск — именованный набор 10–12 вопросов внутри одной темы. Если после
 * архивации вопросов в наборе осталось меньше 10, выпуск скрывается: обещать
 * «тест на 10 вопросов» и показать 7 нельзя.
 */

export const QUIZ_MIN_QUESTIONS = 10;
export const QUIZ_MAX_QUESTIONS = 12;

export function isPlayableQuizSize(questionCount: number): boolean {
  return (
    Number.isInteger(questionCount) &&
    questionCount >= QUIZ_MIN_QUESTIONS &&
    questionCount <= QUIZ_MAX_QUESTIONS
  );
}

export type QuizQuestionLink = {
  order: number;
  question: {
    id: string;
    topicId: string;
    status: ContentStatus;
  };
};

/**
 * Возвращает id вопросов выпуска в заданном порядке.
 *
 * Отбрасываем архивные и черновые вопросы, вопросы из другой темы и дубликаты.
 * Это защита от «поезда» контента: импорт может архивировать демо-вопрос, и
 * выпуск не должен из-за этого показать битую попытку.
 */
export function playableQuizQuestionIds(
  links: readonly QuizQuestionLink[],
  topicId: string,
): string[] {
  const seen = new Set<string>();

  return [...links]
    .sort((left, right) => left.order - right.order)
    .filter((link) => {
      if (link.question.topicId !== topicId) return false;
      if (link.question.status !== ContentStatus.PUBLISHED) return false;
      if (seen.has(link.question.id)) return false;
      seen.add(link.question.id);
      return true;
    })
    .map((link) => link.question.id);
}
