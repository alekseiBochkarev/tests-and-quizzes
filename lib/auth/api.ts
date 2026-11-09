import { fail } from "@/lib/http/json";
import { assertSameOrigin } from "@/lib/http/origin";
import { REQUEST_ID_HEADER } from "@/lib/http/requestId";

/**
 * Общие помощники auth-роутов: CSRF, чтение тела, единые тексты ошибок
 * и преобразование исключений в ответы §8.8.
 */

export const AUTH_MESSAGES = {
  originMismatch: "Запрос отклонён. Обновите страницу и попробуйте снова.",
  validation: "Проверьте заполнение формы.",
  rateLimited: "Слишком много попыток. Попробуйте немного позже.",
  invalidCredentials: "Не удалось войти. Проверьте почту и пароль.",
  emailNotVerified: "Подтвердите почту, чтобы войти.",
  accountLocked:
    "Вход временно заблокирован после нескольких неудачных попыток. Попробуйте позже.",
  tokenInvalid: "Ссылка недействительна или уже использована.",
  tokenExpired: "Срок действия ссылки истёк. Запросите новую.",
  unauthorized: "Нужно войти в аккаунт.",
  dbUnavailable: "Сервис временно недоступен. Попробуйте позже.",
  internal: "Что-то пошло не так. Попробуйте позже.",
} as const;

const MAX_BODY_BYTES = 32 * 1024;

export function rejectCrossOrigin(request: Request, requestId: string): Response | null {
  if (assertSameOrigin(request)) return null;

  return fail("origin_mismatch", AUTH_MESSAGES.originMismatch, {
    requestId,
    status: 403,
  });
}

export type JsonBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: Response };

export async function readJsonBody(request: Request, requestId: string): Promise<JsonBodyResult> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: fail("payload_too_large", "Слишком большой запрос.", {
        requestId,
        status: 413,
      }),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: fail("validation_error", "Не удалось прочитать данные запроса.", {
        requestId,
        status: 400,
      }),
    };
  }

  if (text.length > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: fail("payload_too_large", "Слишком большой запрос.", {
        requestId,
        status: 413,
      }),
    };
  }

  if (!text.trim()) {
    return { ok: true, body: {} };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        response: fail("validation_error", AUTH_MESSAGES.validation, {
          requestId,
          status: 400,
        }),
      };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: fail("validation_error", "Не удалось прочитать данные формы.", {
        requestId,
        status: 400,
      }),
    };
  }
}

export function isFormSubmission(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

export type FormBodyResult =
  | { ok: true; body: Record<string, string> }
  | { ok: false; response: Response };

function payloadTooLarge(requestId: string): Response {
  return fail("payload_too_large", "Слишком большой запрос.", {
    requestId,
    status: 413,
  });
}

/**
 * Чтение `application/x-www-form-urlencoded` с тем же лимитом 32 КБ, что и
 * JSON. `content-length` проверяется до чтения тела, длина текста — после
 * (запрос может прийти без заголовка или chunked).
 */
export async function readForm(request: Request, requestId: string): Promise<FormBodyResult> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { ok: false, response: payloadTooLarge(requestId) };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: fail("validation_error", "Не удалось прочитать данные формы.", {
        requestId,
        status: 400,
      }),
    };
  }

  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return { ok: false, response: payloadTooLarge(requestId) };
  }

  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    result[key] = value;
  }

  return { ok: true, body: result };
}

export function rateLimited(requestId: string, retryAfterSeconds: number): Response {
  return fail("rate_limited", AUTH_MESSAGES.rateLimited, {
    requestId,
    status: 429,
    headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) },
  });
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export function isDatabaseUnavailable(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  if (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P1017" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET"
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : "";
  return /can't reach database|connection terminated|connection refused|ECONNREFUSED/i.test(
    message,
  );
}

/** Единый обработчик непредвиденных ошибок роута. Без stack trace наружу. */
export function handleRouteError(error: unknown, requestId: string, route: string): Response {
  if (isDatabaseUnavailable(error)) {
    return fail("db_unavailable", AUTH_MESSAGES.dbUnavailable, {
      requestId,
      status: 503,
    });
  }

  console.error({
    event: "auth.route_failed",
    route,
    requestId,
    reason: error instanceof Error ? error.name : "unknown",
  });

  return fail("internal_error", AUTH_MESSAGES.internal, {
    requestId,
    status: 500,
  });
}

/** Редирект для обычных HTML-форм (verify-email, выход из шапки). */
export function redirectResponse(path: string, requestId: string, status = 303): Response {
  return new Response(null, {
    status,
    headers: {
      Location: path,
      "Cache-Control": "no-store, private",
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}
