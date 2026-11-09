import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * Сквозной идентификатор запроса (§8.1, §8.9).
 *
 * Значение из заголовка принимается только если оно безопасно для логов
 * и заголовков ответа; иначе генерируется новое. Сгенерированный id никогда
 * не содержит ПДн и не связан с содержимым запроса.
 */
export function getRequestId(request: Request): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER)?.trim();
  if (incoming && SAFE_REQUEST_ID.test(incoming)) {
    return incoming;
  }
  return randomUUID();
}
