/**
 * Общие правила контентной админки (CNT-04).
 *
 * Модуль без БД и без React: сравнение содержания вопроса. Его используют
 * сервис и unit-тесты. Адрес темы живёт в `./slug`, чтобы клиентская форма
 * не тянула `node:crypto` из импортёра.
 */

import { normalizeForHash } from "@/lib/content/import";

export function hasDuplicateOptions(options: readonly string[]): boolean {
  return new Set(options.map((option) => normalizeForHash(option))).size !== options.length;
}

export type QuestionContent = {
  text: string;
  options: readonly { text: string; isCorrect: boolean }[];
};

export type QuestionInputContent = {
  text: string;
  options: readonly string[];
  correctIndex: number;
};

/**
 * Меняются ли текст, варианты или правильный ответ.
 *
 * Объяснение, сложность и изображение не создают новую версию: они уточняют
 * тот же вопрос и не ломают историю ответов. А вот текст и варианты меняют
 * смысл, поэтому опубликованный вопрос уходит в архив, а новый получает
 * следующую версию.
 */
export function questionContentChanged(
  existing: QuestionContent,
  input: QuestionInputContent,
): boolean {
  if (existing.text.trim() !== input.text.trim()) return true;

  const existingCorrect = existing.options.findIndex((option) => option.isCorrect);
  if (existingCorrect !== input.correctIndex) return true;

  return existing.options.some((option, index) => {
    const next = input.options[index];
    return next === undefined || option.text.trim() !== next.trim();
  });
}
