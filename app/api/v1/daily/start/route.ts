import { rateLimited, rejectCrossOrigin } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { checkAttemptStartRateLimit } from "@/lib/auth/rateLimit";
import { attemptErrorResponse, unauthorizedResponse } from "@/lib/attempts/http";
import { startDailyAttempt } from "@/lib/daily/service";
import { ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/daily/start — начать «Тест дня» или вернуть сегодняшнюю попытку. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse(requestId);

  const rateLimit = checkAttemptStartRateLimit(user.id);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  try {
    const result = await startDailyAttempt(user.id);
    return ok(result, { requestId, status: result.created ? 201 : 200 });
  } catch (error) {
    return attemptErrorResponse(error, requestId);
  }
}
