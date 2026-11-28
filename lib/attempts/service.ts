import { prisma } from "@/lib/db";
import { AttemptMode, AttemptStatus, ContentStatus } from "@/lib/generated/prisma/enums";
import type { AttemptMode as AttemptModeType } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { nextQuestionProgress } from "@/lib/progress/mastery";
import { levelForXp } from "@/lib/progress/level";
import { selectQuestions, type QuestionCandidate } from "@/lib/progress/scoring";
import { lookupPlayableQuiz } from "@/lib/quizzes/service";
import { DAILY_BONUS_XP } from "@/lib/daily/rules";
import {
  computeTopicAggregate,
  nextDailyStreak,
  xpForAnswer,
  xpForCompletion,
} from "@/lib/progress/stats";
import { dateFromKey, localDateKey } from "@/lib/progress/time";

/**
 * Тренировки: создание попытки, ответы, завершение и разбор.
 *
 * Безопасность:
 * - попытка всегда ищется вместе с userId (чужая → 404);
 * - ответ принимается только на вопрос, который есть в снимке попытки;
 * - правильный вариант и объяснение отдаются только после ответа;
 * - повторный ответ не начисляет баллы второй раз.
 */

export const ATTEMPT_COUNTS = [10, 15, 20, 30] as const;
export const REVIEW_LIMIT = 20;

export class AttemptError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AttemptError";
  }
}

export type CreateAttemptInput = {
  topicId?: string;
  categoryId?: string;
  quizId?: string;
  count?: number;
  mode: AttemptModeType;
};

export type CreateAttemptResult = {
  attemptId: string;
  questionCount: number;
  mode: AttemptModeType;
};

function assertCount(count: number): number {
  if (!ATTEMPT_COUNTS.includes(count as (typeof ATTEMPT_COUNTS)[number])) {
    throw new AttemptError("invalid_count", 400, "Выберите 10, 15, 20 или 30 вопросов.");
  }
  return count;
}

async function loadCandidates(
  userId: string,
  questionIds: string[],
): Promise<{
  candidates: QuestionCandidate[];
  topicIds: Set<string>;
}> {
  if (questionIds.length === 0) {
    return { candidates: [], topicIds: new Set() };
  }

  const [progressRows, interests, questions] = await Promise.all([
    prisma.questionProgress.findMany({
      where: { userId, questionId: { in: questionIds } },
    }),
    prisma.userInterest.findMany({ where: { userId }, select: { topicId: true } }),
    prisma.question.findMany({
      // Статус проверяем ещё раз: вопрос мог уйти в архив между выборкой
      // состава выпуска и созданием попытки.
      where: { id: { in: questionIds }, status: ContentStatus.PUBLISHED },
      select: { id: true, topicId: true },
    }),
  ]);

  const progressByQuestion = new Map(progressRows.map((row) => [row.questionId, row]));
  const interestTopics = new Set(interests.map((row) => row.topicId));
  const topicIds = new Set(questions.map((question) => question.topicId));

  const candidates = questions.map((question) => {
    const progress = progressByQuestion.get(question.id);
    return {
      questionId: question.id,
      topicId: question.topicId,
      seenCount: progress?.seenCount ?? 0,
      wrongCount: progress?.wrongCount ?? 0,
      masteryLevel: progress?.masteryLevel ?? 0,
      nextReviewAt: progress?.nextReviewAt ?? null,
      lastSeenAt: progress?.lastSeenAt ?? null,
      interestWeight: interestTopics.has(question.topicId) ? 1 : 0,
    };
  });

  return { candidates, topicIds };
}

export type CreateAttemptRecordInput = {
  userId: string;
  timezone: string;
  mode: AttemptModeType;
  /** Вопросы в нужном порядке; они уже проверены на публикацию. */
  questionIds: string[];
  categoryId?: string | null;
  topicId?: string | null;
  quizId?: string | null;
  dailyDate?: Date | null;
};

