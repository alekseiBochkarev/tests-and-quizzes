import { expect, test } from "@playwright/test";

import { login, registerAndVerify } from "./helpers";

test.describe("Защита /account и выход", () => {
  test("без cookie /account редиректит на /login?next=/account", async ({ page }) => {
    await page.goto("/account");

    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/account");
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  });

  test("выход очищает сессию и закрывает /account", async ({ page }) => {
    const email = await registerAndVerify(page, "guard");

    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.getByRole("button", { name: "Выйти", exact: true }).first().click();

    await expect(page).toHaveURL(/\/$/);
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "quiz_user_id")).toBeUndefined();

    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/account");
  });

  test("«Выйти на всех устройствах» тоже закрывает /account", async ({ page }) => {
    const email = await registerAndVerify(page, "logout-all");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.getByRole("button", { name: "Выйти на всех устройствах" }).click();

    await expect(page).toHaveURL(/\/$/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });
});
