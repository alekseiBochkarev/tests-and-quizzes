import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { login, registerAndVerify } from "./helpers";

/**
 * Сквозной сценарий учебного контура Sprint 2:
 * каталог → интересы → тренировка → результат → «Мои результаты».
 * Сид с демо-контентом выполняется перед e2e (npm run db:seed).
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

test.describe("Учебный контур", () => {
  test("гость видит каталог, но для тренировки нужен вход", async ({ page }) => {
    await page.goto("/tests");

    await expect(page.getByRole("heading", { name: "Тесты", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: TOPIC_TITLE, exact: true })).toBeVisible();
    await expect(page.getByText("Можно смотреть без входа")).toBeVisible();

    await page.goto(`/tests/${TOPIC_SLUG}`);
    await expect(page.getByRole("heading", { name: TOPIC_TITLE, exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Войти и начать" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Ftests%2Fhistory/);
  });

  test("интересы, тренировка на 10 вопросов и результат", async ({ page }) => {
    const email = await registerAndVerify(page, "learning");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    // Онбординг интересов показывается один раз после регистрации.
    await page.goto("/tests");
    await expect(page.getByRole("heading", { name: "Что вам интересно?" })).toBeVisible();
    await page.getByRole("checkbox", { name: TOPIC_TITLE }).check();
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Что вам интересно?" })).toHaveCount(0);

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
    await expect(page.getByText(/из 10 вопросов верно/)).toBeVisible();

    // История и сводка обновляются сразу после завершения.
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Итоги" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Последние тренировки" })).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Последние тренировки" })
        .getByRole("link", { name: TOPIC_TITLE }),
    ).toBeVisible();
  });

  test("тренировку можно прервать: ответы и прогресс сохраняются", async ({ page }) => {
    const email = await registerAndVerify(page, "resume");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.goto(`/tests/${TOPIC_SLUG}`);
    await page.getByRole("button", { name: "Начать: 10 вопросов" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/);

    await answerCurrentQuestion(page);
    await page.getByRole("button", { name: "Следующий вопрос" }).click();
    await expect(page.getByText("Вопрос 2 из 10")).toBeVisible();

    // Перезагрузка возвращает на первый неотвеченный вопрос.
    await page.reload();
    await expect(page.getByText("Вопрос 2 из 10")).toBeVisible();
    await expect(page.getByText("Уже отвечено: 1 из 10")).toBeVisible();

    await page.getByRole("button", { name: "Выйти из тренировки" }).click();
    await expect(page.getByRole("heading", { name: "Прервать тренировку?" })).toBeVisible();
    await page.getByRole("button", { name: "Прервать и выйти" }).click();

    await expect(page).toHaveURL(/\/attempts\/[^/]+\/result$/);
    await expect(page.getByRole("heading", { name: "Тренировка прервана" })).toBeVisible();
    await expect(page.getByText("Ответы, которые вы успели дать, сохранены.")).toBeVisible();
  });
});