/**
 * Создаёт попытку со снимком вопросов и увеличивает счётчик начатых попыток.
 * Общий путь для тренировок, выпусков и «Теста дня».
 */
export async function createAttemptRecord(
  input: CreateAttemptRecordInput,
): Promise<{ id: string; questionCount: number }> {
  const questionCount = input.questionIds.length;

  return prisma.$transaction(async (tx) => {
    const created = await tx.attempt.create({
      data: {
        userId: input.userId,
        categoryId: input.categoryId ?? null,
        topicId: input.topicId ?? null,
        quizId: input.quizId ?? null,
        mode: input.mode,
        dailyDate: input.dailyDate ?? null,
        status: AttemptStatus.IN_PROGRESS,
        questionCount,
        maxScore: questionCount,
      },
    });

    const versions = await tx.question.findMany({
      where: { id: { in: input.questionIds } },
      select: { id: true, version: true },
    });
    const versionById = new Map(versions.map((row) => [row.id, row.version]));

    await tx.attemptAnswer.createMany({
      data: input.questionIds.map((questionId, index) => ({
        attemptId: created.id,
        questionId,
        order: index,
        questionVersion: versionById.get(questionId) ?? 1,
      })),
    });

    await tx.userStats.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        totalAttempts: 1,
        timezone: input.timezone,
      },
      update: { totalAttempts: { increment: 1 } },
    });

    return { id: created.id, questionCount };
  });
}

export async function createAttempt(
  userId: string,
  input: CreateAttemptInput,
): Promise<CreateAttemptResult> {
  const now = new Date();
  const isQuiz = Boolean(input.quizId);

  if (isQuiz && (input.mode !== AttemptMode.TRAINING || input.topicId || input.categoryId)) {
    throw new AttemptError(
      "invalid_scope",
      400,
      "Выпуск проходят отдельно: выберите выпуск или тренировку по теме.",
    );
  }

  const count = isQuiz ? null : assertCount(input.count ?? 0);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  if (!user) throw new AttemptError("unauthorized", 401, "Нужно войти в аккаунт.");

  let selected: QuestionCandidate[] = [];
  let balanceByTopic = false;
  let categoryId: string | null = null;
  let topicId: string | null = null;
  let quizId: string | null = null;

  if (input.quizId) {
    const lookup = await lookupPlayableQuiz(input.quizId);

    if (lookup.status === "not_found") {
      throw new AttemptError("quiz_not_found", 404, "Выпуск не найден.");
    }
    if (lookup.status === "unavailable") {
      throw new AttemptError(
        "quiz_unavailable",
        409,
        "Этот выпуск пока недоступен. Выберите тренировку по теме.",
      );
    }

    quizId = lookup.quiz.id;
    topicId = lookup.quiz.topicId;

    const loaded = await loadCandidates(userId, lookup.quiz.questionIds);
    const candidatesById = new Map(loaded.candidates.map((item) => [item.questionId, item]));
    selected = lookup.quiz.questionIds
      .map((questionId) => candidatesById.get(questionId))
      .filter((candidate): candidate is QuestionCandidate => Boolean(candidate));

    if (selected.length !== lookup.quiz.questionIds.length) {
      throw new AttemptError(
        "quiz_unavailable",
        409,
        "В выпуске не хватает вопросов. Выберите тренировку по теме.",
      );
    }
  } else if (input.mode === AttemptMode.REVIEW) {
    if (input.topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: input.topicId, status: ContentStatus.PUBLISHED },
        select: { id: true },
      });
      if (!topic) throw new AttemptError("topic_not_found", 404, "Тема не найдена.");
      topicId = topic.id;
    }

    const reviewRows = await prisma.questionProgress.findMany({
      where: {
        userId,
        OR: [{ nextReviewAt: { lte: now } }, { masteryLevel: { lte: 2 } }],
        question: {
          status: ContentStatus.PUBLISHED,
          ...(topicId ? { topicId } : {}),
        },
      },
      select: { questionId: true },
    });

    const questionIds = reviewRows.map((row) => row.questionId);
    const loaded = await loadCandidates(userId, questionIds);
    selected = selectQuestions(loaded.candidates, {
      count: Math.min(count ?? 0, REVIEW_LIMIT),
      now,
    });

    if (selected.length === 0) {
      throw new AttemptError(
        "review_empty",
        400,
        "Пока нечего повторять. Пройдите тренировку, и ошибки появятся здесь.",
      );
    }
  } else {
    const hasTopic = Boolean(input.topicId);
    const hasCategory = Boolean(input.categoryId);

    if (hasTopic === hasCategory) {
      throw new AttemptError(
        "invalid_scope",
        400,
        "Выберите тему или раздел для тренировки.",
      );
    }

    let questionIds: string[] = [];

    if (input.topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: input.topicId, status: ContentStatus.PUBLISHED },
        select: { id: true },
      });
      if (!topic) throw new AttemptError("topic_not_found", 404, "Тема не найдена.");
      topicId = topic.id;

      const questions = await prisma.question.findMany({
        where: { topicId: topic.id, status: ContentStatus.PUBLISHED },
        select: { id: true },
      });
      questionIds = questions.map((question) => question.id);
    } else {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId ?? "" },
        select: { id: true },
      });
      if (!category) throw new AttemptError("category_not_found", 404, "Раздел не найден.");
      categoryId = category.id;
      balanceByTopic = true;

      const questions = await prisma.question.findMany({
        where: {
          status: ContentStatus.PUBLISHED,
          topic: { categoryId: category.id, status: ContentStatus.PUBLISHED },
        },
        select: { id: true },
      });
      questionIds = questions.map((question) => question.id);
    }

    const loaded = await loadCandidates(userId, questionIds);
    selected = selectQuestions(loaded.candidates, { count: count ?? 0, now, balanceByTopic });

    if (selected.length === 0) {
      throw new AttemptError(
        "no_questions",
        400,
        "В этой теме пока нет вопросов. Выберите другую тему.",
      );
    }
  }

  const questionCount = selected.length;

  const attempt = await createAttemptRecord({
    userId,
    timezone: user.timezone,
    mode: input.mode,
    questionIds: selected.map((item) => item.questionId),
    categoryId,
    topicId,
    quizId,
  });

  return { attemptId: attempt.id, questionCount, mode: input.mode };
}

