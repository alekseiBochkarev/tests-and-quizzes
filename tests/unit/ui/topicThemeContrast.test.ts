import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isTopicHeroThemeKey,
  TOPIC_THEME_HERO_KEYS,
  TOPIC_THEME_KEYS,
} from "@/lib/ui/topicThemes";

import {
  contrastRatioHex,
  formatRatio,
  parseHexColor,
  relativeLuminance,
} from "../helpers/colorContrast";
import {
  declarations,
  hexStops,
  isSvgTile,
  rgbaAlphas,
  ruleBodies,
  ruleBody,
  stripCssComments,
  svgTileOpacities,
} from "../helpers/cssTokens";

/**
 * Контраст палитр VIS-01 (ТЗ `docs/tasks/13-visual-themes.md` §10, §13).
 *
 * Проверяются все девять пресетов из `app/globals.css`:
 *   белый на акценте ≥ 4.5:1 (и на цвете наведения — там тоже белый текст);
 *   акцент на бумаге, поверхности и `accent-soft` ≥ 4.5:1;
 *   «чернила» и вторичный текст на КАЖДОМ стопе wash ≥ 7:1 (не по среднему).
 *
 * Это и есть «сборка падает при нарушении»: тест читает реальный CSS, а не
 * таблицу из документа, и падает, если палитру поправят мимо порога.
 */

const CSS = stripCssComments(readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8"));

/** Семь токенов пресета (§3.1 ТЗ). */
const THEME_TOKENS = [
  "--color-accent",
  "--color-accent-hover",
  "--color-accent-soft",
  "--topic-hero-wash",
  "--topic-hero-pattern",
  "--topic-stripe",
  "--topic-band-pattern",
] as const;

/**
 * Токены, которые тема перекрашивать не может: текст, статусы, фокус, линии.
 * Иначе «освоено» и предупреждения потеряют смысл (§3.1, §3.5 ТЗ).
 */
const BASE_TOKENS = [
  "--color-paper",
  "--color-surface",
  "--color-ink",
  "--color-ink-soft",
  "--color-muted",
  "--color-line",
  "--color-line-strong",
  "--color-focus",
  "--color-success",
  "--color-success-soft",
  "--color-danger",
  "--color-danger-soft",
] as const;

/** Порог AAA для основного текста и правило задачи для вторичного на wash. */
const TEXT_ON_TEXTURE_MIN = 7;
/** Порог AA для обычного текста. */
const CONTRAST_MIN = 4.5;
/** Предел непрозрачности декоративного слоя в зоне без текста (§3.3 ТЗ). */
const TEXTURE_ALPHA_MAX = 0.2;
/** Допуск для сравнения дробных прозрачностей из CSS. */
const EPSILON = 1e-9;

const FORBIDDEN_TEXTURE_WORDS = ["logo", "crest", "emblem"];

type Palette = {
  readonly accent: string;
  readonly accentHover: string;
  readonly accentSoft: string;
  readonly wash: string;
  readonly washStops: readonly string[];
  readonly heroPattern: string;
  readonly stripe: string;
  readonly bandPattern: string;
};

function requireBlock(css: string, selector: string): ReadonlyMap<string, string> {
  const body = ruleBody(css, selector);
  if (body === null) throw new Error(`В app/globals.css нет блока ${selector}`);
  return declarations(body);
}

function rootTokens(): ReadonlyMap<string, string> {
  return requireBlock(CSS, "@theme");
}

function themeTokens(key: string): ReadonlyMap<string, string> {
  return requireBlock(CSS, `[data-topic-theme="${key}"]`);
}

function requireToken(
  tokens: ReadonlyMap<string, string>,
  name: string,
  where: string,
): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`В блоке ${where} нет токена ${name}`);
  return value;
}

function palette(key: string): Palette {
  const tokens = themeTokens(key);
  const where = `темы «${key}»`;

  return {
    accent: requireToken(tokens, "--color-accent", where),
    accentHover: requireToken(tokens, "--color-accent-hover", where),
    accentSoft: requireToken(tokens, "--color-accent-soft", where),
    wash: requireToken(tokens, "--topic-hero-wash", where),
    washStops: hexStops(requireToken(tokens, "--topic-hero-wash", where)),
    heroPattern: requireToken(tokens, "--topic-hero-pattern", where),
    stripe: requireToken(tokens, "--topic-stripe", where),
    bandPattern: requireToken(tokens, "--topic-band-pattern", where),
  };
}

