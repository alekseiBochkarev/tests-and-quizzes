import { formatValidationError } from "@/lib/auth/schemas";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  getUserInterests,
  saveUserInterests,
  skipInterestOnboarding,
} from "@/lib/interests/service";
import { handleRouteError, rejectCrossOrigin, readJsonBody } from "@/lib/auth/api";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const interestsSchema = z.object({
  topicIds: z.array(z.string().min(1).max(64)).max(100),
  skipped: z.boolean().optional(),
});

/** GET /api/v1/me/interests — выбранные темы и пройден ли онбординг. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized", "Нужно войти в аккаунт.", { requestId, status: 401 });

  try {
    return ok(await getUserInterests(user.id), { requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "me/interests");
  }
}

/** PUT /api/v1/me/interests — сохранить или пропустить выбор интересов. */
export async function PUT(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const user = await getCurrentUser();
  if (!user) return fail("unauthorized", "Нужно войти в аккаунт.", { requestId, status: 401 });

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = interestsSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    const validation = formatValidationError(parsed.error);
    return fail("validation_error", validation.message, {
      requestId,
      status: 400,
      details: { fields: validation.fields },
    });
  }

  try {
    if (parsed.data.skipped) {
      await skipInterestOnboarding(user.id);
      const interests = await getUserInterests(user.id);
      return ok(interests, { requestId });
    }

    const interests = await saveUserInterests(user.id, parsed.data.topicIds);
    return ok(interests, { requestId });
  } catch (error) {
    if (error instanceof Error && error.message === "unknown_topic") {
      return fail("unknown_topic", "Одна из выбранных тем недоступна.", {
        requestId,
        status: 400,
      });
    }
    return handleRouteError(error, requestId, "me/interests");
  }
}
