import { isFormSubmission, redirectResponse, rejectCrossOrigin } from "@/lib/auth/api";
import { clearSession } from "@/lib/auth/cookieStore";
import { noContent } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/logout (§8.3).
 *
 * Идемпотентно очищает cookie. Для обычной HTML-формы (кнопка «Выйти»
 * в шапке и на /account) отвечает редиректом на главную; JSON-клиент
 * получает 204 без тела.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  await clearSession();

  if (isFormSubmission(request)) {
    return redirectResponse("/", requestId);
  }

  return noContent({ requestId });
}
