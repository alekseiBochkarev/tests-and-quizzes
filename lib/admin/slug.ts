/**
 * Адрес темы (slug). Отдельный модуль без Node-зависимостей: его использует
 * и серверная схема, и клиентская форма (подсказка адреса из названия).
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TRANSLITERATION: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Адрес темы из русского названия. Редактору не нужно знать латиницу:
 * «Советское кино» → `sovetskoe-kino`. Результат проходит SLUG_PATTERN.
 */
export function slugify(value: string): string {
  const lower = normalizeSlug(value).replace(/ё/g, "е");
  let result = "";

  for (const character of lower) {
    if (/[a-z0-9]/.test(character)) {
      result += character;
      continue;
    }

    const transliterated = TRANSLITERATION[character];
    if (transliterated !== undefined) {
      result += transliterated;
      continue;
    }

    result += "-";
  }

  return result
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}
