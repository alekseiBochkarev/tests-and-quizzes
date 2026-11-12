import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Размер текста для аудитории 55+ и автоматическая проверка доступности.
 * axe ищет нарушения уровней critical/serious; moderate/minor остаются
 * на ручной чек-лист приёмки.
 */

test.describe("Размер текста", () => {
  test("три шага, выбор сохраняется после перезагрузки", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-text-size", "s");

    await page.getByRole("button", { name: "Очень крупный" }).click();
    await expect(html).toHaveAttribute("data-text-size", "l");
    await expect(page.getByRole("button", { name: "Очень крупный" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.reload();
    await expect(html).toHaveAttribute("data-text-size", "l");
    await expect(page.getByRole("button", { name: "Очень крупный" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Обычный" }).click();
    await expect(html).toHaveAttribute("data-text-size", "s");
  });
});

test.describe("Доступность (axe)", () => {
  for (const path of ["/", "/login", "/register", "/tests", "/tests/history"]) {
    test(`${path}: нет нарушений critical/serious`, async ({ page }) => {
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      );

      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});