/**
 * Итоговая прозрачность слоя паттерна: у градиентов она задана на
 * псевдоэлементе `.topic-hero::before` (0.55), у SVG-тайлов «Животных» и
 * «Гарри Поттера» кромка не притушается (1) — прозрачность зашита в тайл.
 *
 * Считаем только верхнюю кромку (`::before`): именно она рисует
 * `--topic-hero-pattern`. Нижняя у «Музыки» заменена клавиатурой и этот токен
 * не использует.
 */
function heroPatternLayerOpacity(key: string): number {
  const bodies = [
    ...ruleBodies(CSS, ".topic-hero::before"),
    ...ruleBodies(CSS, `[data-topic-theme="${key}"] .topic-hero::before`),
  ];

  const merged = new Map<string, string>();
  for (const body of bodies) {
    for (const [name, value] of declarations(body)) merged.set(name, value);
  }

  const raw = merged.get("opacity");
  if (raw === undefined) return 1;

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Не разобрать opacity «${raw}» у слоя паттерна темы «${key}»`);
  }

  return parsed;
}

/** Все блоки пресетов одним регулярным выражением: нужен для проверки лишних ключей. */
function declaredThemeBlocks(): string[] {
  const pattern = /(?:^|\n)\s*\[data-topic-theme="([a-z-]+)"\]\s*\{/g;
  return [...CSS.matchAll(pattern)].map((match) => match[1] ?? "");
}

describe("реестр и CSS не расходятся", () => {
  it("в globals.css ровно девять блоков — по одному на ключ реестра", () => {
    expect([...declaredThemeBlocks()].sort()).toEqual([...TOPIC_THEME_KEYS].sort());
  });

  it("каждый блок объявляет семь токенов и не перекрашивает базовые", () => {
    for (const key of TOPIC_THEME_KEYS) {
      const tokens = themeTokens(key);

      for (const name of THEME_TOKENS) {
        expect(tokens.has(name), `тема ${key}: нет токена ${name}`).toBe(true);
      }

      for (const name of BASE_TOKENS) {
        expect(tokens.has(name), `тема ${key}: перекрашивает базовый токен ${name}`).toBe(false);
      }
    }
  });
});

describe("базовые токены", () => {
  it("бумага остаётся #f6f4ef, текст на бумаге и поверхности читается", () => {
    const tokens = rootTokens();
    const paper = requireToken(tokens, "--color-paper", "@theme");
    const surface = requireToken(tokens, "--color-surface", "@theme");
    const ink = requireToken(tokens, "--color-ink", "@theme");
    const inkSoft = requireToken(tokens, "--color-ink-soft", "@theme");
    const muted = requireToken(tokens, "--color-muted", "@theme");

    // Порог «акцент на бумаге» из ТЗ считается именно к этому цвету.
    expect(paper.toLowerCase()).toBe("#f6f4ef");

    const pairs: ReadonlyArray<readonly [string, string, string, number]> = [
      ["основной текст", ink, paper, TEXT_ON_TEXTURE_MIN],
      ["основной текст на поверхности", ink, surface, TEXT_ON_TEXTURE_MIN],
      ["текст ink-soft", inkSoft, paper, TEXT_ON_TEXTURE_MIN],
      ["вторичный текст", muted, paper, CONTRAST_MIN],
      ["вторичный текст на поверхности", muted, surface, CONTRAST_MIN],
    ];

    for (const [label, foreground, background, minimum] of pairs) {
      const ratio = contrastRatioHex(foreground, background);
      expect(
        ratio,
        `${label}: ${foreground} на ${background} = ${formatRatio(ratio)}:1, нужно ≥ ${minimum}`,
      ).toBeGreaterThanOrEqual(minimum);
    }
  });
});

describe("wash: структура градиента", () => {
  it("линейный 135°, три стопа, самый тёмный — первый, последний — белый", () => {
    for (const key of TOPIC_THEME_KEYS) {
      const { wash, washStops } = palette(key);

      expect(wash, `тема ${key}`).toMatch(/^linear-gradient\(135deg,/);
      expect(washStops.length, `тема ${key}: стопы wash`).toBe(3);
      expect(wash, `тема ${key}: промежуточный стоп`).toContain("55%");
      expect(washStops[washStops.length - 1]?.toLowerCase(), `тема ${key}: последний стоп`).toBe(
        "#ffffff",
      );

      const luminances = washStops.map((stop) => relativeLuminance(parseHexColor(stop)));
      const darkest = Math.min(...luminances);
      expect(luminances[0], `тема ${key}: первый стоп должен быть самым тёмным`).toBe(darkest);
    }
  });
});

for (const key of TOPIC_THEME_KEYS) {
  describe(`контраст палитры «${key}»`, () => {
    it("белый текст на акценте и на цвете наведения ≥ 4.5:1", () => {
      const { accent, accentHover } = palette(key);

      const onAccent = contrastRatioHex("#ffffff", accent);
      expect(
        onAccent,
        `${key}: белый на ${accent} = ${formatRatio(onAccent)}:1, нужно ≥ ${CONTRAST_MIN}`,
      ).toBeGreaterThanOrEqual(CONTRAST_MIN);

      const onHover = contrastRatioHex("#ffffff", accentHover);
      expect(
        onHover,
        `${key}: белый на ${accentHover} = ${formatRatio(onHover)}:1, нужно ≥ ${CONTRAST_MIN}`,
      ).toBeGreaterThanOrEqual(CONTRAST_MIN);
    });

    it("акцент на бумаге, поверхности и accent-soft ≥ 4.5:1", () => {
      const { accent, accentSoft } = palette(key);
      const paper = requireToken(rootTokens(), "--color-paper", "@theme");
      const surface = requireToken(rootTokens(), "--color-surface", "@theme");

      const pairs: ReadonlyArray<readonly [string, string]> = [
        ["бумага", paper],
        ["поверхность карточки", surface],
        ["accent-soft", accentSoft],
      ];

      for (const [label, background] of pairs) {
        const ratio = contrastRatioHex(accent, background);
        expect(
          ratio,
          `${key}: ${accent} на ${background} (${label}) = ${formatRatio(ratio)}:1, нужно ≥ ${CONTRAST_MIN}`,
        ).toBeGreaterThanOrEqual(CONTRAST_MIN);
      }
    });

    it("основной и вторичный текст на каждом стопе wash ≥ 7:1", () => {
      const { washStops } = palette(key);
      const tokens = rootTokens();
      const ink = requireToken(tokens, "--color-ink", "@theme");
      const muted = requireToken(tokens, "--color-muted", "@theme");

      expect(washStops.length, `тема ${key}: стопы wash`).toBeGreaterThan(0);

      for (const stop of washStops) {
        const inkRatio = contrastRatioHex(ink, stop);
        expect(
          inkRatio,
          `${key}: «чернила» ${ink} на стопе ${stop} = ${formatRatio(inkRatio)}:1, нужно ≥ ${TEXT_ON_TEXTURE_MIN}`,
        ).toBeGreaterThanOrEqual(TEXT_ON_TEXTURE_MIN);

        const mutedRatio = contrastRatioHex(muted, stop);
        expect(
          mutedRatio,
          `${key}: вторичный текст ${muted} на стопе ${stop} = ${formatRatio(mutedRatio)}:1, нужно ≥ ${TEXT_ON_TEXTURE_MIN}`,
        ).toBeGreaterThanOrEqual(TEXT_ON_TEXTURE_MIN);
      }
    });
  });
}

describe("декоративный слой", () => {
  it("уровень A без паттерна, уровень B с паттерном", () => {
    for (const key of TOPIC_THEME_KEYS) {
      const { heroPattern } = palette(key);

      if (isTopicHeroThemeKey(key)) {
        expect(heroPattern, `тема ${key}: паттерн уровня B обязателен`).not.toBe("none");
        expect(heroPattern, `тема ${key}: ожидался градиент или SVG-тайл`).toMatch(
          /^(repeating-linear-gradient|url\()/,
        );
      } else {
        expect(heroPattern, `тема ${key}: у уровня A паттерна быть не должно`).toBe("none");
      }
    }
  });

  it("уровень B — ровно пять тем из реестра", () => {
    const heroKeys = TOPIC_THEME_KEYS.filter((key) => isTopicHeroThemeKey(key));
    expect(heroKeys).toEqual([...TOPIC_THEME_HERO_KEYS]);
  });

  it("SVG-тайлы не превышают заявленную непрозрачность: животные 6 %, магия 20 %", () => {
    const limits = [
      { key: "animals", limit: 0.06 },
      { key: "magic", limit: 0.2 },
    ] as const;

    for (const { key, limit } of limits) {
      const { heroPattern } = palette(key);

      expect(isSvgTile(heroPattern), `тема ${key}: ожидался SVG-тайл`).toBe(true);

      const opacities = svgTileOpacities(heroPattern);
      expect(opacities.length, `тема ${key}: в тайле нет opacity`).toBeGreaterThan(0);

      const tileOpacity = Math.max(...opacities);
      const layerOpacity = heroPatternLayerOpacity(key);
      const effective = tileOpacity * layerOpacity;

      expect(
        tileOpacity,
        `${key}: непрозрачность тайла ${tileOpacity} выше заявленной ${limit}`,
      ).toBeLessThanOrEqual(limit + EPSILON);

      expect(
        effective,
        `${key}: слой паттерна даёт ${effective.toFixed(3)} при пределе ${limit}`,
      ).toBeLessThanOrEqual(limit + EPSILON);
    }
  });

  it("градиентные паттерны не превышают 20 % в зоне без текста", () => {
    for (const key of TOPIC_THEME_KEYS) {
      const { heroPattern } = palette(key);

      if (heroPattern === "none" || isSvgTile(heroPattern)) continue;

      const alphas = rgbaAlphas(heroPattern);
      expect(alphas.length, `тема ${key}: в градиенте нет rgba()`).toBeGreaterThan(0);

      const layerOpacity = heroPatternLayerOpacity(key);
      const effective = Math.max(...alphas) * layerOpacity;

      expect(
        effective,
        `${key}: эффективная непрозрачность слоя ${effective.toFixed(3)} при пределе ${TEXTURE_ALPHA_MAX}`,
      ).toBeLessThanOrEqual(TEXTURE_ALPHA_MAX + EPSILON);
    }
  });

  it("декор не тянет внешние файлы: только градиенты и data-URI", () => {
    for (const key of TOPIC_THEME_KEYS) {
      const { heroPattern, bandPattern, stripe } = palette(key);

      for (const [name, value] of [
        ["--topic-hero-pattern", heroPattern],
        ["--topic-band-pattern", bandPattern],
        ["--topic-stripe", stripe],
      ] as const) {
        const withoutDataUris = value.replace(/url\(\s*["']?data:[^)]*\)/gi, "");
        expect(withoutDataUris, `тема ${key}: ${name} без url(…) на внешний файл`).not.toMatch(
          /url\(/i,
        );
        expect(value, `тема ${key}: ${name} без запрещённых слов`).not.toMatch(
          new RegExp(FORBIDDEN_TEXTURE_WORDS.join("|"), "i"),
        );
      }
    }
  });
});

describe("самопроверка порогов", () => {
  it("светлый акцент на белом не проходит AA — значит проверка способна упасть", () => {
    // #ffe08a на белом — 1.38:1: если бы формула считала неправильно,
    // этот тест «позеленил» бы плохую палитру.
    expect(contrastRatioHex("#ffe08a", "#ffffff")).toBeLessThan(CONTRAST_MIN);
    // Контрольная точка: чёрный на белом — ровно 21:1.
    expect(contrastRatioHex("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("подмена акцента в CSS ловится тем же путём: разбор → контраст", () => {
    const mutated = CSS.replace(
      /(\[data-topic-theme="cinema"\]\s*\{[^}]*--color-accent:\s*)#[0-9a-f]{6}/i,
      "$1#c9a17a",
    );
    expect(mutated, "мутация должна попасть в блок cinema").not.toBe(CSS);

    const mutatedAccent = requireToken(
      requireBlock(mutated, '[data-topic-theme="cinema"]'),
      "--color-accent",
      "мутированной темы cinema",
    );

    expect(mutatedAccent).toBe("#c9a17a");
    expect(
      contrastRatioHex("#ffffff", mutatedAccent),
      "светлый акцент обязан проваливать порог 4.5:1",
    ).toBeLessThan(CONTRAST_MIN);
  });
});
