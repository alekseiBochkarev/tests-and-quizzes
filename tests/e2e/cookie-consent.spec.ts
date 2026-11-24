import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

/**
 * ACC-03: cookie-баннер, категории и отзыв согласия.
 *
 * Каждый тест получает чистый контекст, поэтому баннер показывается заново.
 * Выбор проверяем по cookie `quiz_cookie_consent`, которую читает layout.
 */

const CONSENT_COOKIE = "quiz_cookie_consent";

type ConsentValue = {
  analytics: boolean;
  marketing: boolean;
  version: string;
  updatedAt: string;
};

function bannerHeading(page: Page) {
  return page.getByRole("heading", { name: "Cookie и ваши настройки" });
}

function parseCookieValue(raw: string): ConsentValue {
  try {
    return JSON.parse(raw) as ConsentValue;
  } catch {
    return JSON.parse(decodeURIComponent(raw)) as ConsentValue;
  }
}

async function readConsent(context: BrowserContext): Promise<ConsentValue> {
  const cookies = await context.cookies();
  const cookie = cookies.find((item) => item.name === CONSENT_COOKIE);
  expect(cookie, "cookie согласия должна быть установлена").toBeTruthy();
  return parseCookieValue(cookie?.value ?? "");
}

test.describe("Cookie-согласие", () => {
  test("гость выбирает только необходимые, выбор сохраняется после перезагрузки", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await expect(bannerHeading(page)).toBeVisible();

    await page.getByRole("button", { name: "Только необходимые" }).click();
    await expect(bannerHeading(page)).toBeHidden();

    const consent = await readConsent(context);
    expect(consent.analytics).toBe(false);
    expect(consent.marketing).toBe(false);
    expect(consent.version.length).toBeGreaterThan(0);

    await page.reload();
    await expect(bannerHeading(page)).toBeHidden();
  });

  test("в настройках можно включить аналитику отдельно от рекламы", async ({ page, context }) => {
    await page.goto("/tests");
    await expect(bannerHeading(page)).toBeVisible();

    await page.getByRole("button", { name: "Настроить" }).click();
    await expect(page.getByText("Настройки cookie", { exact: true })).toBeVisible();

    await page.getByRole("checkbox", { name: /Аналитика/ }).check();
    await page.getByRole("button", { name: "Сохранить выбор" }).click();

    await expect(bannerHeading(page)).toBeHidden();

    const consent = await readConsent(context);
    expect(consent.analytics).toBe(true);
    expect(consent.marketing).toBe(false);
  });

  test("страница Cookie-политики открывает настройки повторно", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Cookie-политика" }).click();
    await expect(page).toHaveURL(/\/legal\/cookies$/);
    await expect(page.getByRole("heading", { name: "Cookie-политика" })).toBeVisible();

    await page.getByRole("button", { name: "Только необходимые" }).click();
    await expect(bannerHeading(page)).toBeHidden();

    await page.getByRole("button", { name: "Изменить настройки cookie" }).click();
    await expect(bannerHeading(page)).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Аналитика/ })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Реклама и партнёры/ })).not.toBeChecked();

    await page.getByRole("button", { name: "Закрыть" }).click();
    await expect(bannerHeading(page)).toBeHidden();
  });
});
