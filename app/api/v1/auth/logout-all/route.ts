import {
  AUTH_MESSAGES,
  handleRouteError,
  isFormSubmission,
  redirectResponse,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { clearSession, readSession } from "@/lib/auth/cookieStore";
import { prisma } from "@/lib/db";
import { fail, noContent } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/logout-all (§8.3, AC-AUTH-15).
 *
 * Инкремент sessionEpoch делает недействительными все ранее выданные cookie,
 * включая текущую. Требует действующей сессии.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const session = await readSession();
  if (!session) {
    await clearSession();
    return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { sessionEpoch: true, deletedAt: true },
    });

    if (!user || user.deletedAt !== null || user.sessionEpoch !== session.epoch) {
      await clearSession();
      return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { sessionEpoch: { increment: 1 } },
    });

    await clearSession();

    if (isFormSubmission(request)) {
      return redirectResponse("/", requestId);
    }

    return noContent({ requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "auth/logout-all");
  }
}
