import { expect, test } from "@playwright/test";

import { registerAndVerify, uniqueEmail } from "./helpers";

test.describe("Ошибки входа не раскрывают, существует ли аккаунт", () => {
  test("неверный пароль и несуществующий email дают одинаковое сообщение", async ({ page }) => {
    const email = await registerAndVerify(page, "login-errors");

    async function submitLogin(candidateEmail: string, password: string): Promise<string> {
      await page.goto("/login");
      await page.getByLabel("Адрес почты").fill(candidateEmail);
      await page.getByLabel("Пароль", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Войти", exact: true }).click();

      const alert = page.getByRole("alert").filter({ hasText: "Не удалось войти" });
      await expect(alert).toBeVisible();

      return (await alert.innerText()).replace(/\s+/g, " ").trim();
    }

    const wrongPasswordMessage = await submitLogin(email, "Wrong-Pass-2026!");
    const unknownEmailMessage = await submitLogin(uniqueEmail("unknown"), "Wrong-Pass-2026!");

    expect(wrongPasswordMessage).toContain("Не удалось войти. Проверьте почту и пароль.");
    expect(unknownEmailMessage).toBe(wrongPasswordMessage);

    // Ни один из ответов не должен намекать на существование аккаунта.
    for (const message of [wrongPasswordMessage, unknownEmailMessage]) {
      expect(message.toLowerCase()).not.toContain("нет аккаунта");
      expect(message.toLowerCase()).not.toContain("не найден");
      expect(message.toLowerCase()).not.toContain("неверный пароль");
    }
  });

  test("вход до подтверждения почты предлагает отправить письмо ещё раз", async ({ page }) => {
    const email = uniqueEmail("unverified");

    await page.goto("/register");
    await page.getByLabel("Адрес почты").fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill("Test-Pass-2026!");
    await page.getByRole("checkbox", { name: /пользовательское соглашение/i }).check();
    await page.getByRole("checkbox", { name: /политике конфиденциальности/i }).check();
    await page.getByRole("button", { name: "Сохранить результаты" }).click();
    await expect(page.getByText("Проверьте почту", { exact: false }).first()).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Адрес почты").fill(email);
    await page.getByLabel("Пароль", { exact: true }).fill("Test-Pass-2026!");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(page.getByText("Почта ещё не подтверждена", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Отправить письмо ещё раз" })).toBeVisible();
  });
});
