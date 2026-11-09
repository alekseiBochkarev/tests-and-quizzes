export const TEXT_SIZE_COOKIE = "text_size";

export const TEXT_SIZES = ["s", "m", "l"] as const;

export type TextSize = (typeof TEXT_SIZES)[number];

/** Неизвестное или отсутствующее значение cookie безопасно сводится к базовому размеру. */
export function parseTextSize(value: string | undefined | null): TextSize {
  return value === "m" || value === "l" ? value : "s";
}

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  s: "Обычный",
  m: "Крупный",
  l: "Очень крупный",
};