export type AttemptQuestionPayload = {
  id: string;
  order: number;
  text: string;
  options: Array<{ id: string; text: string; order: number }>;
  answered: boolean;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
  correctOptionId: string | null;
  explanation: string | null;
  xpAwarded: number;
};

export type AttemptState = {
  id: string;
  status: string;
  mode: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  xpEarned: number;
  startedAt: Date;
  finishedAt: Date | null;
  durationSec: number | null;
  topicTitle: string | null;
  topicSlug: string | null;
  categoryTitle: string | null;
  quizTitle: string | null;
  currentOrder: number;
  questions: AttemptQuestionPayload[];
};

export async function getAttemptState(
  attemptId: string,
  userId: string,
): Promise<AttemptState | null> {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      topic: { select: { title: true, slug: true } },
      category: { select: { title: true } },
      quiz: { select: { title: true } },
      answers: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: { options: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!attempt) return null;

  const questions: AttemptQuestionPayload[] = attempt.answers.map((answer) => {
    const answered = answer.answeredAt !== null;
    const correctOption = answer.question.options.find((option) => option.isCorrect);

    return {
      id: answer.questionId,
      order: answer.order,
      text: answer.question.text,
      options: answer.question.options.map((option) => ({
        id: option.id,
        text: option.text,
        order: option.order,
      })),
      answered,
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
      correctOptionId: answered ? (correctOption?.id ?? null) : null,
      explanation: answered ? answer.question.explanation : null,
      xpAwarded: answer.xpAwarded,
    };
  });

  const firstUnanswered = questions.find((question) => !question.answered);

  return {
    id: attempt.id,
    status: attempt.status,
    mode: attempt.mode,
    questionCount: attempt.questionCount,
    answeredCount: attempt.answeredCount,
    correctCount: attempt.correctCount,
    xpEarned: attempt.xpEarned,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    durationSec: attempt.durationSec,
    topicTitle: attempt.topic?.title ?? null,
    topicSlug: attempt.topic?.slug ?? null,
    categoryTitle: attempt.category?.title ?? null,
    quizTitle: attempt.quiz?.title ?? null,
    currentOrder: firstUnanswered?.order ?? questions.length,
    questions,
  };
}

