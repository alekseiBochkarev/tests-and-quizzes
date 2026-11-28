import { z } from "zod";

import { CONTENT_STATUSES } from "@/lib/admin/contentLabels";
import { hasDuplicateOptions } from "@/lib/admin/contentRules";
import { SLUG_PATTERN, normalizeSlug } from "@/lib/admin/slug";
import { isAllowedImageLicense } from "@/lib/content/import";
import { TOPIC_THEME_KEYS } from "@/lib/ui/topicThemes";

/**
 * Входные схемы админки контента (CNT-04).
 *
 * Ошибки формулируются как инструкция редактору: что именно исправить.
 * Схемы общие для API и серверного слоя, поэтому правила не расходятся.
 */

const statusSchema = z.enum(CONTENT_STATUSES);

const slugSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeSlug(value) : value),
  z
    .string({ message: "Укажите адрес темы." })
    .min(2, "Адрес темы должен быть не короче 2 символов.")
    .max(80, "Адрес темы слишком длинный.")
    .regex(
      SLUG_PATTERN,
      "Адрес темы: строчные латинские буквы, цифры и дефис. Например: soviet-cinema.",
    ),
);

function optionalUrl(message: string) {
  return z
    .string()
    .trim()
    .max(500, "Ссылка слишком длинная.")
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message },
    )
    .transform((value) => value || null);
}

export const topicInputSchema = z.object({
  categoryId: z.string().trim().min(1, "Выберите раздел.").max(64),
  title: z
    .string()
    .trim()
    .min(2, "Название темы должно быть не короче 2 символов.")
    .max(120, "Название темы слишком длинное."),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(500, "Описание слишком длинное.")
    .optional()
    .transform((value) => value || null),
  coverUrl: optionalUrl("Ссылка на обложку должна начинаться с http:// или https://."),
  // Оформление темы: только ключи реестра. Неизвестное значение отклоняем —
  // молчаливый null скрыл бы ошибку редактора.
  themeKey: z.enum(TOPIC_THEME_KEYS).nullable().optional().default(null),
  order: z.coerce
    .number({ message: "Порядок должен быть числом." })
    .int("Порядок должен быть целым числом.")
    .min(0, "Порядок не может быть отрицательным.")
    .max(9999, "Порядок слишком большой.")
    .optional(),
  status: statusSchema.default("DRAFT"),
});

export type TopicInput = z.infer<typeof topicInputSchema>;

const optionSchema = z
  .string()
  .trim()
  .min(1, "Заполните все четыре варианта ответа.")
  .max(500, "Вариант ответа слишком длинный.");

export const questionInputSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(5, "Текст вопроса должен быть не короче 5 символов.")
      .max(2000, "Текст вопроса слишком длинный."),
    explanation: z.string().trim().max(3000, "Объяснение слишком длинное.").default(""),
    options: z.array(optionSchema).length(4, "Нужно ровно четыре варианта ответа."),
    correctIndex: z.coerce
      .number({ message: "Отметьте правильный вариант." })
      .int()
      .min(0, "Отметьте правильный вариант.")
      .max(3, "Отметьте правильный вариант."),
    difficulty: z.coerce
      .number({ message: "Сложность должна быть числом." })
      .int()
      .min(1, "Сложность: от 1 до 3.")
      .max(3, "Сложность: от 1 до 3.")
      .default(2),
    imageUrl: optionalUrl("Ссылка на изображение должна начинаться с http:// или https://."),
    imageLicense: z
      .string()
      .trim()
      .max(300, "Подпись к изображению слишком длинная.")
      .optional()
      .transform((value) => value || null),
    imageSource: optionalUrl(
      "Ссылка на источник изображения должна начинаться с http:// или https://.",
    ),
    imageAlt: z
      .string()
      .trim()
      .max(300, "Описание изображения слишком длинное.")
      .optional()
      .transform((value) => value || null),
    status: statusSchema.default("DRAFT"),
  })
  .superRefine((value, ctx) => {
    if (hasDuplicateOptions(value.options)) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Варианты ответа не должны повторяться.",
      });
    }

    if (value.imageUrl) {
      if (!value.imageLicense) {
        ctx.addIssue({
          code: "custom",
          path: ["imageLicense"],
          message: "Укажите лицензию изображения: CC0, CC BY, CC BY-SA или общественное достояние.",
        });
      } else if (!isAllowedImageLicense(value.imageLicense)) {
        ctx.addIssue({
          code: "custom",
          path: ["imageLicense"],
          message: "Допустимы только CC0, CC BY, CC BY-SA и общественное достояние.",
        });
      }

      if (!value.imageAlt) {
        ctx.addIssue({
          code: "custom",
          path: ["imageAlt"],
          message: "Опишите изображение словами: это прочитают незрячие пользователи.",
        });
      }
    }

    if (value.status === "PUBLISHED" && !value.explanation) {
      ctx.addIssue({
        code: "custom",
        path: ["explanation"],
        message: "Перед публикацией добавьте объяснение: его увидит пользователь после ответа.",
      });
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

export const importInputSchema = z.object({
  topicId: z.string().trim().min(1, "Выберите тему.").max(64),
  data: z
    .unknown()
    .refine((value) => value !== undefined, { message: "Загрузите JSON-файл." }),
});

export type ImportInput = z.infer<typeof importInputSchema>;
