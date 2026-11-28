import { z } from "zod";

import { TOPIC_THEME_KEYS } from "@/lib/ui/topicThemes";

/**
 * Контракт публичного API каталога и темы (VIS-01, ТЗ §7.6).
 *
 * Схемы фиксируют форму ответа до UI: если сериализация разойдётся, лучше
 * получить ошибку на сервере, чем отдать клиенту битый каталог.
 * `lastActivityAt` в базе — `Date`, а в JSON — строка, поэтому принимаем оба
 * вида: маршрут валидирует объект до отправки, тесты — уже готовый ответ.
 */

const topicThemeKeySchema = z.enum(TOPIC_THEME_KEYS);

const topicProgressSchema = z
  .object({
    progress: z.number(),
    coverage: z.number(),
    accuracy: z.number(),
    seenQuestions: z.number(),
    masteredQuestions: z.number(),
    totalQuestions: z.number(),
    level: z.number(),
    lastActivityAt: z.coerce.date().nullable(),
  })
  .nullable();

const catalogTopicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  themeKey: topicThemeKeySchema.nullable(),
  questionCount: z.number(),
  progress: topicProgressSchema,
});

const catalogCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  topics: z.array(catalogTopicSchema),
});

/** `{ categories }` — ответ `GET /api/v1/catalog`. */
export const catalogResponseSchema = z.object({
  categories: z.array(catalogCategorySchema),
});

const topicDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  themeKey: topicThemeKeySchema.nullable(),
  category: z.object({ slug: z.string(), title: z.string() }),
  questionCount: z.number(),
  progress: topicProgressSchema,
});

/** `{ topic }` — ответ `GET /api/v1/topics/[slug]`. */
export const topicResponseSchema = z.object({
  topic: topicDetailSchema,
});

export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
export type TopicResponse = z.infer<typeof topicResponseSchema>;