export type AnswerFeedback = {
  isCorrect: boolean;
  correctOptionId: string | null;
  explanation: string;
  xpAwarded: number;
  masteryLevel: number;
  nextReviewAt: Date | null;
  answeredCount: number;
  correctCount: number;
  questionCount: number;
  alreadyAnswered: boolean;
};

type AttemptForAnswer = Prisma.AttemptGetPayload<{
  include: { user: { select: { timezone: true } } };
}>;

async function loadAttemptForAnswer(
  tx: Prisma.TransactionClient,
  attemptId: string,
  userId: string,
): Promise<AttemptForAnswer> {
  const attempt = await tx.attempt.findFirst({
    where: { id: attemptId, userId },
    include: { user: { select: { timezone: true } } },
  });

  if (!attempt) throw new AttemptError("attempt_not_found", 404, "Тренировка не найдена.");
  return attempt;
}

function storedFeedback(
  answer: {
    isCorrect: boolean | null;
    xpAwarded: number;
    questionId: string;
  },
  options: Array<{ id: string; isCorrect: boolean }>,
  explanation: string,
  masteryLevel: number,
): Pick<AnswerFeedback, "isCorrect" | "correctOptionId" | "explanation" | "xpAwarded" | "masteryLevel"> {
  return {
    isCorrect: answer.isCorrect ?? false,
    correctOptionId: options.find((option) => option.isCorrect)?.id ?? null,
    explanation,
    xpAwarded: answer.xpAwarded,
    masteryLevel,
  };
}

