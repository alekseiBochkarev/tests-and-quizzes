import {
  rateLimited,
  readJsonBody,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { checkAttemptStartRateLimit } from "@/lib/auth/rateLimit";
import { attemptErrorResponse, unauthorizedResponse } from "@/lib/attempts/http";
import { ATTEMPT_COUNTS, createAttempt } from "@/lib/attempts/service";
import { ok, fail } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createAttemptSchema = z.object({
  topicId: z.string().min(1).max(64).optional(),
  categoryId: z.string().min(1).max(64).optional(),
  count: z.union([
    z.literal(ATTEMPT_COUNTS[0]),
    z.literal(ATTEMPT_COUNTS[1]),
    z.literal(ATTEMPT_COUNTS[2]),
    z.literal(ATTEMPT_COUNTS[3]),
  ]),
  mode: z.enum(["TRAINING", "REVIEW"]).default("TRAINING"),
});

/** POST /api/v1/attempts — начать тренировку по теме, разделу или повторение. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const user = await getCurrentUser();
  if (!user) return unauthorizedResponse(requestId);

  const rateLimit = checkAttemptStartRateLimit(user.id);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = createAttemptSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return fail("validation_error", "Выберите тему, раздел и количество вопросов.", {
      requestId,
      status: 400,
    });
  }

  try {
    const result = await createAttempt(user.id, parsed.data);
    return ok(result, { requestId, status: 201 });
  } catch (error) {
    return attemptErrorResponse(error, requestId);
  }
}
