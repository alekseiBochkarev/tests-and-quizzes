import { expect, test } from "@playwright/test";

import { login, registerAndVerify, setUserRole } from "./helpers";

/**
 * CNT-03: доступ в служебный раздел.
 * Проверяем все четыре состояния: гость, обычный пользователь, редактор, админ.
 */

test.describe("Админка", () => {
  test("гость уходит на вход и возвращается в админку", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
    await expect(page.getByRole("heading", { name: "Вход", exact: true })).toBeVisible();
  });

  test("обычный пользователь не видит админку", async ({ page }) => {
    const email = await registerAndVerify(page, "admin-denied");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await expect(page.getByRole("link", { name: "Админка" })).toHaveCount(0);

    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Такой страницы нет" })).toBeVisible();
  });

  test("редактор видит контентные разделы, но не пользователей", async ({ page }) => {
    const email = await registerAndVerify(page, "editor");
    setUserRole(email, "EDITOR");

    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("link", { name: "Админка" })).toBeVisible();

    await page.getByRole("link", { name: "Админка" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Админка", exact: true })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Разделы админки" });
    await expect(nav.getByRole("link", { name: "Темы и вопросы" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Выпуски" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Импорт" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Пользователи" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Аналитика" })).toHaveCount(0);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Такой страницы нет" })).toBeVisible();
  });

  test("администратор видит все разделы", async ({ page }) => {
    const email = await registerAndVerify(page, "admin-full");
    setUserRole(email, "ADMIN");

    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Разделы админки" });

    for (const label of [
      "Обзор",
      "Темы и вопросы",
      "Выпуски",
      "Импорт",
      "Пользователи",
      "Аналитика",
    ]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }

    await nav.getByRole("link", { name: "Пользователи" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Пользователи" })).toBeVisible();
    await expect(page.getByText(/npm run user:role/)).toBeVisible();
  });
});