export async function answerQuestion(
  attemptId: string,
  userId: string,
  input: { questionId: string; optionId: string },
): Promise<AnswerFeedback> {
  return prisma.$transaction(async (tx) => {
    const attempt = await loadAttemptForAnswer(tx, attemptId, userId);

    const answer = await tx.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId: input.questionId } },
    });

    if (!answer) {
      throw new AttemptError(
        "question_not_in_attempt",
        404,
        "Этот вопрос не входит в тренировку.",
      );
    }

    const question = await tx.question.findUnique({
      where: { id: input.questionId },
      include: { options: true },
    });

    if (!question) throw new AttemptError("question_not_found", 404, "Вопрос не найден.");

    const currentProgress = await tx.questionProgress.findUnique({
      where: { userId_questionId: { userId, questionId: input.questionId } },
    });

    if (answer.answeredAt !== null) {
      return {
        ...storedFeedback(
          answer,
          question.options,
          question.explanation,
          currentProgress?.masteryLevel ?? 0,
        ),
        nextReviewAt: currentProgress?.nextReviewAt ?? null,
        answeredCount: attempt.answeredCount,
        correctCount: attempt.correctCount,
        questionCount: attempt.questionCount,
        alreadyAnswered: true,
      };
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new AttemptError("attempt_closed", 409, "Эта тренировка уже завершена.");
    }

    const selectedOption = question.options.find((option) => option.id === input.optionId);
    if (!selectedOption) {
      throw new AttemptError("invalid_option", 400, "Выберите один из предложенных вариантов.");
    }

    const now = new Date();
    const isCorrect = selectedOption.isCorrect;
    const wasDue =
      currentProgress?.nextReviewAt !== null &&
      currentProgress?.nextReviewAt !== undefined &&
      currentProgress.nextReviewAt.getTime() <= now.getTime();

    const next = nextQuestionProgress(currentProgress ?? undefined, { isCorrect, now });
    const xpAwarded = xpForAnswer(isCorrect, wasDue);

    const claimed = await tx.attemptAnswer.updateMany({
      where: { id: answer.id, answeredAt: null },
      data: {
        selectedOptionId: selectedOption.id,
        isCorrect,
        answeredAt: now,
        questionVersion: question.version,
        xpAwarded,
        wasDue,
      },
    });

    if (claimed.count === 0) {
      const fresh = await tx.attemptAnswer.findUnique({ where: { id: answer.id } });
      return {
        ...storedFeedback(
          fresh ?? answer,
          question.options,
          question.explanation,
          currentProgress?.masteryLevel ?? 0,
        ),
        nextReviewAt: currentProgress?.nextReviewAt ?? null,
        answeredCount: attempt.answeredCount,
        correctCount: attempt.correctCount,
        questionCount: attempt.questionCount,
        alreadyAnswered: true,
      };
    }

    await tx.questionProgress.upsert({
      where: { userId_questionId: { userId, questionId: input.questionId } },
      create: {
        userId,
        questionId: input.questionId,
        seenCount: next.seenCount,
        correctCount: next.correctCount,
        wrongCount: next.wrongCount,
        correctStreak: next.correctStreak,
        attemptsWithCorrect: next.attemptsWithCorrect,
        masteryLevel: next.masteryLevel,
        lastResult: isCorrect,
        lastSeenAt: next.lastSeenAt,
        nextReviewAt: next.nextReviewAt,
      },
      update: {
        seenCount: next.seenCount,
        correctCount: next.correctCount,
        wrongCount: next.wrongCount,
        correctStreak: next.correctStreak,
        attemptsWithCorrect: next.attemptsWithCorrect,
        masteryLevel: next.masteryLevel,
        lastResult: isCorrect,
        lastSeenAt: next.lastSeenAt,
        nextReviewAt: next.nextReviewAt,
      },
    });

    const updatedAttempt = await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        answeredCount: { increment: 1 },
        correctCount: { increment: isCorrect ? 1 : 0 },
        score: { increment: isCorrect ? 1 : 0 },
        xpEarned: { increment: xpAwarded },
      },
      select: { answeredCount: true, correctCount: true },
    });

    const stats = await tx.userStats.upsert({
      where: { userId },
      create: {
        userId,
        xp: xpAwarded,
        totalAnswered: 1,
        totalCorrect: isCorrect ? 1 : 0,
        timezone: attempt.user.timezone,
      },
      update: {
        xp: { increment: xpAwarded },
        totalAnswered: { increment: 1 },
        totalCorrect: { increment: isCorrect ? 1 : 0 },
      },
    });

    await tx.userStats.update({
      where: { userId },
      data: { level: levelForXp(stats.xp) },
    });

    const activityDate = dateFromKey(localDateKey(now, attempt.user.timezone));
    await tx.dailyActivity.upsert({
      where: { userId_date: { userId, date: activityDate } },
      create: {
        userId,
        date: activityDate,
        xp: xpAwarded,
        answered: 1,
        correct: isCorrect ? 1 : 0,
      },
      update: {
        xp: { increment: xpAwarded },
        answered: { increment: 1 },
        correct: { increment: isCorrect ? 1 : 0 },
      },
    });

    return {
      isCorrect,
      correctOptionId: question.options.find((option) => option.isCorrect)?.id ?? null,
      explanation: question.explanation,
      xpAwarded,
      masteryLevel: next.masteryLevel,
      nextReviewAt: next.nextReviewAt,
      answeredCount: updatedAttempt.answeredCount,
      correctCount: updatedAttempt.correctCount,
      questionCount: attempt.questionCount,
      alreadyAnswered: false,
    };
  });
}

