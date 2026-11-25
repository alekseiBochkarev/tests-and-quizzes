/**
 * Тексты страницы шаринга (GRW-01).
 *
 * Только итог: название теста, процент, число верных ответов и дата. Ни почты,
 * ни имени, ни самих ответов — ссылка публичная (RES-6, §9.4).
 *
 * Модуль чистый: его используют страница результата, публичная страница
 * и OG-карточка, поэтому формулировки не должны расходиться.
 */

export type ShareTextInput = {
  /** Уже готовое название теста: «История», «Тест дня», выпуск. */
  title: string;
  correctCount: number;
  questionCount: number;
  percent: number;
};

/** «17 из 20 верно» — без склонений, чтобы не ломаться на 1 и 21. */
export function scoreLine(correctCount: number, total: number): string {
  return `${correctCount} из ${total} верно`;
}

/** Мягкая оценка результата: без соревнования и публичных рейтингов. */
export function resultPraise(percent: number): string {
  if (percent >= 90) return "Отличный результат";
  if (percent >= 70) return "Хороший результат";
  if (percent >= 50) return "Неплохой результат";
  return "Есть что повторить";
}

/** Заголовок OG-карточки и страницы: «85% — История». */
export function shareHeadline({ title, percent }: { title: string; percent: number }): string {
  return `${percent}% — ${title}`;
}

/** Описание для соцсетей: короткое, без личных данных. */
export function shareDescription({
  title,
  correctCount,
  questionCount,
}: {
  title: string;
  correctCount: number;
  questionCount: number;
}): string {
  return `«${title}»: ${scoreLine(
    correctCount,
    questionCount,
  )}. Короткие тесты с объяснениями — в спокойном темпе.`;
}

/**
 * Текст сообщения для мессенджеров. Ссылка добавляется отдельно, чтобы
 * Telegram и WhatsApp не показывали её дважды.
 */
export function shareMessage({ title, percent, correctCount, questionCount }: ShareTextInput): string {
  return `Мой результат: «${title}» — ${percent}% (${scoreLine(
    correctCount,
    questionCount,
  )}). Проверьте себя:`;
}

/** Обрезает длинное название для карточки, сохраняя читаемость. */
export function clampText(text: string, maxLength: number): string {
  const clean = text.trim();
  // Array.from режет по code points, а не по UTF-16: иначе суррогатная пара
  // (эмодзи в названии выпуска) могла разорваться пополам.
  const chars = Array.from(clean);
  if (chars.length <= maxLength) return clean;
  return `${chars.slice(0, Math.max(0, maxLength - 1)).join("").trimEnd()}…`;
}
