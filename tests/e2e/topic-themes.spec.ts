import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { APP_URL } from "./appUrl";
import { login, registerAndVerify } from "./helpers";

/**
 * VIS-01: тематическое оформление (ТЗ `docs/tasks/13-visual-themes.md`).
 *
 * Проверяем не «красиво ли», а контракт разметки и стилей:
 *   каталог — полоса и знак у оформленных тем, нейтральный вид у остальных;
 *   страница темы — шапка-сцена и ключ у пяти тем уровня B, знак без сцены
 *   у уровня A, антиква только у литературы и истории;
 *   выпуск, плеер, результат и публичная ссылка — уровень A без сцены;
 *   «Гарри Поттер» — строка о правах и отсутствие чужих символов.
 *
 * Эталонных скриншотов в проекте нет, поэтому проверяются классы, атрибуты
 * и вычисленные цвета — они стабильнее пикселей.
 */

const BODY_BACKGROUND = "rgb(246, 244, 239)"; // --color-paper #f6f4ef
const BODY_COLOR = "rgb(27, 31, 36)"; // --color-ink #1b1f24

/** Темы уровня B: шапка-сцена, градиент, паттерн (§4 ТЗ). */
const HERO_TOPICS = [
  { slug: "soviet-cinema", title: "Советское кино", theme: "cinema" },
  { slug: "literature", title: "Литература", theme: "literature" },
  { slug: "animals", title: "Животные", theme: "animals" },
  { slug: "harry-potter", title: "Гарри Поттер", theme: "magic" },
] as const;

/** Темы уровня A: акцент, знак и полоса, без сцены. */
const FLAT_TOPICS = [
  { slug: "history", title: "История", theme: "history" },
  { slug: "geography", title: "География", theme: "geography" },
] as const;

/** Все оформленные темы, которые сейчас есть в каталоге (cooking/nostalgia — позже). */
const THEMED_CATALOG_TOPICS = [
  { slug: "soviet-cinema", title: "Советское кино" },
  { slug: "music", title: "Музыка" },
  { slug: "literature", title: "Литература" },
  { slug: "history", title: "История" },
  { slug: "geography", title: "География" },
  { slug: "animals", title: "Животные" },
  { slug: "harry-potter", title: "Гарри Поттер" },
] as const;

/** Нейтральные темы (§6.8 ТЗ): ни полосы, ни знака. */
const NEUTRAL_CATALOG_TOPICS = [
  { slug: "paintings", title: "Картины и художники" },
  { slug: "space", title: "Космос" },
  { slug: "sport", title: "Спорт" },
] as const;

/**
 * Запреты §6.5: логотип, гербы, молния, Дары Смерти, платформа 9¾, замок,
 * кадры и постеры, чужие домены и брендовые шрифты. Проверка по разметке
 * страницы темы — контент вопросов на странице не выводится, поэтому слова
 * из вопросов сюда не попадают.
 */
const FORBIDDEN_MARKUP = [
  { label: "логотип", pattern: /логотип/i },
  { label: "герб", pattern: /герб/i },
  { label: "молния", pattern: /молни/i },
  { label: "Дары Смерти", pattern: /дары\s+смерти/i },
  { label: "платформа 9¾", pattern: /9\u00BE/ },
  { label: "Хогвартс", pattern: /хогвартс/i },
  { label: "hogwarts", pattern: /hogwarts/i },
  { label: "harrypotter.com", pattern: /harrypotter\.com/i },
  { label: "pottermore", pattern: /pottermore/i },
  { label: "wizarding", pattern: /wizarding/i },
  { label: "warner", pattern: /warner\s*bros/i },
  { label: "постер", pattern: /постер/i },
] as const;

/**
 * Знак темы — SVG `TopicArt` с viewBox 32×32; сцена шапки — 260×160.
 * Селектор по viewBox, а не по `svg`, потому что dev-индикатор Next.js
 * тоже рисует SVG (40×40) и счётчик «одна SVG на странице» ломался бы
 * локально, проходя при этом в CI на собранном приложении.
 */
const MARK_SELECTOR = 'svg[viewBox="0 0 32 32"]';

/** Карточка темы в каталоге: `Card` с заголовком h3 внутри. */
function catalogCard(page: Page, title: string) {
  return page
    .locator("div.rounded-card")
    .filter({ has: page.getByRole("heading", { level: 3, name: title, exact: true }) });
}

/** Карточка вопроса в плеере: `Card` вокруг h1 вопроса. */
function questionCard(page: Page) {
  return page
    .locator("div.rounded-card")
    .filter({ has: page.getByRole("heading", { level: 1 }) })
    .first();
}

