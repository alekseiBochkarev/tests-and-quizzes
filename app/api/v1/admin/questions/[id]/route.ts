import { rateLimited, readJsonBody, rejectCrossOrigin } from "@/lib/auth/api";
import { checkAdminContentRateLimit } from "@/lib/auth/rateLimit";
import { adminValidationError, handleAdminApiError, requireStaffApi } from "@/lib/admin/api";
import { archiveQuestion, updateQuestion } from "@/lib/admin/content";
import { questionInputSchema } from "@/lib/admin/schemas";
import { ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/v1/admin/questions/[id] — изменить вопрос.
 *
 * Если опубликованный вопрос меняет текст, варианты или правильный ответ,
 * сервис архивирует старую версию и создаёт новую. Ответ содержит `versioned`.
 */
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

  const parsed = questionInputSchema.safeParse(bodyResult.body);
  if (!parsed.success) return adminValidationError(parsed.error, requestId);

  try {
    const { id } = await context.params;
    const question = await updateQuestion(id, parsed.data);
    return ok({ question }, { requestId });
  } catch (error) {
    return handleAdminApiError(error, requestId, "admin.questions.update");
  }
}

/** DELETE /api/v1/admin/questions/[id] — убрать вопрос в архив. */
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
    const question = await archiveQuestion(id);
    return ok({ question }, { requestId });
  } catch (error) {
    return handleAdminApiError(error, requestId, "admin.questions.archive");
  }
}
