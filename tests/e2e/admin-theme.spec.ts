import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

import { APP_URL } from "./appUrl";
import { login, registerAndVerify, setUserRole } from "./helpers";

/**
 * VIS-01: выбор оформления темы в админке.
 *
 * Проверяем acceptance criteria §10:
 * - неизвестный ключ оформления отклоняется с 400 `validation_error`
 *   и подсветкой поля `themeKey`, тема остаётся нетронутой;
 * - известный ключ сохраняется, отражается в форме и на публичной странице;
 * - тема возвращается к исходному оформлению, чтобы прогон был повторяемым.
 */

const TOPIC_SLUG = "soviet-cinema";
const ORIGINAL_THEME = "cinema";
const NEW_THEME = "history";
const UNKNOWN_THEME = "sparkles";

/** `assertSameOrigin`: запрос из теста приходит без браузерных подсказок. */
const ORIGIN_HEADERS = { origin: APP_URL };

type CatalogTopic = {
  id: string;
  slug: string;
  title: string;
  themeKey: string | null;
};

type CatalogCategory = {
  id: string;
  topics: CatalogTopic[];
};

type TopicFormSnapshot = {
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  order: string;
  themeKey: string;
  status: string;
};

type TopicInputPayload = {
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  themeKey: string | null;
  order?: number;
  status: string;
};

async function loginAsEditor(page: Page): Promise<void> {
  const email = await registerAndVerify(page, "admin-theme");
  setUserRole(email, "EDITOR");
  await login(page, email);
  await expect(page).toHaveURL(/\/account$/);
}

/** Тема и её раздел из публичного каталога: только так узнаём настоящие id. */
async function readCatalogTopic(
  request: APIRequestContext,
  slug: string,
): Promise<{ topic: CatalogTopic; categoryId: string }> {
  const response = await request.get("/api/v1/catalog");
  expect(response.status(), "каталог должен отвечать 200").toBe(200);

  const body = (await response.json()) as { data: { categories: CatalogCategory[] } };

  for (const category of body.data.categories) {
    const topic = category.topics.find((item) => item.slug === slug);
    if (topic) return { topic, categoryId: category.id };
  }

  throw new Error(`В каталоге нет темы ${slug}. Запустите npm run db:seed.`);
}

/** Значения формы редактирования — ровно то, что отправит PATCH при восстановлении. */
async function readFormSnapshot(page: Page, topicId: string): Promise<TopicFormSnapshot> {
  await page.goto(`/admin/topics/${topicId}/edit`);
  await expect(page.getByRole("heading", { name: "Редактирование темы" })).toBeVisible();

  return {
    categoryId: await page.locator("#topic-category").inputValue(),
    title: await page.locator("#topic-title").inputValue(),
    slug: await page.locator("#topic-slug").inputValue(),
    description: await page.locator("#topic-description").inputValue(),
    coverUrl: await page.locator("#topic-cover").inputValue(),
    order: await page.locator("#topic-order").inputValue(),
    themeKey: await page.locator("#topic-theme").inputValue(),
    status: await page.locator("#topic-status").inputValue(),
  };
}

function toTopicPayload(
  snapshot: TopicFormSnapshot,
  themeKey: string | null,
): TopicInputPayload {
  return {
    categoryId: snapshot.categoryId,
    title: snapshot.title,
    slug: snapshot.slug,
    description: snapshot.description,
    coverUrl: snapshot.coverUrl,
    themeKey,
    ...(snapshot.order.trim() ? { order: Number(snapshot.order) } : {}),
    status: snapshot.status,
  };
}

async function patchTopic(
  request: APIRequestContext,
  topicId: string,
  payload: TopicInputPayload,
): Promise<{ status: number; body: unknown }> {
  const response = await request.patch(`/api/v1/admin/topics/${topicId}`, {
    headers: ORIGIN_HEADERS,
    data: payload,
  });

  return { status: response.status(), body: (await response.json()) as unknown };
}

async function readPublicThemeKey(
  request: APIRequestContext,
  slug: string,
): Promise<string | null> {
  const response = await request.get(`/api/v1/topics/${slug}`);
  expect(response.status(), "публичная тема должна отвечать 200").toBe(200);

  const body = (await response.json()) as { data: { topic: { themeKey: string | null } } };
  return body.data.topic.themeKey;
}

test.describe("Админка: оформление темы", () => {
  test("ключ оформления проверяется по реестру и меняет вид темы", async ({ page }) => {
    await loginAsEditor(page);

    const { topic, categoryId } = await readCatalogTopic(page.request, TOPIC_SLUG);
    expect(
      topic.themeKey,
      "у темы из сида должно быть оформление cinema; если тест прервался — npm run db:seed",
    ).toBe(ORIGINAL_THEME);

    const snapshot = await readFormSnapshot(page, topic.id);
    expect(snapshot.categoryId, "форма показывает раздел темы").toBe(categoryId);
    expect(snapshot.slug).toBe(TOPIC_SLUG);
    expect(snapshot.themeKey, "форма показывает текущее оформление").toBe(ORIGINAL_THEME);

    try {
      // 1. Неизвестный ключ отклоняется, поле подсвечено, тема не меняется.
      const rejected = await patchTopic(
        page.request,
        topic.id,
        toTopicPayload(snapshot, UNKNOWN_THEME),
      );
      expect(rejected.status, "неизвестное оформление — 400").toBe(400);

      const rejection = rejected.body as {
        error?: { code?: string; message?: string; details?: { fields?: Record<string, string> } };
      };
      expect(rejection.error?.code).toBe("validation_error");
      expect(rejection.error?.message, "сообщение объясняет, что проверить").toBe(
        "Проверьте заполнение формы.",
      );
      expect(
        rejection.error?.details?.fields?.themeKey,
        "ошибка привязана к полю themeKey",
      ).toBeTruthy();

      expect(
        await readPublicThemeKey(page.request, TOPIC_SLUG),
        "отклонённый запрос не меняет оформление",
      ).toBe(ORIGINAL_THEME);

      // 2. Известный ключ сохраняется и виден в API, форме и на странице темы.
      const accepted = await patchTopic(page.request, topic.id, toTopicPayload(snapshot, NEW_THEME));
      expect(accepted.status, "известное оформление — 200").toBe(200);

      const acceptedBody = accepted.body as { data?: { topic?: { slug?: string } } };
      expect(acceptedBody.data?.topic?.slug).toBe(TOPIC_SLUG);

      expect(await readPublicThemeKey(page.request, TOPIC_SLUG)).toBe(NEW_THEME);

      const refreshed = await readFormSnapshot(page, topic.id);
      expect(refreshed.themeKey, "форма показывает сохранённое оформление").toBe(NEW_THEME);

      await page.goto(`/tests/${TOPIC_SLUG}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.locator(`[data-topic-theme="${NEW_THEME}"]`),
        "страница темы применяет новое оформление",
      ).toHaveCount(1);
      await expect(page.locator(`[data-topic-theme="${ORIGINAL_THEME}"]`)).toHaveCount(0);
    } finally {
      // 3. Возвращаем исходное оформление, чтобы прогон можно было повторить.
      const restored = await patchTopic(
        page.request,
        topic.id,
        toTopicPayload(snapshot, snapshot.themeKey || null),
      );
      expect(restored.status, "восстановление исходного оформления").toBe(200);
    }

    expect(await readPublicThemeKey(page.request, TOPIC_SLUG)).toBe(ORIGINAL_THEME);
  });
});
