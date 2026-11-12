/** Понятные подписи для внутренних уровней и причин рекомендаций. */

export const TOPIC_LEVEL_LABELS: readonly string[] = [
  "Не начато",
  "Первый шаг",
  "Изучаю",
  "Уверенно",
  "Хорошо знаю",
  "Знаток темы",
];

export function topicLevelLabel(level: number): string {
  return TOPIC_LEVEL_LABELS[Math.min(5, Math.max(0, Math.trunc(level)))] ?? "Не начато";
}

/** Освоение одного вопроса (внутри — mastery 0–5). */
export const QUESTION_LEVEL_LABELS: readonly string[] = [
  "Не встречался",
  "Знакомлюсь",
  "Запомнил",
  "Уверенно",
  "Сильно",
  "Освоил",
];

export function questionLevelLabel(level: number): string {
  return QUESTION_LEVEL_LABELS[Math.min(5, Math.max(0, Math.trunc(level)))] ?? "Не встречался";
}

export const RECOMMENDATION_REASONS: Record<string, string> = {
  interest: "По вашим интересам",
  review: "Пора повторить",
  new: "Новое для вас",
  weak: "Стоит подтянуть",
};

export function pluralize(count: number, forms: [string, string, string]): string {
  const absolute = Math.abs(count) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export function questionWord(count: number): string {
  return pluralize(count, ["вопрос", "вопроса", "вопросов"]);
}

export function dayWord(count: number): string {
  return pluralize(count, ["день", "дня", "дней"]);
}

export function attemptWord(count: number): string {
  return pluralize(count, ["тренировка", "тренировки", "тренировок"]);
}
