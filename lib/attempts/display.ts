/**
 * Подписи попытки для интерфейса (GRW-01).
 *
 * Один источник названия теста для страницы результата, публичной страницы
 * шаринга и OG-карточки. Иначе «Тест дня» и выпуски подписывались бы по-разному
 * в трёх местах и расходились при правках.
 */

export type AttemptDisplaySource = {
  mode: string;
  quizTitle?: string | null;
  topicTitle?: string | null;
  categoryTitle?: string | null;
};

/** Название теста: «Тест дня», выпуск, тема или раздел. */
export function attemptTitle(source: AttemptDisplaySource): string {
  if (source.mode === "DAILY") return "Тест дня";
  return source.quizTitle ?? source.topicTitle ?? source.categoryTitle ?? "Тренировка";
}

/** Уточнение формата для подписи над заголовком. */
export function attemptKindLabel(source: AttemptDisplaySource): string {
  if (source.mode === "DAILY") return "Тест дня";
  if (source.quizTitle) return `Выпуск «${source.quizTitle}»`;
  return attemptTitle(source);
}