test.describe("каталог", () => {
  test("/tests: у оформленных тем полоса и знак, у нейтральных — ничего", async ({ page }) => {
    await page.goto("/tests");
    await expect(page.getByRole("heading", { name: "Тесты", exact: true })).toBeVisible();

    for (const topic of THEMED_CATALOG_TOPICS) {
      const card = catalogCard(page, topic.title);
      await expect(card, `карточка «${topic.title}»`).toHaveCount(1);

      await expect(card.locator(".topic-card-band"), `«${topic.title}»: полоса 3 px`).toHaveCount(1);

      const mark = card.locator("svg");
      await expect(mark, `«${topic.title}»: знак темы`).toHaveCount(1);

      const box = await mark.boundingBox();
      expect(box, `«${topic.title}»: знак должен иметь размер`).not.toBeNull();
      expect(Math.round(box?.width ?? 0), `«${topic.title}»: знак квадратный`).toBe(
        Math.round(box?.height ?? 0),
      );
      // 2rem при базовом кегле 18 px — 36 px; проверяем порядок «знак 32 px»,
      // а не пиксель в пиксель: размеры в rem масштабируются вместе с текстом.
      expect(box?.width ?? 0, `«${topic.title}»: знак 32–48 px`).toBeGreaterThanOrEqual(32);
      expect(box?.width ?? 0, `«${topic.title}»: знак 32–48 px`).toBeLessThanOrEqual(48);
    }

    for (const topic of NEUTRAL_CATALOG_TOPICS) {
      const card = catalogCard(page, topic.title);
      await expect(card, `карточка «${topic.title}»`).toHaveCount(1);

      await expect(card.locator(".topic-card-band"), `«${topic.title}»: полосы нет`).toHaveCount(0);
      await expect(card.locator("svg"), `«${topic.title}»: знака нет`).toHaveCount(0);
    }
  });

  test("карточка темы в каталоге помечена ключом оформления", async ({ page }) => {
    await page.goto("/tests");
    const card = catalogCard(page, "Советское кино");
    await expect(card).toHaveAttribute("data-topic-theme", "cinema");

    const accent = await card.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--color-accent").trim(),
    );
    expect(accent.toLowerCase()).toBe("#7a3b12");
  });
});

