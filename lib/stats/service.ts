import { prisma } from "@/lib/db";
import { AttemptStatus, ContentStatus } from "@/lib/generated/prisma/enums";
import { levelProgress, type LevelProgress } from "@/lib/progress/level";
import { recommendTopics, type TopicRecommendation } from "@/lib/progress/recommendations";
import { accuracyPercent } from "@/lib/progress/stats";
import { countDueQuestions } from "@/lib/attempts/service";

/**
 * Данные главной и «Моих результатов».
 * Слабые темы считаем только там, где есть достаточно данных:
 * иначе одна случайная ошибка делает тему «слабой».
 */

export const MIN_SEEN_FOR_WEAK = 5;
export const MIN_ANSWERS_FOR_ACCURACY = 10;
export const MIN_QUESTIONS_FOR_RECORD = 10;

export type UserOverview = {
  xp: number;
  level: LevelProgress;
  completedAttempts: number;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  bestAccuracy: number;
  dailyStreak: number;
  longestStreak: number;
  masteredQuestions: number;
  dueCount: number;
};

export type TopicRecommendationCard = {
  id: string;
  slug: string;
  title: string;
  categoryTitle: string;
  questionCount: number;
  progress: number;
  reason: TopicRecommendation["reason"];
};

export type ContinueCard = {
  kind: "attempt" | "topic";
  href: string;
  title: string;
  subtitle: string;
};

export type AccountTopic = {
  id: string;
  slug: string;
  title: string;
  categoryTitle: string;
  progress: number;
  accuracy: number;
  seenQuestions: number;
  masteredQuestions: number;
  totalQuestions: number;
  level: number;
  lastActivityAt: Date | null;
};

export type AttemptHistoryItem = {
  id: string;
  title: string;
  finishedAt: Date | null;
  correctCount: number;
  questionCount: number;
  percent: number;
};

export type HomeData = {
  overview: UserOverview;
  continueCard: ContinueCard | null;
  recommendations: TopicRecommendationCard[];
};

function accuracy(correct: number, answered: number): number {
  return Math.round(accuracyPercent(correct, answered));
}

async function loadOverview(userId: string): Promise<UserOverview> {
  const [stats, masteredQuestions, dueCount] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.questionProgress.count({ where: { userId, masteryLevel: { gte: 4 } } }),
    countDueQuestions(userId),
  ]);

  const xp = stats?.xp ?? 0;
  const totalAnswered = stats?.totalAnswered ?? 0;
  const totalCorrect = stats?.totalCorrect ?? 0;

  return {
    xp,
    level: levelProgress(xp),
    completedAttempts: stats?.completedAttempts ?? 0,
    totalAnswered,
    totalCorrect,
    accuracy: accuracy(totalCorrect, totalAnswered),
    bestAccuracy: Math.round(stats?.bestAccuracy ?? 0),
    dailyStreak: stats?.dailyStreak ?? 0,
    longestStreak: stats?.longestStreak ?? 0,
    masteredQuestions,
    dueCount,
  };
}

async function loadRecommendations(
  userId: string,
  now: Date,
  limit = 3,
): Promise<TopicRecommendationCard[]> {
  const [topics, progressRows, interestRows, questionProgressRows, dueRows] = await Promise.all([
    prisma.topic.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
      include: {
        category: { select: { title: true } },
        _count: { select: { questions: { where: { status: ContentStatus.PUBLISHED } } } },
      },
    }),
    prisma.topicProgress.findMany({ where: { userId } }),
    prisma.userInterest.findMany({ where: { userId }, select: { topicId: true } }),
    prisma.questionProgress.findMany({
      where: { userId, question: { status: ContentStatus.PUBLISHED } },
      select: { seenCount: true, question: { select: { topicId: true } } },
    }),
    prisma.questionProgress.findMany({
      where: {
        userId,
        OR: [{ nextReviewAt: { lte: now } }, { masteryLevel: { lte: 2 } }],
        question: { status: ContentStatus.PUBLISHED },
      },
      select: { question: { select: { topicId: true } } },
    }),
  ]);

  const progressByTopic = new Map(progressRows.map((row) => [row.topicId, row]));
  const interests = new Set(interestRows.map((row) => row.topicId));
  const seenByTopic = new Map<string, number>();
  for (const row of questionProgressRows) {
    if (row.seenCount > 0) {
      const topicId = row.question.topicId;
      seenByTopic.set(topicId, (seenByTopic.get(topicId) ?? 0) + 1);
    }
  }
  const dueByTopic = new Map<string, number>();
  for (const row of dueRows) {
    const topicId = row.question.topicId;
    dueByTopic.set(topicId, (dueByTopic.get(topicId) ?? 0) + 1);
  }

  const available = topics.filter((topic) => topic._count.questions > 0);
  const recommendations = recommendTopics(
    available.map((topic) => {
      const progress = progressByTopic.get(topic.id);
      const seen = seenByTopic.get(topic.id) ?? 0;
      return {
        topicId: topic.id,
        interestWeight: interests.has(topic.id) ? 1 : 0,
        dueQuestions: dueByTopic.get(topic.id) ?? 0,
        progress: progress?.progress ?? 0,
        unseenQuestions: Math.max(0, topic._count.questions - seen),
        lastActivityAt: progress?.lastActivityAt ?? null,
      };
    }),
    now,
    limit,
  );

  const topicById = new Map(available.map((topic) => [topic.id, topic]));

  return recommendations.flatMap((recommendation) => {
    const topic = topicById.get(recommendation.topicId);
    if (!topic) return [];
    return [
      {
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
        categoryTitle: topic.category.title,
        questionCount: topic._count.questions,
        progress: Math.round(progressByTopic.get(topic.id)?.progress ?? 0),
        reason: recommendation.reason,
      },
    ];
  });
}

