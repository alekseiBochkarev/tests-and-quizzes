/**
 * Рекомендации тем (docs/05-learning-experience.md §6.3).
 *
 * Явный интерес важнее поведения, но слабая тема может подняться выше,
 * чтобы пользователь не застревал только на любимом и лёгком.
 */

export type TopicRecommendationInput = {
  topicId: string;
  interestWeight: number;
  dueQuestions: number;
  progress: number;
  unseenQuestions: number;
  lastActivityAt: Date | null;
};

export type TopicRecommendation = {
  topicId: string;
  score: number;
  reason: "interest" | "review" | "new" | "weak";
};

const DAY_MS = 86_400_000;

function recentlyActivePenalty(lastActivityAt: Date | null, now: Date): number {
  if (!lastActivityAt) return 0;
  const elapsed = now.getTime() - lastActivityAt.getTime();
  if (elapsed < DAY_MS) return 60;
  if (elapsed < 3 * DAY_MS) return 25;
  return 0;
}

export function scoreTopic(
  input: TopicRecommendationInput,
  now: Date,
): TopicRecommendation {
  const clampedProgress = Math.min(100, Math.max(0, input.progress));

  const score =
    input.interestWeight * 50 +
    input.dueQuestions * 20 +
    (100 - clampedProgress) * 0.5 +
    input.unseenQuestions * 0.3 -
    recentlyActivePenalty(input.lastActivityAt, now);

  let reason: TopicRecommendation["reason"] = "weak";
  if (input.dueQuestions > 0) {
    reason = "review";
  } else if (input.interestWeight > 0) {
    reason = "interest";
  } else if (input.unseenQuestions > 0) {
    reason = "new";
  }

  return { topicId: input.topicId, score, reason };
}

export function recommendTopics(
  inputs: TopicRecommendationInput[],
  now: Date,
  limit = 4,
): TopicRecommendation[] {
  return inputs
    .map((input) => scoreTopic(input, now))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.topicId.localeCompare(b.topicId);
    })
    .slice(0, Math.max(0, limit));
}
