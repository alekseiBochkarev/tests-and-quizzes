import { ContentStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * Каталог: разделы → темы с количеством опубликованных вопросов и прогрессом.
 * Пустые темы не показываем: обещать «30 вопросов» там, где их нет, нельзя.
 */

export type CatalogTopic = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  questionCount: number;
  progress: {
    progress: number;
    coverage: number;
    accuracy: number;
    seenQuestions: number;
    masteredQuestions: number;
    totalQuestions: number;
    level: number;
    lastActivityAt: Date | null;
  } | null;
};

export type CatalogCategory = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  topics: CatalogTopic[];
};

export async function getCatalog(userId: string | null): Promise<CatalogCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      topics: {
        where: { status: ContentStatus.PUBLISHED },
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { questions: { where: { status: ContentStatus.PUBLISHED } } },
          },
        },
      },
    },
  });

  const progressRows = userId
    ? await prisma.topicProgress.findMany({ where: { userId } })
    : [];
  const progressByTopic = new Map(progressRows.map((row) => [row.topicId, row]));

  return categories
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      title: category.title,
      description: category.description,
      topics: category.topics
        .filter((topic) => topic._count.questions > 0)
        .map((topic) => {
          const progress = progressByTopic.get(topic.id);
          return {
            id: topic.id,
            slug: topic.slug,
            title: topic.title,
            description: topic.description,
            questionCount: topic._count.questions,
            progress: progress
              ? {
                  progress: progress.progress,
                  coverage: progress.coverage,
                  accuracy: progress.accuracy,
                  seenQuestions: progress.seenQuestions,
                  masteredQuestions: progress.masteredQuestions,
                  totalQuestions: progress.totalQuestions,
                  level: progress.level,
                  lastActivityAt: progress.lastActivityAt,
                }
              : null,
          };
        }),
    }))
    .filter((category) => category.topics.length > 0);
}

export async function getTopicBySlug(
  slug: string,
  userId: string | null,
): Promise<{
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: { slug: string; title: string };
  questionCount: number;
  progress: CatalogTopic["progress"];
} | null> {
  const topic = await prisma.topic.findFirst({
    where: { slug, status: ContentStatus.PUBLISHED },
    include: {
      category: { select: { slug: true, title: true } },
      _count: {
        select: { questions: { where: { status: ContentStatus.PUBLISHED } } },
      },
    },
  });

  if (!topic || topic._count.questions === 0) return null;

  const progress = userId
    ? await prisma.topicProgress.findUnique({
        where: { userId_topicId: { userId, topicId: topic.id } },
      })
    : null;

  return {
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    description: topic.description,
    category: topic.category,
    questionCount: topic._count.questions,
    progress: progress
      ? {
          progress: progress.progress,
          coverage: progress.coverage,
          accuracy: progress.accuracy,
          seenQuestions: progress.seenQuestions,
          masteredQuestions: progress.masteredQuestions,
          totalQuestions: progress.totalQuestions,
          level: progress.level,
          lastActivityAt: progress.lastActivityAt,
        }
      : null,
  };
}
