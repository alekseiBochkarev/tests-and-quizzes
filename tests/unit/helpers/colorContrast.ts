/**
 * WCAG 2.1: относительная яркость и коэффициент контраста.
 *
 * Нужен unit-тесту палитр VIS-01 (`tests/unit/ui/topicThemeContrast.test.ts`).
 * Живёт в тестах, а не в `lib/`: продовый код контраст не считает, палитры
 * проверяются на CI. Формулы — из WCAG 2.1, пункты 1.4.3 и 1.4.6:
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

export type Rgb = {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
};

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Разбирает `#rgb` и `#rrggbb`. Любой другой формат — ошибка теста, а не «на глаз». */
export function parseHexColor(value: string): Rgb {
  const trimmed = value.trim();
  if (!HEX_PATTERN.test(trimmed)) {
    throw new Error(`Ожидался HEX-цвет вида #rrggbb, получено: «${value}»`);
  }

  const hex = trimmed.slice(1);
  const normalized =
    hex.length === 3
      ? [...hex]
          .map((channel) => channel + channel)
          .join("")
      : hex;

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Относительная яркость по WCAG 2.1 (0 — чёрный, 1 — белый). */
export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * channelLuminance(color.red) +
    0.7152 * channelLuminance(color.green) +
    0.0722 * channelLuminance(color.blue)
  );
}

/** Коэффициент контраста двух цветов: от 1 (нет контраста) до 21 (чёрный/белый). */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/** То же в HEX-записи — так читаются тесты: `contrastRatioHex("#fff", accent)`. */
export function contrastRatioHex(foreground: string, background: string): number {
  return contrastRatio(parseHexColor(foreground), parseHexColor(background));
}

/** Округление для сообщений об ошибке: 7.014 → «7.01». */
export function formatRatio(ratio: number): string {
  return ratio.toFixed(2);
}
