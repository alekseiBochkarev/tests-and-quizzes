import { ContentStatus, InterestSource } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * Явные интересы: темы, выбранные пользователем.
 * Раздел — только группировка в интерфейсе, отдельно не хранится.
 */

export type UserInterests = {
  topicIds: string[];
  setAt: Date | null;
};

export async function getUserInterests(userId: string): Promise<UserInterests> {
  const [rows, user] = await Promise.all([
    prisma.userInterest.findMany({
      where: { userId, source: { in: [InterestSource.ONBOARDING, InterestSource.MANUAL] } },
      select: { topicId: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { interestsSetAt: true } }),
  ]);

  return {
    topicIds: rows.map((row) => row.topicId),
    setAt: user?.interestsSetAt ?? null,
  };
}

export async function saveUserInterests(
  userId: string,
  topicIds: string[],
  source: InterestSource = InterestSource.MANUAL,
): Promise<UserInterests> {
  const uniqueTopicIds = [...new Set(topicIds)].slice(0, 100);

  const existingCount = uniqueTopicIds.length
    ? await prisma.topic.count({
        where: { id: { in: uniqueTopicIds }, status: ContentStatus.PUBLISHED },
      })
    : 0;

  if (existingCount !== uniqueTopicIds.length) {
    throw new Error("unknown_topic");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.userInterest.deleteMany({
      where: { userId, source: { in: [InterestSource.ONBOARDING, InterestSource.MANUAL] } },
    });

    if (uniqueTopicIds.length > 0) {
      await tx.userInterest.createMany({
        data: uniqueTopicIds.map((topicId) => ({
          userId,
          topicId,
          source,
          weight: 1,
        })),
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: { interestsSetAt: now },
    });
  });

  return { topicIds: uniqueTopicIds, setAt: now };
}

export async function skipInterestOnboarding(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { interestsSetAt: new Date() },
  });
}
