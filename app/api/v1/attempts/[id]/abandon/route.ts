import { rejectCrossOrigin } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { attemptErrorResponse, unauthorizedResponse } from "@/lib/attempts/http";
import { abandonAttempt } from "@/lib/attempts/service";
import { ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/attempts/[id]/abandon — прервать тренировку, сохранив прогресс. */
export async function POST(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse(requestId);

  try {
    const { id } = await context.params;
    const result = await abandonAttempt(id, user.id);
    return ok({ result }, { requestId });
  } catch (error) {
    return attemptErrorResponse(error, requestId);
  }
}
