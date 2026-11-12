import { handleRouteError } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";
import { getAccountData } from "@/lib/stats/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/me/stats — личная статистика, темы и история. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const user = await getCurrentUser();
  if (!user) return fail("unauthorized", "Нужно войти в аккаунт.", { requestId, status: 401 });

  try {
    const data = await getAccountData(user.id);
    return ok(data, { requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "me/stats");
  }
}
