/**
 * Тематическое оформление страниц (VIS-01).
 *
 * Реестр ключей — единый источник правды для админки, сида и публичного API.
 * Редактор выбирает ключ в `Topic.themeKey`; если поле пустое, работает
 * фолбэк по slug (так живут темы пилота). Незнакомое значение из базы
 * трактуется как нейтральная тема и не роняет страницу.
 *
 * Новую тему добавляем здесь одной строкой `"slug": "key"` и блоком
 * `[data-topic-theme="key"]` со своими токенами в `app/globals.css`.
 * Тема без ключа — не «сломанная», а спокойная: базовый акцент проекта.
 */

export const TOPIC_THEME_KEYS = [
  "cinema",
  "music",
  "literature",
  "history",
  "geography",
  "animals",
  "cooking",
  "nostalgia",
  "magic",
] as const;

export type TopicThemeKey = (typeof TOPIC_THEME_KEYS)[number];

/** Названия тем в интерфейсе — ровно как в ТЗ VIS-01 §6. */
export const TOPIC_THEME_LABELS: Record<TopicThemeKey, string> = {
  cinema: "Советское кино",
  music: "Песни и музыка",
  literature: "Литература",
  history: "История",
  geography: "География",
  animals: "Животные",
  cooking: "Кулинария и традиции",
  nostalgia: "Быт и ностальгия",
  magic: "Гарри Поттер",
};

/** Уровень B: тема получает шапку-сцену, градиент и паттерн. */
export const TOPIC_THEME_HERO_KEYS = ["cinema", "music", "literature", "animals", "magic"] as const;

/** Узкий тип для сцен `TopicHeroArt`: только темы уровня B. */
export type TopicHeroThemeKey = (typeof TOPIC_THEME_HERO_KEYS)[number];

/** «Книжный» тон: PT Serif 700 только в `h1` этих тем. */
export const TOPIC_THEME_SERIF_KEYS = ["literature", "history"] as const;

export type TopicSerifThemeKey = (typeof TOPIC_THEME_SERIF_KEYS)[number];

/**
 * Карта «slug темы → ключ оформления».
 *
 * Нужна как фолбэк для тем, у которых `themeKey` ещё не заполнен, а также
 * тестам, сиду и предпросмотру в админке.
 */
export const THEME_BY_SLUG: Readonly<Record<string, TopicThemeKey>> = {
  "soviet-cinema": "cinema",
  music: "music",
  literature: "literature",
  history: "history",
  geography: "geography",
  animals: "animals",
  "harry-potter": "magic",
  cooking: "cooking",
  nostalgia: "nostalgia",
};

/** Проверяет, что значение — известный ключ оформления. */
export function isTopicThemeKey(value: unknown): value is TopicThemeKey {
  return typeof value === "string" && (TOPIC_THEME_KEYS as readonly string[]).includes(value);
}

/**
 * Проверяет, что тема получает шапку-сцену (уровень B).
 * Страница, у которой ключ не проходит проверку, не рисует сцену вообще,
 * а не подменяет её чужой (§3.4, §4 ТЗ).
 */
export function isTopicHeroThemeKey(
  value: TopicThemeKey | null | undefined,
): value is TopicHeroThemeKey {
  return typeof value === "string" && (TOPIC_THEME_HERO_KEYS as readonly string[]).includes(value);
}

/** Проверяет, что `h1` темы набирается «книжной» антиквой (PT Serif 700). */
export function isTopicSerifThemeKey(
  value: TopicThemeKey | null | undefined,
): value is TopicSerifThemeKey {
  return typeof value === "string" && (TOPIC_THEME_SERIF_KEYS as readonly string[]).includes(value);
}

/**
 * Выбирает ключ оформления для темы.
 *
 * Ключ из базы важнее фолбэка по slug: редактор может снять оформление или
 * задать другое. Незнакомый ключ из базы (ручная правка) даёт `null`, а не
 * фолбэк: страница остаётся нейтральной, а не «угадывает» тему.
 */
export function resolveTopicTheme(
  slug: string | null | undefined,
  themeKey: string | null | undefined,
): TopicThemeKey | null {
  const normalizedKey = themeKey?.trim().toLowerCase();
  if (normalizedKey) return isTopicThemeKey(normalizedKey) ? normalizedKey : null;

  if (!slug) return null;
  return THEME_BY_SLUG[slug.trim().toLowerCase()] ?? null;
}
