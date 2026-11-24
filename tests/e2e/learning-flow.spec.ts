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
const QUIZ_TITLE = "История: основной выпуск";

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

  test("готовый выпуск: постоянная ссылка, прохождение и результат", async ({ page }) => {
    const email = await registerAndVerify(page, "quiz");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.goto(`/tests/${TOPIC_SLUG}`);
    await expect(page.getByRole("heading", { name: "Готовые выпуски" })).toBeVisible();
    await page.getByRole("link", { name: "Открыть выпуск" }).first().click();

    await expect(page).toHaveURL(new RegExp(`/tests/${TOPIC_SLUG}/[^/]+$`));
    await expect(page.getByRole("heading", { name: QUIZ_TITLE, exact: true })).toBeVisible();

    // Постоянная ссылка: перезагрузка открывает тот же выпуск.
    await page.reload();
    await expect(page.getByRole("heading", { name: QUIZ_TITLE, exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Начать выпуск: 10 вопросов" }).click();
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
    await expect(page.getByText(`Выпуск «${QUIZ_TITLE}»`)).toBeVisible();
    await expect(page.getByText(/из 10 вопросов верно/)).toBeVisible();

    // Результат выпуска — обычная попытка в истории.
    await page.goto("/account");
    await expect(
      page
        .getByRole("region", { name: "Последние тренировки" })
        .getByRole("link", { name: QUIZ_TITLE }),
    ).toBeVisible();
  });

  test("тест дня: один набор в день, бонус и результат", async ({ page }) => {
    const email = await registerAndVerify(page, "daily");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Тест дня", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Начать тест дня" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+$/);

    // Повторный старт в тот же день возвращает ту же попытку.
    const second = await page.request.post("/api/v1/daily/start");
    expect(second.ok()).toBe(true);
    const secondPayload = (await second.json()) as {
      data: { attemptId: string; questionCount: number; status: string };
    };
    expect(page.url()).toContain(secondPayload.data.attemptId);
    expect(secondPayload.data.status).toBe("in_progress");

    const questionCount = secondPayload.data.questionCount;
    expect(questionCount).toBeGreaterThanOrEqual(5);
    expect(questionCount).toBeLessThanOrEqual(7);

    for (let index = 1; index <= questionCount; index += 1) {
      await expect(page.getByText(`Вопрос ${index} из ${questionCount}`)).toBeVisible();
      await answerCurrentQuestion(page);

      if (index < questionCount) {
        await page.getByRole("button", { name: "Следующий вопрос" }).click();
      }
    }

    await page.getByRole("button", { name: "Показать результат" }).click();
    await expect(page).toHaveURL(/\/attempts\/[^/]+\/result$/);
    await expect(page.getByRole("heading", { name: "Тест дня завершён" })).toBeVisible();
    await expect(page.getByText(/из \d+ вопросов верно/)).toBeVisible();
    await expect(page.getByText(/Включая \+30 баллов за завершение теста дня/)).toBeVisible();

    // После завершения повторный старт возвращает ту же завершённую попытку.
    const third = await page.request.post("/api/v1/daily/start");
    expect(third.ok()).toBe(true);
    const thirdPayload = (await third.json()) as {
      data: { attemptId: string; status: string };
    };
    expect(thirdPayload.data.status).toBe("completed");
    expect(page.url()).toContain(thirdPayload.data.attemptId);

    // Завершённый тест дня виден на главной и в истории.
    await page.goto("/");
    await expect(page.getByText(/Сегодняшний тест дня пройден/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Начать тест дня" })).toHaveCount(0);

    await page.goto("/account");
    await expect(
      page
        .getByRole("region", { name: "Последние тренировки" })
        .getByRole("link", { name: "Тест дня" }),
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
