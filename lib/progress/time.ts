/**
 * Работа с датами прогресса.
 *
 * mastery и интервалы повторения считаются в сутках, а серия дней — по
 * локальной дате пользователя (`User.timezone`). Date в PostgreSQL `date`
 * храним как UTC-полночь, чтобы не зависеть от часового пояса сервера.
 */

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Ключ локальной даты `YYYY-MM-DD` для IANA timezone. */
export function localDateKey(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Некорректный timezone — не роняем запрос, считаем по UTC.
  }

  return date.toISOString().slice(0, 10);
}

/** Значение для колонки `@db.Date`: UTC-полночь локальной даты. */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Разница в календарных сутках между двумя моментами (по UTC-дате). */
export function elapsedDays(from: Date, to: Date): number {
  const fromKey = from.toISOString().slice(0, 10);
  const toKey = to.toISOString().slice(0, 10);
  const fromDate = dateFromKey(fromKey).getTime();
  const toDate = dateFromKey(toKey).getTime();
  return Math.max(0, Math.round((toDate - fromDate) / 86_400_000));
}