async function loadContinueCard(userId: string): Promise<ContinueCard | null> {
  const activeAttempt = await prisma.attempt.findFirst({
    where: {
      userId,
      status: AttemptStatus.IN_PROGRESS,
      answeredCount: { gt: 0 },
    },
    orderBy: { startedAt: "desc" },
    include: {
      topic: { select: { title: true } },
      category: { select: { title: true } },
    },
  });

  if (activeAttempt) {
    const title =
      activeAttempt.topic?.title ??
      activeAttempt.category?.title ??
      "Тренировка";
    return {
      kind: "attempt",
      href: `/attempts/${activeAttempt.id}`,
      title,
      subtitle: `${activeAttempt.answeredCount} из ${activeAttempt.questionCount} вопросов`,
    };
  }

  const lastTopic = await prisma.topicProgress.findFirst({
    where: {
      userId,
      seenQuestions: { gt: 0 },
      progress: { lt: 100 },
      topic: { status: ContentStatus.PUBLISHED },
    },
    orderBy: { lastActivityAt: "desc" },
    include: { topic: { select: { slug: true, title: true } } },
  });

  if (!lastTopic) return null;

  return {
    kind: "topic",
    href: `/tests/${lastTopic.topic.slug}`,
    title: lastTopic.topic.title,
    subtitle: `Изучено ${Math.round(lastTopic.progress)}%`,
  };
}

export async function getHomeData(userId: string): Promise<HomeData> {
  const now = new Date();
  const [overview, continueCard, recommendations] = await Promise.all([
    loadOverview(userId),
    loadContinueCard(userId),
    loadRecommendations(userId, now),
  ]);

  return { overview, continueCard, recommendations };
}

export type AccountData = {
  overview: UserOverview;
  topics: AccountTopic[];
  learnedTopics: AccountTopic[];
  weakTopics: AccountTopic[];
  history: AttemptHistoryItem[];
  showAccuracy: boolean;
};

export async function getAccountData(userId: string): Promise<AccountData> {
  const [overview, topicProgressRows, historyRows] = await Promise.all([
    loadOverview(userId),
    prisma.topicProgress.findMany({
      where: { userId, topic: { status: ContentStatus.PUBLISHED } },
      orderBy: [{ lastActivityAt: "desc" }, { progress: "desc" }],
      include: {
        topic: {
          select: {
            slug: true,
            title: true,
            category: { select: { title: true } },
          },
        },
      },
    }),
    prisma.attempt.findMany({
      where: { userId, status: AttemptStatus.COMPLETED },
      orderBy: { finishedAt: "desc" },
      take: 10,
      include: {
        topic: { select: { title: true } },
        category: { select: { title: true } },
      },
    }),
  ]);

  const topics: AccountTopic[] = topicProgressRows.map((row) => ({
    id: row.topicId,
    slug: row.topic.slug,
    title: row.topic.title,
    categoryTitle: row.topic.category.title,
    progress: row.progress,
    accuracy: row.accuracy,
    seenQuestions: row.seenQuestions,
    masteredQuestions: row.masteredQuestions,
    totalQuestions: row.totalQuestions,
    level: row.level,
    lastActivityAt: row.lastActivityAt,
  }));

  const learnedTopics = [...topics]
    .filter((topic) => topic.masteredQuestions > 0)
    .sort((a, b) => b.masteredQuestions - a.masteredQuestions)
    .slice(0, 6);

  const weakTopics = topics
    .filter(
      (topic) =>
        topic.seenQuestions >= MIN_SEEN_FOR_WEAK &&
        (topic.accuracy < 60 || topic.progress < 40),
    )
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const history: AttemptHistoryItem[] = historyRows.map((attempt) => ({
    id: attempt.id,
    title: attempt.topic?.title ?? attempt.category?.title ?? "Тренировка",
    finishedAt: attempt.finishedAt,
    correctCount: attempt.correctCount,
    questionCount: attempt.questionCount,
    percent:
      attempt.questionCount > 0
        ? Math.round((attempt.correctCount / attempt.questionCount) * 100)
        : 0,
  }));

  return {
    overview,
    topics,
    learnedTopics,
    weakTopics,
    history,
    showAccuracy: overview.totalAnswered >= MIN_ANSWERS_FOR_ACCURACY,
  };
}
