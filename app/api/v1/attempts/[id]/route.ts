import { getCurrentUser } from "@/lib/auth/currentUser";
import { getAttemptState } from "@/lib/attempts/service";
import { attemptErrorResponse, unauthorizedResponse } from "@/lib/attempts/http";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/attempts/[id] — состояние попытки и вопросы. */
export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse(requestId);

  try {
    const { id } = await context.params;
    const attempt = await getAttemptState(id, user.id);
    if (!attempt) {
      return fail("attempt_not_found", "Тренировка не найдена.", { requestId, status: 404 });
    }
    return ok({ attempt }, { requestId });
  } catch (error) {
    return attemptErrorResponse(error, requestId);
  }
}
