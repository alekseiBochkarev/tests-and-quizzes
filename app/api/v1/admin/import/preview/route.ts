import { rateLimited, readJsonBody, rejectCrossOrigin } from "@/lib/auth/api";
import { checkAdminImportRateLimit } from "@/lib/auth/rateLimit";
import {
  ADMIN_IMPORT_MAX_BYTES,
  adminValidationError,
  handleAdminApiError,
  requireStaffApi,
} from "@/lib/admin/api";
import { previewAdminImport } from "@/lib/admin/content";
import { importInputSchema } from "@/lib/admin/schemas";
import { ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/admin/import/preview — разобрать файл и показать план. */
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
    const preview = await previewAdminImport(parsed.data);
    return ok({ preview }, { requestId });
  } catch (error) {
    return handleAdminApiError(error, requestId, "admin.import.preview");
  }
}
