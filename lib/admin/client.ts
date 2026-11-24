/**
 * Клиентский помощник админских API (CNT-04).
 *
 * Один формат разбора ошибок для всех форм: сообщение показываем в Alert,
 * `fields` — рядом с конкретным полем. Сетевые сбои тоже превращаем в
 * понятный текст, а не в «Failed to fetch».
 */

export type AdminApiError = {
  code?: string;
  message: string;
  fields: Record<string, string>;
};

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: AdminApiError };

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: { fields?: Record<string, string> };
  };
};

export async function requestAdminApi<T>(
  url: string,
  init: RequestInit = {},
): Promise<ApiSuccess<T> | ApiFailure> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    return {
      ok: false,
      error: {
        message: "Нет связи с сервером. Проверьте интернет и попробуйте снова.",
        fields: {},
      },
    };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = (payload as ErrorPayload | null)?.error;
    return {
      ok: false,
      error: {
        ...(error?.code ? { code: error.code } : {}),
        message: error?.message ?? "Не удалось выполнить действие. Попробуйте ещё раз.",
        fields: error?.details?.fields ?? {},
      },
    };
  }

  return { ok: true, data: (payload as { data: T } | null)?.data as T };
}