test.describe("страница темы, уровень B", () => {
  for (const topic of HERO_TOPICS) {
    test(`${topic.slug}: шапка-сцена, ключ темы и полоса`, async ({ page }) => {
      await page.goto(`/tests/${topic.slug}`);

      const container = page.locator(`[data-topic-theme="${topic.theme}"]`);
      await expect(container, "ключ оформления на контейнере страницы").toHaveCount(1);

      const hero = page.locator(".topic-hero");
      await expect(hero, "шапка темы должна быть").toBeVisible();

      const scene = hero.locator("svg.topic-hero-art");
      await expect(scene, "сцена в шапке").toBeVisible();

      // Сцена — собственная inline-SVG: ни внешних файлов, ни растровых вставок.
      const sceneMarkup = await scene.evaluate((element) => element.outerHTML);
      expect(sceneMarkup).not.toMatch(/https?:\/\//);
      expect(sceneMarkup).not.toMatch(/<image|<use|xlink:href/i);

      await expect(page.locator(".topic-stripe"), "полоса темы").toBeVisible();

      // `body` тема не перекрашивает: меняются только акцент и декор (§7.2, §10).
      await expect(page.locator("body")).toHaveCSS("background-color", BODY_BACKGROUND);
      await expect(page.locator("body")).toHaveCSS("color", BODY_COLOR);
    });
  }

  test("360 px: сцена под текстом и не шире 40 % шапки", async ({ page, context }) => {
    await context.addCookies([{ name: "text_size", value: "l", url: APP_URL }]);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/tests/literature");

    await expect(page.locator("html")).toHaveAttribute("data-text-size", "l");

    const heroBox = await page.locator(".topic-hero").boundingBox();
    const artBox = await page.locator("svg.topic-hero-art").boundingBox();
    const headingBox = await page.getByRole("heading", { level: 1 }).boundingBox();

    expect(heroBox, "шапка должна иметь размер").not.toBeNull();
    expect(artBox, "сцена должна иметь размер").not.toBeNull();
    expect(headingBox, "заголовок должен иметь размер").not.toBeNull();

    // Сцена уходит под текст: заголовок остаётся первым и выше сцены.
    expect(artBox?.y ?? 0, "сцена ниже заголовка").toBeGreaterThan(headingBox?.y ?? 0);
    // И занимает не более 40 % ширины шапки.
    expect(artBox?.width ?? 0, "сцена ≤ 40 % ширины шапки").toBeLessThanOrEqual(
      (heroBox?.width ?? 0) * 0.4 + 1,
    );
  });

  test("PT Serif только у литературы и истории, у кино — Golos", async ({ page }) => {
    await page.goto("/tests/literature");
    const literature = await page
      .getByRole("heading", { level: 1 })
      .evaluate((element) => getComputedStyle(element).fontFamily);
    expect(literature, "литература: книжная антиква").toMatch(/PT.?Serif/i);

    await page.goto("/tests/history");
    const history = await page
      .getByRole("heading", { level: 1 })
      .evaluate((element) => getComputedStyle(element).fontFamily);
    expect(history, "история: книжная антиква").toMatch(/PT.?Serif/i);

    await page.goto("/tests/soviet-cinema");
    const cinema = await page
      .getByRole("heading", { level: 1 })
      .evaluate((element) => getComputedStyle(element).fontFamily);
    expect(cinema, "кино: Golos, без антиквы").toMatch(/Golos/i);
    expect(cinema, "кино: антиквы нет").not.toMatch(/PT.?Serif/i);
  });
});

test.describe("страница темы, уровень A", () => {
  for (const topic of FLAT_TOPICS) {
    test(`${topic.slug}: акцент и знак без шапки-сцены`, async ({ page }) => {
      await page.goto(`/tests/${topic.slug}`);

      await expect(
        page.locator(`[data-topic-theme="${topic.theme}"]`),
        "ключ оформления на контейнере страницы",
      ).toHaveCount(1);

      await expect(page.locator(".topic-hero"), "сцены быть не должно").toHaveCount(0);
      await expect(page.locator(".topic-hero-art"), "сцены быть не должно").toHaveCount(0);
      await expect(page.locator(".topic-stripe"), "полоса темы").toBeVisible();

      // Знак есть — единственная SVG темы на странице (сцена не рисуется).
      await expect(page.locator(MARK_SELECTOR), "знак темы").toHaveCount(1);
    });
  }
});

test.describe("Гарри Поттер: юридическая рамка", () => {
  test("строка о правах внизу темы и отсутствие чужих символов", async ({ page }) => {
    await page.goto("/tests/harry-potter");

    const legal = page.getByText(
      "Тема по книгам Дж. К. Роулинг. Проект не связан с автором и правообладателями.",
      { exact: true },
    );
    await expect(legal, "строка о правах видна").toBeVisible();

    // Строка относится к теме, а не к глобальному подвалу (§9.18 ТЗ).
    expect(await legal.evaluate((element) => element.closest("footer") !== null)).toBe(false);
    expect(
      await legal.evaluate((element) => element.closest('[data-topic-theme="magic"]') !== null),
    ).toBe(true);

    expect(await legal.innerText()).not.toMatch(/по мотивам/i);

    const markup = await page.content();
    for (const item of FORBIDDEN_MARKUP) {
      expect(markup, `в разметке не должно быть: ${item.label}`).not.toMatch(item.pattern);
    }
  });
});

test.describe("страница выпуска", () => {
  test("history/release-1: ключ темы, знак и полоса, сцены нет", async ({ page }) => {
    await page.goto("/tests/history/release-1");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.locator('[data-topic-theme="history"]'),
      "ключ оформления на контейнере выпуска",
    ).toHaveCount(1);

    await expect(page.locator(".topic-stripe"), "полоса темы").toBeVisible();
    await expect(page.locator(".topic-hero"), "сцены на выпуске быть не должно").toHaveCount(0);
    await expect(page.locator(MARK_SELECTOR), "знак темы").toHaveCount(1);
  });
});

test.describe("плеер", () => {
  test("полоса и знак темы, карточка вопроса белая", async ({ page }) => {
    const email = await registerAndVerify(page, "vis-player");
    await login(page, email);
    await expect(page).toHaveURL(/\/account$/);

    await page.goto("/tests/soviet-cinema");
    await page.getByRole("button", { name: /^Начать: \d+ вопрос/ }).click();

    await expect(page).toHaveURL(/\/attempts\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 }), "вопрос виден").toBeVisible();

    await expect(
      page.locator('[data-topic-theme="cinema"]'),
      "ключ оформления на контейнере плеера",
    ).toHaveCount(1);
    await expect(page.locator(".topic-stripe"), "полоса темы").toBeVisible();

    // Знак темы — единственная SVG темы: декора поверх вопроса нет.
    await expect(page.locator(MARK_SELECTOR), "знак темы").toHaveCount(1);

    await expect(questionCard(page), "карточка вопроса белая").toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(questionCard(page).locator(".topic-hero-art")).toHaveCount(0);
  });
});
