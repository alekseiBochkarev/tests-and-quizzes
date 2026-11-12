import { rateLimited, readJsonBody, rejectCrossOrigin } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { checkAttemptAnswerRateLimit } from "@/lib/auth/rateLimit";
import { attemptErrorResponse, unauthorizedResponse } from "@/lib/attempts/http";
import { answerQuestion } from "@/lib/attempts/service";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const answerSchema = z.object({
  questionId: z.string().min(1).max(64),
  optionId: z.string().min(1).max(64),
});

/** POST /api/v1/attempts/[id]/answers — проверить ответ на сервере. */
export async function POST(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse(requestId);

  const rateLimit = checkAttemptAnswerRateLimit(user.id);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = answerSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return fail("validation_error", "Выберите вариант ответа.", { requestId, status: 400 });
  }

  try {
    const { id } = await context.params;
    const feedback = await answerQuestion(id, user.id, parsed.data);
    return ok(feedback, { requestId });
  } catch (error) {
    return attemptErrorResponse(error, requestId);
  }
}