export type AttemptResult = {
  id: string;
  status: string;
  mode: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  percent: number;
  xpEarned: number;
  startedAt: Date;
  finishedAt: Date | null;
  durationSec: number | null;
  topicTitle: string | null;
  categoryTitle: string | null;
  quizTitle: string | null;
  topics: Array<{ title: string; total: number; correct: number }>;
  mistakes: Array<{
    questionId: string;
    question: string;
    topic: string;
    selectedAnswer: string | null;
    correctAnswer: string;
    explanation: string;
  }>;
};

export async function getAttemptResult(
  attemptId: string,
  userId: string,
): Promise<AttemptResult | null> {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      topic: { select: { title: true } },
      category: { select: { title: true } },
      quiz: { select: { title: true } },
      answers: {
        orderBy: { order: "asc" },
        include: {
          selectedOption: { select: { text: true } },
          question: {
            select: {
              id: true,
              text: true,
              explanation: true,
              topic: { select: { title: true } },
              options: { select: { id: true, text: true, isCorrect: true } },
            },
          },
        },
      },
    },
  });

  if (!attempt) return null;

  const topicMap = new Map<string, { title: string; total: number; correct: number }>();
  const mistakes: AttemptResult["mistakes"] = [];

  for (const answer of attempt.answers) {
    const topicTitle = answer.question.topic.title;
    const entry = topicMap.get(topicTitle) ?? { title: topicTitle, total: 0, correct: 0 };
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
    topicMap.set(topicTitle, entry);

    if (answer.isCorrect === false) {
      const correctOption = answer.question.options.find((option) => option.isCorrect);
      mistakes.push({
        questionId: answer.question.id,
        question: answer.question.text,
        topic: topicTitle,
        selectedAnswer: answer.selectedOption?.text ?? null,
        correctAnswer: correctOption?.text ?? "—",
        explanation: answer.question.explanation,
      });
    }
  }

  return {
    id: attempt.id,
    status: attempt.status,
    mode: attempt.mode,
    questionCount: attempt.questionCount,
    answeredCount: attempt.answeredCount,
    correctCount: attempt.correctCount,
    percent:
      attempt.questionCount > 0
        ? Math.round((attempt.correctCount / attempt.questionCount) * 100)
        : 0,
    xpEarned: attempt.xpEarned,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    durationSec: attempt.durationSec,
    topicTitle: attempt.topic?.title ?? null,
    categoryTitle: attempt.category?.title ?? null,
    quizTitle: attempt.quiz?.title ?? null,
    topics: [...topicMap.values()],
    mistakes,
  };
}

async function recalculateTopics(
  tx: Prisma.TransactionClient,
  userId: string,
  topicIds: string[],
  now: Date,
): Promise<void> {
  for (const topicId of new Set(topicIds)) {
    const totalQuestions = await tx.question.count({
      where: { topicId, status: ContentStatus.PUBLISHED },
    });

    const progresses = await tx.questionProgress.findMany({
      where: {
        userId,
        question: { topicId, status: ContentStatus.PUBLISHED },
      },
      select: { masteryLevel: true, seenCount: true, correctCount: true },
    });

    const aggregate = computeTopicAggregate(totalQuestions, progresses);

    await tx.topicProgress.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: {
        userId,
        topicId,
        ...aggregate,
        lastActivityAt: now,
      },
      update: {
        ...aggregate,
        lastActivityAt: now,
      },
    });
  }
}

