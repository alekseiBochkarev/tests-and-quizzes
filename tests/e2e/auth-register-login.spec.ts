import { expect, test } from "@playwright/test";

import { readVerifyLink, register, TEST_PASSWORD, uniqueEmail } from "./helpers";

test.describe("Сохранение результатов: регистрация → подтверждение → вход", () => {
  test("новый пользователь подтверждает почту и попадает в «Мои результаты»", async ({ page }) => {
    const email = uniqueEmail("register");

    await register(page, email);

    // Письмо читаем из dev-mailbox: страница динамическая и не отдаёт кеш.
    const mailbox = await page.request.get("/_dev/mailbox");
    expect(mailbox.status()).toBe(200);
    const mailboxHtml = await mailbox.text();
    expect(mailboxHtml).toContain("Письма для разработки");
    expect(mailboxHtml).toContain(email);

    const verifyPath = await readVerifyLink(page, email);
    expect(verifyPath).toContain("/verify-email?token=");

    await page.goto(verifyPath);
    await expect(page.getByRole("heading", { name: "Подтверждение почты" })).toBeVisible();

    await page.getByRole("button", { name: "Подтвердить почту" }).click();
    await expect(page).toHaveURL(/\/login\?verified=1/);
    await expect(page.getByText("Почта подтверждена", { exact: false }).first()).toBeVisible();

    await page.getByLabel("Адрес почты").fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "Мои результаты" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Итоги" })).toBeVisible();

    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === "quiz_user_id");
    expect(session, "после входа должна быть httpOnly-cookie сессии").toBeTruthy();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
  });
});
