import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Общие шаги e2e-сценариев Sprint 1.
 * Пароль — только тестовый, не совпадает с реальными.
 */
export const TEST_PASSWORD = "Test-Pass-2026!";

/** Уникальный email на каждый прогон: тестовая БД не чистится между запусками. */
export function uniqueEmail(prefix = "e2e"): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}@example.com`;
}

/** Регистрация через форму «Сохранить результаты» (согласия отмечены). */
export async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");

  await page.getByLabel("Адрес почты").fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("checkbox", { name: /пользовательское соглашение/i }).check();
  await page.getByRole("checkbox", { name: /политике конфиденциальности/i }).check();
  await page.getByRole("button", { name: "Сохранить результаты" }).click();

  await expect(page.getByText("Проверьте почту", { exact: false }).first()).toBeVisible();
}

/**
 * Достаёт ссылку подтверждения из dev-почтового ящика по адресу получателя.
 * Файл `logs/dev-mail.log` — это почтовый ящик, а не лог приложения;
 * полный URL с токеном доступен только при APP_ENV != production.
 */
export async function readVerifyLink(page: Page, email: string): Promise<string> {
  const response = await page.request.get("/_dev/mailbox");
  expect(response.ok(), "страница /_dev/mailbox должна открываться в тестовом окружении").toBe(
    true,
  );

  const html = await response.text();
  const emailIndex = html.indexOf(email);
  expect(emailIndex, `письмо для ${email} должно быть в dev-mailbox`).toBeGreaterThanOrEqual(0);

  const match = html.slice(emailIndex).match(/\/verify-email\?token=[^"'\s<]+/);
  expect(match, "в письме должна быть ссылка подтверждения").not.toBeNull();

  return match?.[0] ?? "";
}

/** Регистрация → письмо → подтверждение. Возвращает email созданного пользователя. */
export async function registerAndVerify(page: Page, prefix = "e2e"): Promise<string> {
  const email = uniqueEmail(prefix);
  await register(page, email);

  const verifyPath = await readVerifyLink(page, email);
  await page.goto(verifyPath);
  await page.getByRole("button", { name: "Подтвердить почту" }).click();

  await expect(page).toHaveURL(/\/login\?verified=1/);
  await expect(page.getByText("Почта подтверждена", { exact: false }).first()).toBeVisible();

  return email;
}

/** Вход через форму. Ожидает успешный переход на /account. */
export async function login(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Адрес почты").fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
}
