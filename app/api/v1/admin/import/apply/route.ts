import { rateLimited, readJsonBody, rejectCrossOrigin } from "@/lib/auth/api";
import { checkAdminImportRateLimit } from "@/lib/auth/rateLimit";
import {
  ADMIN_IMPORT_MAX_BYTES,
  adminValidationError,
  handleAdminApiError,
  requireStaffApi,
} from "@/lib/admin/api";
import { applyAdminImport } from "@/lib/admin/content";
import { importInputSchema } from "@/lib/admin/schemas";
import { ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/import/apply — применить проверенный файл.
 *
 * План пересчитывается заново: между предпросмотром и подтверждением контент
 * мог измениться, поэтому применяется актуальное состояние базы.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const auth = await requireStaffApi(requestId);
  if (!auth.ok) return auth.response;

  const rateLimit = checkAdminImportRateLimit(auth.user.id);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  const bodyResult = await readJsonBody(request, requestId, {
    maxBytes: ADMIN_IMPORT_MAX_BYTES,
  });
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = importInputSchema.safeParse(bodyResult.body);
  if (!parsed.success) return adminValidationError(parsed.error, requestId);

  try {
    const result = await applyAdminImport(parsed.data);
    return ok(result, { requestId });
  } catch (error) {
    return handleAdminApiError(error, requestId, "admin.import.apply");
  }
}
