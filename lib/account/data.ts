import { prisma } from "@/lib/db";
import type { AccountExportSource } from "@/lib/account/export";

/**
 * Загрузка данных для экспорта (ACC-01).
 *
 * Один пользователь — один набор запросов. Объём ограничен историей одного
 * человека, поэтому пагинация не нужна. Пароль и его хеш не выбираются.
 */
export async function loadAccountExportSource(
  userId: string,
): Promise<AccountExportSource | null> {
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      timezone: true,
      createdAt: true,
      emailVerifiedAt: true,
      interestsSetAt: true,
      deletedAt: true,
    },
  });

  if (!profile || profile.deletedAt !== null) return null;

  const [consents, interests, attempts, questionProgress, topicProgress, stats, dailyActivity] =
    await Promise.all([
      prisma.consent.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          type: true,
          version: true,
          accepted: true,
          ip: true,
          userAgent: true,
          createdAt: true,
        },
      }),
      prisma.userInterest.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          weight: true,
          source: true,
          createdAt: true,
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
        where: { userId },
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          mode: true,
          status: true,
          questionCount: true,
          answeredCount: true,
          correctCount: true,
          score: true,
          maxScore: true,
          xpEarned: true,
          startedAt: true,
          finishedAt: true,
          durationSec: true,
          topic: { select: { slug: true, title: true } },
          quiz: { select: { title: true } },
          answers: {
            orderBy: { order: "asc" },
            select: {
              order: true,
              isCorrect: true,
              answeredAt: true,
              questionVersion: true,
              question: { select: { text: true } },
              selectedOption: { select: { text: true } },
            },
          },
        },
      }),
      prisma.questionProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: {
          seenCount: true,
          correctCount: true,
          wrongCount: true,
          masteryLevel: true,
          lastSeenAt: true,
          nextReviewAt: true,
          question: {
            select: {
              text: true,
              topic: { select: { slug: true, title: true } },
            },
          },
        },
      }),
      prisma.topicProgress.findMany({
        where: { userId },
        orderBy: { lastActivityAt: "desc" },
        select: {
          totalQuestions: true,
          seenQuestions: true,
          masteredQuestions: true,
          answeredCount: true,
          correctCount: true,
          progress: true,
          level: true,
          lastActivityAt: true,
          topic: { select: { slug: true, title: true } },
        },
      }),
      prisma.userStats.findUnique({
        where: { userId },
        select: {
          xp: true,
          level: true,
          totalAttempts: true,
          completedAttempts: true,
          totalAnswered: true,
          totalCorrect: true,
          bestAccuracy: true,
          dailyStreak: true,
          longestStreak: true,
          lastActiveDate: true,
          timezone: true,
        },
      }),
      prisma.dailyActivity.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        select: {
          date: true,
          xp: true,
          attempts: true,
          answered: true,
          correct: true,
        },
      }),
    ]);

  const profileData = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    timezone: profile.timezone,
    createdAt: profile.createdAt,
    emailVerifiedAt: profile.emailVerifiedAt,
    interestsSetAt: profile.interestsSetAt,
  };

  return {
    profile: profileData,
    consents,
    interests,
    attempts,
    questionProgress,
    topicProgress,
    stats,
    dailyActivity,
  };
}
