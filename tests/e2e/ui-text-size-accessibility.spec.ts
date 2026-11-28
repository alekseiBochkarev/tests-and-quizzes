import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { APP_URL } from "./appUrl";

/**
 * Размер текста для аудитории 55+ и автоматическая проверка доступности.
 * axe ищет нарушения уровней critical/serious; moderate/minor остаются
 * на ручной чек-лист приёмки.
 *
 * VIS-01 §10: шесть страниц каталога и пяти оформленных тем проверяются
 * на 360 px и desktop при базовом (18 px) и очень крупном (22 px) тексте.
 */

/** Базовые страницы и оформленные темы VIS-01 (§10 ТЗ). */
const ACCESSIBILITY_PATHS = [
  "/",
  "/login",
  "/register",
  "/tests",
  "/tests/history",
  "/tests/soviet-cinema",
  "/tests/music",
  "/tests/literature",
  "/tests/animals",
  "/tests/harry-potter",
] as const;

/** Матрица «ширина × кегль» из acceptance criteria. */
const ACCESSIBILITY_ENVIRONMENTS = [
  { label: "360 px, 18 px", viewport: { width: 360, height: 780 }, textSize: "s" },
  { label: "360 px, 22 px", viewport: { width: 360, height: 780 }, textSize: "l" },
  { label: "desktop, 18 px", viewport: { width: 1280, height: 900 }, textSize: "s" },
  { label: "desktop, 22 px", viewport: { width: 1280, height: 900 }, textSize: "l" },
] as const;

/**
 * Размер текста хранится в cookie `text_size` и применяется на сервере
 * (`app/layout.tsx`). Ставим cookie напрямую: так проверяется серверный рендер,
 * а не только клиентское переключение.
 */
async function setTextSize(page: Page, size: "s" | "l"): Promise<void> {
  await page.context().addCookies([
    { name: "text_size", value: size, url: `${APP_URL}/` },
  ]);
}

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
  for (const path of ACCESSIBILITY_PATHS) {
    test(`${path}: нет нарушений critical/serious на 360 px и desktop при 18 и 22 px`, async ({
      page,
    }) => {
      test.setTimeout(180_000);

      for (const environment of ACCESSIBILITY_ENVIRONMENTS) {
        await setTextSize(page, environment.textSize);
        await page.setViewportSize(environment.viewport);
        await page.goto(path);

        await expect(
          page.locator("html"),
          `${path} (${environment.label}): размер текста должен примениться на сервере`,
        ).toHaveAttribute("data-text-size", environment.textSize);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        const blocking = results.violations.filter(
          (violation) => violation.impact === "critical" || violation.impact === "serious",
        );

        expect(
          blocking,
          `${path} (${environment.label}): ${JSON.stringify(blocking, null, 2)}`,
        ).toEqual([]);
      }
    });
  }
});
