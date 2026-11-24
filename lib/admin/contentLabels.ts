import type { ContentStatus } from "@/lib/generated/prisma/enums";

/**
 * Подписи статусов контента. Отдельный модуль без Node-зависимостей:
 * его можно импортировать и в серверные страницы, и в клиентские формы.
 */

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  ARCHIVED: "В архиве",
};

export function contentStatusLabel(status: string): string {
  if (status === "DRAFT") return CONTENT_STATUS_LABELS.DRAFT;
  if (status === "ARCHIVED") return CONTENT_STATUS_LABELS.ARCHIVED;
  return CONTENT_STATUS_LABELS.PUBLISHED;
}