export async function finishAttempt(
  attemptId: string,
  userId: string,
): Promise<AttemptResult> {
  await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        user: { select: { timezone: true } },
        answers: {
          select: {
            answeredAt: true,
            isCorrect: true,
            question: { select: { topicId: true } },
          },
        },
      },
    });

    if (!attempt) throw new AttemptError("attempt_not_found", 404, "Тренировка не найдена.");
    if (attempt.status === AttemptStatus.COMPLETED) return;
    if (attempt.status === AttemptStatus.ABANDONED) {
      throw new AttemptError("attempt_abandoned", 409, "Эта тренировка была прервана.");
    }

    if (attempt.answers.some((answer) => answer.answeredAt === null)) {
      throw new AttemptError(
        "attempt_incomplete",
        409,
        "Ответьте на все вопросы, чтобы завершить тренировку.",
      );
    }

    const now = new Date();
    const isPerfect = attempt.correctCount === attempt.questionCount;
    const completionXp =
      xpForCompletion(isPerfect) +
      (attempt.mode === AttemptMode.DAILY ? DAILY_BONUS_XP : 0);

    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.COMPLETED,
        finishedAt: now,
        durationSec: Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000)),
        score: attempt.correctCount,
        maxScore: attempt.questionCount,
        xpEarned: { increment: completionXp },
      },
    });

    const stats = await tx.userStats.upsert({
      where: { userId },
      create: {
        userId,
        xp: completionXp,
        completedAttempts: 1,
        timezone: attempt.user.timezone,
      },
      update: {
        xp: { increment: completionXp },
        completedAttempts: { increment: 1 },
      },
    });

    const percent =
      attempt.questionCount > 0 ? (attempt.correctCount / attempt.questionCount) * 100 : 0;
    const bestAccuracy =
      attempt.questionCount >= 10
        ? Math.max(stats.bestAccuracy, percent)
        : stats.bestAccuracy;
    const streak = nextDailyStreak(
      {
        dailyStreak: stats.dailyStreak,
        longestStreak: stats.longestStreak,
        lastActiveDate: stats.lastActiveDate,
      },
      now,
      attempt.user.timezone,
    );

    await tx.userStats.update({
      where: { userId },
      data: {
        level: levelForXp(stats.xp),
        bestAccuracy,
        dailyStreak: streak.dailyStreak,
        longestStreak: streak.longestStreak,
        lastActiveDate: streak.lastActiveDate,
        timezone: attempt.user.timezone,
      },
    });

    const activityDate = dateFromKey(localDateKey(now, attempt.user.timezone));
    await tx.dailyActivity.upsert({
      where: { userId_date: { userId, date: activityDate } },
      create: {
        userId,
        date: activityDate,
        xp: completionXp,
        attempts: 1,
      },
      update: {
        xp: { increment: completionXp },
        attempts: { increment: 1 },
      },
    });

    await recalculateTopics(
      tx,
      userId,
      attempt.answers.map((answer) => answer.question.topicId),
      now,
    );
  });

  const result = await getAttemptResult(attemptId, userId);
  if (!result) throw new AttemptError("attempt_not_found", 404, "Тренировка не найдена.");
  return result;
}

export async function abandonAttempt(
  attemptId: string,
  userId: string,
): Promise<AttemptResult> {
  await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: {
          select: { question: { select: { topicId: true } } },
        },
      },
    });

    if (!attempt) throw new AttemptError("attempt_not_found", 404, "Тренировка не найдена.");
    if (attempt.status !== AttemptStatus.IN_PROGRESS) return;

    const now = new Date();
    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.ABANDONED,
        finishedAt: now,
        durationSec: Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000)),
      },
    });

    await recalculateTopics(
      tx,
      userId,
      attempt.answers.map((answer) => answer.question.topicId),
      now,
    );
  });

  const result = await getAttemptResult(attemptId, userId);
  if (!result) throw new AttemptError("attempt_not_found", 404, "Тренировка не найдена.");
  return result;
}

/** Сколько вопросов пора повторить (для главной и «Моих результатов»). */
export async function countDueQuestions(userId: string, topicId?: string): Promise<number> {
  return prisma.questionProgress.count({
    where: {
      userId,
      OR: [{ nextReviewAt: { lte: new Date() } }, { masteryLevel: { lte: 2 } }],
      question: {
        status: ContentStatus.PUBLISHED,
        ...(topicId ? { topicId } : {}),
      },
    },
  });
}

export function isAttemptMode(value: unknown): value is AttemptModeType {
  return (
    value === AttemptMode.TRAINING ||
    value === AttemptMode.REVIEW ||
    value === AttemptMode.DAILY
  );
}
