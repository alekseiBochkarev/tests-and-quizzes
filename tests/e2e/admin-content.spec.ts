import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { login, registerAndVerify, setUserRole } from "./helpers";

/**
 * CNT-04: CRUD тем и вопросов, версионирование и импорт JSON.
 * Сид с разделами выполняется перед e2e (npm run db:seed), поэтому
 * «Кино и сериалы» уже существует.
 */

const CATEGORY_TITLE = "Кино и сериалы";

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function createTopic(page: Page): Promise<{ title: string; slug: string }> {
  const suffix = uniqueSuffix();
  const title = `Тема CNT-04 ${suffix}`;
  const slug = `cnt-04-${suffix}`;

  await page.goto("/admin/topics/new");
  await page.getByLabel("Название темы").fill(title);
  await page.getByLabel("Адрес темы").fill(slug);
  await page.getByLabel("Раздел", { exact: true }).selectOption({ label: CATEGORY_TITLE });
  await page
    .getByLabel("Описание", { exact: true })
    .fill("Временная тема для проверки админки. Удаляется в архив.");
  await page.getByLabel("Статус", { exact: true }).selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Сохранить тему" }).click();

  await expect(page).toHaveURL(/\/admin\/topics\/[^/?]+/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  return { title, slug };
}

async function loginAsEditor(page: Page, prefix: string): Promise<void> {
  const email = await registerAndVerify(page, prefix);
  setUserRole(email, "EDITOR");
  await login(page, email);
  await expect(page).toHaveURL(/\/account$/);
}

test.describe("Админка контента", () => {
  test("редактор создаёт тему и вопрос, публикует и версионирует правку", async ({ page }) => {
    await loginAsEditor(page, "admin-topic");

    const { title, slug } = await createTopic(page);

    await page.getByRole("link", { name: "Добавить вопрос" }).first().click();
    await expect(page.getByRole("heading", { name: "Новый вопрос" })).toBeVisible();

    await page
      .getByLabel("Текст вопроса")
      .fill("Кто снял фильм «Москва слезам не верит»?");
    await page.getByLabel("Вариант 1", { exact: true }).fill("Владимир Меньшов");
    await page.getByLabel("Вариант 2", { exact: true }).fill("Эльдар Рязанов");
    await page.getByLabel("Вариант 3", { exact: true }).fill("Георгий Данелия");
    await page.getByLabel("Вариант 4", { exact: true }).fill("Никита Михалков");
    await page.getByRole("radio", { name: "Правильный ответ: вариант 1" }).check();
    await page
      .getByLabel("Объяснение")
      .fill("Фильм снял Владимир Меньшов, он же сыграл одну из ролей.");
    await page.getByLabel("Статус", { exact: true }).selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Сохранить вопрос" }).click();

    await expect(page).toHaveURL(new RegExp(`/admin/topics/[^/?]+\\?saved=1$`));
    await expect(page.getByText("Изменения сохранены.")).toBeVisible();
    await expect(page.getByText("Кто снял фильм «Москва слезам не верит»?")).toBeVisible();

    // Опубликованная тема с вопросом видна в публичном каталоге.
    await page.goto(`/tests/${slug}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // Правка опубликованного вопроса создаёт новую версию.
    await page.goto("/admin/topics");
    await page.getByRole("link", { name: title }).first().click();
    await page.getByRole("link", { name: "Открыть вопрос" }).first().click();
    await expect(page.getByRole("heading", { name: "Редактирование вопроса" })).toBeVisible();

    await page
      .getByLabel("Текст вопроса")
      .fill("Кто снял фильм «Москва слезам не верит»? Уточните режиссёра.");
    await page.getByRole("button", { name: "Сохранить вопрос" }).click();

    await expect(page).toHaveURL(/\/admin\/topics\/[^/?]+\?versioned=1$/);
    await expect(page.getByText("Создана новая версия")).toBeVisible();
    await expect(
      page.getByText("Кто снял фильм «Москва слезам не верит»? Уточните режиссёра."),
    ).toBeVisible();
    await expect(page.getByText(/Версия 2/)).toBeVisible();
  });

  test("редактор загружает JSON с предпросмотром и подтверждением", async ({ page }) => {
    await loginAsEditor(page, "admin-import");
    const { title } = await createTopic(page);

    await page.goto("/admin/import");
    await expect(page.getByRole("heading", { name: "Импорт вопросов" })).toBeVisible();

    await page
      .getByLabel("Тема, в которую загружаем", { exact: true })
      .selectOption({ label: `${CATEGORY_TITLE}: ${title}` });

    const payload = {
      questions: [
        {
          question: "Какой фильм получил «Оскар» в 1981 году?",
          options: ["Москва слезам не верит", "Служебный роман", "Осенний марафон", "Покровские ворота"],
          correct_index: 0,
          explanation: "Премию «Оскар» за лучший фильм на иностранном языке получил фильм Владимира Меньшова.",
        },
      ],
    };

    await page.getByLabel("Или вставьте JSON").fill(JSON.stringify(payload));
    await page.getByRole("button", { name: "Проверить и показать предпросмотр" }).click();

    await expect(page.getByRole("heading", { name: "Предпросмотр" })).toBeVisible();
    await expect(page.getByText("Ошибок нет")).toBeVisible();
    await expect(page.getByText("Добавится", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Загрузить вопросы" }).click();
    await expect(page.getByText("Вопросы загружены")).toBeVisible();

    await page.getByRole("link", { name: "Открыть тему и проверить вопросы" }).click();
    await expect(
      page.getByText("Какой фильм получил «Оскар» в 1981 году?"),
    ).toBeVisible();
  });

  test("админские API закрыты для гостя и обычного пользователя", async ({ page }) => {
    const body = {
      data: JSON.stringify({
        categoryId: "x",
        title: "Тема",
        slug: "tema",
        status: "DRAFT",
      }),
    };

    const guestResponse = await page.request.post("/api/v1/admin/topics", { data: body });
    expect(guestResponse.status()).toBe(401);

    const email = await registerAndVerify(page, "admin-api-denied");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    const userResponse = await page.request.post("/api/v1/admin/topics", { data: body });
    expect(userResponse.status()).toBe(404);
  });
});
