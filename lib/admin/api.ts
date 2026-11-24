import { getCurrentUser, type CurrentUser } from "@/lib/auth/currentUser";
import { isStaffRole } from "@/lib/auth/roles";
import { handleRouteError } from "@/lib/auth/api";
import { formatValidationError } from "@/lib/auth/schemas";
import { fail } from "@/lib/http/json";
import { isAdminContentError } from "@/lib/admin/errors";
import type { z } from "zod";

/**
 * Серверная авторизация админских API (CNT-04).
 *
 * В отличие от страниц здесь нет redirect/notFound: API отвечает JSON.
 * Гость получает 401, обычный пользователь — 404, чтобы не раскрывать
 * существование служебных маршрутов.
 */

type StaffApiResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: Response };

/** Тело импорта больше обычных форм: до 500 вопросов forms_writer. */
export const ADMIN_IMPORT_MAX_BYTES = 1024 * 1024;

export async function requireStaffApi(requestId: string): Promise<StaffApiResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: fail("unauthorized", "Нужно войти в аккаунт.", { requestId, status: 401 }),
    };
  }

  if (!isStaffRole(user.role)) {
    return {
      ok: false,
      response: fail("not_found", "Раздел не найден.", { requestId, status: 404 }),
    };
  }

  return { ok: true, user };
}

/** Единый ответ на ошибку входных данных: `details.fields` для подсветки полей. */
export function adminValidationError(error: z.ZodError, requestId: string): Response {
  const { message, fields } = formatValidationError(error);
  return fail("validation_error", message, {
    requestId,
    status: 400,
    details: { fields },
  });
}

export function handleAdminApiError(error: unknown, requestId: string, route: string): Response {
  if (isAdminContentError(error)) {
    return fail(error.code, error.message, {
      requestId,
      status: error.status,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  return handleRouteError(error, requestId, route);
}
