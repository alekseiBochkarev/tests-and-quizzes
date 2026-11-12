import { AUTH_MESSAGES, handleRouteError } from "@/lib/auth/api";
import { AttemptError } from "@/lib/attempts/service";
import { fail } from "@/lib/http/json";

/** Единая обработка ошибок игровых роутов. */
export function attemptErrorResponse(error: unknown, requestId: string): Response {
  if (error instanceof AttemptError) {
    return fail(error.code, error.message, { requestId, status: error.status });
  }
  return handleRouteError(error, requestId, "attempts");
}

export function unauthorizedResponse(requestId: string): Response {
  return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
}
