/**
 * Адрес приложения для e2e-тестов.
 *
 * По умолчанию совпадает с `use.baseURL` в `playwright.config.ts`.
 * `E2E_APP_URL` нужен, когда порт 3000 занят другим приложением: Playwright
 * молча переиспользует запущенный сервер (`reuseExistingServer`), и тесты
 * ушли бы в чужую сборку и чужую БД. С этим параметром прогон поднимает
 * собственный сервер на свободном порту.
 */
export const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:3000";

/** Экранирование подстановки в регулярное выражение. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
