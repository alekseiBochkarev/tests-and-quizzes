import { rateLimited, readJsonBody, rejectCrossOrigin } from "@/lib/auth/api";
import { checkAdminContentRateLimit } from "@/lib/auth/rateLimit";
import { adminValidationError, handleAdminApiError, requireStaffApi } from "@/lib/admin/api";
import { createQuestion } from "@/lib/admin/content";
import { questionInputSchema } from "@/lib/admin/schemas";
import { ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/admin/topics/[id]/questions — добавить вопрос в тему. */
export async function POST(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const auth = await requireStaffApi(requestId);
  if (!auth.ok) return auth.response;

  const rateLimit = checkAdminContentRateLimit(auth.user.id);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = questionInputSchema.safeParse(bodyResult.body);
  if (!parsed.success) return adminValidationError(parsed.error, requestId);

  try {
    const { id } = await context.params;
    const question = await createQuestion(id, parsed.data);
    return ok({ question }, { requestId, status: 201 });
  } catch (error) {
    return handleAdminApiError(error, requestId, "admin.questions.create");
  }
}
