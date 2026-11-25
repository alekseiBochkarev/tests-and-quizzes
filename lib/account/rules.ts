/**
 * Правила удаления аккаунта (ACC-01). Чистые функции без Prisma и next/*,
 * чтобы их можно было проверить unit-тестами.
 */

/** Слово, которое пользователь вводит для подтверждения удаления. */
export const DELETION_CONFIRMATION = "УДАЛИТЬ";

/** Домен-заглушка: после анонимизации почта не должна быть настоящей. */
export const DELETED_EMAIL_DOMAIN = "deleted.invalid";

/**
 * Анонимизированный адрес. `userId` уникален, поэтому повторное удаление
 * и параллельные запросы не столкнутся на unique-индексе `emailNormalized`.
 */
export function deletedEmailFor(userId: string): string {
  return `deleted-${userId}@${DELETED_EMAIL_DOMAIN}`;
}

/**
 * Подтверждение принимаем в любом регистре и с пробелами по краям:
 * для аудитории 55+ лишняя строгость к регистру — барьер, а не защита.
 * Смысл подтверждения — осознанное действие, а не точное совпадение.
 */
export function isDeletionConfirmation(value: string | null | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === DELETION_CONFIRMATION;
}
