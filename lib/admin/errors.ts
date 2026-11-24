/**
 * Ошибки контентной админки (CNT-04).
 *
 * Сервис не знает про HTTP, но возвращает машинный код и статус. Роут
 * превращает их в единый конверт `{ error: { code, message, details? } }`.
 */

export type AdminContentErrorCode =
  | "not_found"
  | "unknown_category"
  | "unknown_topic"
  | "unknown_question"
  | "slug_taken"
  | "duplicate_question"
  | "import_has_errors"
  | "import_too_large"
  | "import_empty";

export class AdminContentError extends Error {
  readonly code: AdminContentErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: AdminContentErrorCode,
    message: string,
    options: { status?: number; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "AdminContentError";
    this.code = code;
    this.status = options.status ?? 400;
    this.details = options.details;
  }
}

export function isAdminContentError(error: unknown): error is AdminContentError {
  return error instanceof AdminContentError;
}
