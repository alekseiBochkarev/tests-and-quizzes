/**
 * Тематическое оформление страниц (пилот).
 *
 * Карта «slug темы → ключ оформления» живёт в коде: в базе пока нет поля темы,
 * и для пилота оно не нужно. Ключ превращается в атрибут `data-topic-theme`,
 * а цвета и узор задаются CSS-переменными в `app/globals.css`.
 *
 * Новую тему добавляем здесь одной строкой: `"slug": "key"` и блок
 * `[data-topic-theme="key"]` со своими токенами. Незнакомый slug получает
 * `null` — страница выглядит как обычная, без декора.
 */

export const TOPIC_THEME_KEYS = ["cinema", "music"] as const;

export type TopicThemeKey = (typeof TOPIC_THEME_KEYS)[number];

const THEME_BY_SLUG: Readonly<Record<string, TopicThemeKey>> = {
  "soviet-cinema": "cinema",
  music: "music",
};

/** Возвращает ключ оформления для темы или `null`, если тема нейтральная. */
export function getTopicTheme(slug: string | null | undefined): TopicThemeKey | null {
  if (!slug) return null;
  return THEME_BY_SLUG[slug.trim().toLowerCase()] ?? null;
}
