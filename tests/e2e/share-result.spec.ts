import { createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { login, registerAndVerify } from "./helpers";

/**
 * GRW-01: публичная ссылка на результат.
 *
 * Проверяем главное: ссылка открывается без входа, показывает только итог,
 * не раскрывает почту и отдаёт OG-карточку. Прерванная тренировка шариться
 * не должна.
 */

const TOPIC_SLUG = "history";
const TOPIC_TITLE = "История";

async function answerCurrentQuestion(page: Page): Promise<void> {
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Ответить" }).click();
  await expect(
    page.getByText("Верно", { exact: true }).or(page.getByText("Неверно", { exact: true })),
  ).toBeVisible();
}

/** Каталог → тренировка на 10 вопросов → экран результата. */
async function completeTraining(page: Page): Promise<void> {
  await page.goto(`/tests/${TOPIC_SLUG}`);
  await page.getByRole("button", { name: "Начать: 10 вопросов" }).click();
  await expect(page).toHaveURL(/\/attempts\/[^/]+$/);

  for (let index = 1; index <= 10; index += 1) {
    await expect(page.getByText(`Вопрос ${index} из 10`)).toBeVisible();
    await answerCurrentQuestion(page);

    if (index < 10) {
      await page.getByRole("button", { name: "Следующий вопрос" }).click();
    }
  }

  await page.getByRole("button", { name: "Показать результат" }).click();
  await expect(page).toHaveURL(/\/attempts\/[^/]+\/result$/);
  await expect(page.getByRole("heading", { name: "Тренировка завершена" })).toBeVisible();
}

test.describe("Поделиться результатом", () => {
  test("ссылка открывается без входа, показывает только итог и OG-карточку", async ({
    page,
    context,
    browser,
  }) => {
    const email = await registerAndVerify(page, "share");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await completeTraining(page);

    await expect(page.getByRole("heading", { name: "Поделиться результатом" })).toBeVisible();

    const shareLinkInput = page.getByLabel("Ссылка на результат");
    const shareLink = await shareLinkInput.inputValue();
    expect(shareLink).toMatch(/^http:\/\/localhost:3000\/share\/[^/]+\/[A-Za-z0-9_-]{32}$/);

    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://localhost:3000",
    });
    await page.getByRole("button", { name: "Скопировать ссылку" }).click();
    await expect(page.getByText(/Ссылка скопирована/)).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shareLink);

    // Гость без cookie: страница результата должна открыться.
    const guest = await browser.newContext({ locale: "ru-RU" });
    const guestPage = await guest.newPage();

    const response = await guestPage.goto(shareLink);
    expect(response?.status()).toBe(200);
    await expect(guestPage.getByRole("heading", { name: TOPIC_TITLE, exact: true })).toBeVisible();
    await expect(guestPage.getByText(/из 10 верно/)).toBeVisible();
    await expect(guestPage.getByRole("heading", { name: "Поделиться результатом" })).toHaveCount(
      0,
    );

    // Почта автора не должна попасть ни в текст, ни в разметку.
    expect(await guestPage.content()).not.toContain(email);

    const robots = guestPage.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);

    const ogImage = await guestPage
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(ogImage).toBeTruthy();

    const image = await guestPage.request.get(ogImage ?? "");
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");

    await guest.close();
  });

  test("подделанная ссылка не открывает результат", async ({ page }) => {
    const response = await page.goto(
      "/share/cm5unknownattemptid/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Результат не открывается" }),
    ).toBeVisible();
  });

  test("прерванная тренировка не предлагает поделиться", async ({ page }) => {
    const email = await registerAndVerify(page, "share-abandon");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.goto(`/tests/${TOPIC_SLUG}`);
    await page.getByRole("button", { name: "Начать: 10 вопросов" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/);

    const abandonedId = new URL(page.url()).pathname.split("/").filter(Boolean).pop() ?? "";
    expect(abandonedId).not.toBe("");

    await answerCurrentQuestion(page);
    await page.getByRole("button", { name: "Выйти из тренировки" }).click();
    await page.getByRole("button", { name: "Прервать и выйти" }).click();

    await expect(page.getByRole("heading", { name: "Тренировка прервана" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Поделиться результатом" })).toHaveCount(0);

    // Даже с валидным токеном прерванная попытка не должна открываться:
    // сервис отдаёт только COMPLETED.
    const secret = process.env.AUTH_SECRET ?? "";
    expect(secret).not.toBe("");
    const token = createHmac("sha256", secret)
      .update(`share:attempt:${abandonedId}`)
      .digest("base64url")
      .slice(0, 32);

    const response = await page.request.get(`/share/${abandonedId}/${token}`);
    expect(response.status()).toBe(404);
  });
});
