import { expect, test } from "@playwright/test";

import { login, registerAndVerify, TEST_PASSWORD } from "./helpers";

/**
 * ACC-01: экспорт данных и удаление аккаунта.
 *
 * Удаление проверяем на свежем пользователе: после анонимизации его email
 * освобождается, поэтому повторный вход должен быть невозможен.
 */

test.describe("Данные и аккаунт", () => {
  test("экспорт отдаёт JSON со всеми данными и CSV истории", async ({ page }) => {
    const email = await registerAndVerify(page, "export");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await expect(page.getByRole("heading", { name: "Данные и аккаунт" })).toBeVisible();

    const jsonResponse = await page.request.get("/api/v1/me/export");
    expect(jsonResponse.status()).toBe(200);
    expect(jsonResponse.headers()["content-type"]).toContain("application/json");
    expect(jsonResponse.headers()["content-disposition"]).toContain("attachment");

    const payload = (await jsonResponse.json()) as {
      format: string;
      version: number;
      profile: Record<string, unknown>;
      attempts: unknown[];
      consents: unknown[];
    };

    expect(payload.format).toBe("testy-account-export");
    expect(payload.version).toBe(1);
    expect(payload.profile.email).toBe(email);
    expect(payload.profile).not.toHaveProperty("passwordHash");
    expect(Array.isArray(payload.attempts)).toBe(true);
    expect(Array.isArray(payload.consents)).toBe(true);

    const csvResponse = await page.request.get("/api/v1/me/export?format=csv");
    expect(csvResponse.status()).toBe(200);
    expect(csvResponse.headers()["content-type"]).toContain("text/csv");

    const csv = await csvResponse.text();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Дата;Тема;Формат;Статус");
  });

  test("удаление требует пароль, закрывает сессию и освобождает почту", async ({
    page,
    context,
  }) => {
    const email = await registerAndVerify(page, "delete");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.goto("/account/delete");
    await expect(page.getByRole("heading", { name: "Удаление аккаунта" })).toBeVisible();

    const password = page.getByLabel("Текущий пароль", { exact: true });
    const confirmation = page.getByLabel("Введите слово УДАЛИТЬ", { exact: true });
    const agree = page.getByRole("checkbox", { name: /Я понимаю/ });

    await password.fill("Wrong-Pass-2026!");
    await confirmation.fill("УДАЛИТЬ");
    await agree.check();
    await page.getByRole("button", { name: "Удалить аккаунт навсегда" }).click();

    await expect(page.getByText("Пароль не подошёл", { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/\/account\/delete$/);

    await password.fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Удалить аккаунт навсегда" }).click();

    await expect(page).toHaveURL(/\/\?account=deleted$/);
    await expect(page.getByText("Аккаунт удалён", { exact: true })).toBeVisible();

    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "quiz_user_id");
    expect(session?.value ?? "").toBe("");

    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/account");

    await page.getByLabel("Адрес почты").fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(page.getByText("Не удалось войти", { exact: false }).first()).toBeVisible();
  });
});
