import { getCurrentUser } from "@/lib/auth/currentUser";
import { getCatalog } from "@/lib/content/catalog";
import { handleRouteError } from "@/lib/auth/api";
import { ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/catalog — разделы, темы и прогресс вошедшего пользователя. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const user = await getCurrentUser();
    const categories = await getCatalog(user?.id ?? null);
    return ok({ categories }, { requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "catalog");
  }
}
