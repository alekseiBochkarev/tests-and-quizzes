import { rateLimited, readJsonBody, rejectCrossOrigin } from "@/lib/auth/api";
import { checkAdminContentRateLimit } from "@/lib/auth/rateLimit";
import { adminValidationError, handleAdminApiError, requireStaffApi } from "@/lib/admin/api";
import { archiveTopic, updateTopic } from "@/lib/admin/content";
import { topicInputSchema } from "@/lib/admin/schemas";
import { ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/v1/admin/topics/[id] — изменить тему. */
export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const auth = await requireStaffApi(requestId);
  if (!auth.ok) return auth.response;

  const rateLimit = checkAdminContentRateLimit(auth.user.id);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = topicInputSchema.safeParse(bodyResult.body);
  if (!parsed.success) return adminValidationError(parsed.error, requestId);

  try {
    const { id } = await context.params;
    const topic = await updateTopic(id, parsed.data);
    return ok({ topic }, { requestId });
  } catch (error) {
    return handleAdminApiError(error, requestId, "admin.topics.update");
  }
}

/**
 * DELETE /api/v1/admin/topics/[id] — убрать тему в архив.
 *
 * Физического удаления нет: тема и её вопросы нужны для истории попыток
 * и прогресса пользователей.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const auth = await requireStaffApi(requestId);
  if (!auth.ok) return auth.response;

  const rateLimit = checkAdminContentRateLimit(auth.user.id);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  try {
    const { id } = await context.params;
    const topic = await archiveTopic(id);
    return ok({ topic }, { requestId });
  } catch (error) {
    return handleAdminApiError(error, requestId, "admin.topics.archive");
  }
}
