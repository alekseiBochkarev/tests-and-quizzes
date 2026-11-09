import { REQUEST_ID_HEADER } from "@/lib/http/requestId";

export type JsonResponseOptions = {
  requestId: string;
  status?: number;
  headers?: HeadersInit;
  /**
   * Auth-ответы и защищённые страницы кэшировать нельзя (§8.1, AC-GUARD-04).
   * По умолчанию ставим `no-store, private`; публичные роуты смогут переопределить.
   */
  cacheControl?: string | null;
};

export type ErrorDetails = Record<string, unknown>;

const DEFAULT_CACHE_CONTROL = "no-store, private";

function buildHeaders(options: JsonResponseOptions): Headers {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set(REQUEST_ID_HEADER, options.requestId);

  const cacheControl = options.cacheControl === undefined ? DEFAULT_CACHE_CONTROL : options.cacheControl;
  if (cacheControl) {
    headers.set("Cache-Control", cacheControl);
  }

  return headers;
}

/** Успешный ответ API: `{ data: … }` (§8.1). */
export function ok<T>(data: T, options: JsonResponseOptions): Response {
  return new Response(JSON.stringify({ data }), {
    status: options.status ?? 200,
    headers: buildHeaders(options),
  });
}

/** Ошибка API: `{ error: { code, message, details? }, requestId }` (§8.1, §8.8). */
export function fail(
  code: string,
  message: string,
  options: JsonResponseOptions & { details?: ErrorDetails },
): Response {
  const error: { code: string; message: string; details?: ErrorDetails } = { code, message };
  if (options.details !== undefined) {
    error.details = options.details;
  }

  return new Response(JSON.stringify({ error, requestId: options.requestId }), {
    status: options.status ?? 400,
    headers: buildHeaders(options),
  });
}

/** Пустой ответ без тела (204). */
export function noContent(options: Omit<JsonResponseOptions, "status">): Response {
  return new Response(null, {
    status: 204,
    headers: buildHeaders(options),
  });
}
