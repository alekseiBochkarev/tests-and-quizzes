/**
 * Агрегат прогресса по теме (docs/03-progress-model.md §4.1).
 *
 * Модуль намеренно без зависимостей: его импортирует не только приложение, но и
 * CLI-импорт вопросов (`scripts/import-questions.mjs`), которому нужно
 * пересчитать `TopicProgress` после архивации демо-контента. Node исполняет
 * `.ts` через нативное стирание типов, но extensionless-импорты вроде
 * `./time` резолвить не умеет, поэтому здесь не должно быть импортов вообще.
 */

export type ProgressForAggregate = {
  masteryLevel: number;
  seenCount: number;
  correctCount: number;
};

export type TopicAggregate = {
  totalQuestions: number;
  seenQuestions: number;
  masteredQuestions: number;
  answeredCount: number;
  correctCount: number;
  masteryPoints: number;
  progress: number;
  coverage: number;
  quality: number;
  accuracy: number;
  level: number;
};

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}

export function topicLevel(progress: number): number {
  if (progress >= 85) return 5;
  if (progress >= 60) return 4;
  if (progress >= 35) return 3;
  if (progress >= 15) return 2;
  if (progress >= 5) return 1;
  return 0;
}

export function computeTopicAggregate(
  totalQuestions: number,
  progresses: ProgressForAggregate[],
): TopicAggregate {
  const seen = progresses.filter((item) => item.seenCount > 0);
  const answeredCount = progresses.reduce((sum, item) => sum + item.seenCount, 0);
  const correctCount = progresses.reduce((sum, item) => sum + item.correctCount, 0);
  const masteryPoints = progresses.reduce((sum, item) => sum + item.masteryLevel, 0);
  const seenQuestions = seen.length;
  const masteredQuestions = progresses.filter((item) => item.masteryLevel >= 4).length;

  const coverage = percent(seenQuestions, totalQuestions);
  const quality = percent(masteryPoints, 5 * seenQuestions);
  const progress = Math.min(100, Math.max(0, (coverage * quality) / 100));

  return {
    totalQuestions,
    seenQuestions,
    masteredQuestions,
    answeredCount,
    correctCount,
    masteryPoints,
    progress,
    coverage,
    quality,
    accuracy: percent(correctCount, answeredCount),
    level: topicLevel(progress),
  };
}
