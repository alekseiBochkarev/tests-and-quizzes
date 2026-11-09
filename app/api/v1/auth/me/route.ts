import { AUTH_MESSAGES, handleRouteError } from "@/lib/auth/api";
import { readSession } from "@/lib/auth/cookieStore";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/auth/me (§8.3, AC-AUTH-16). Публичные поля, без хешей и токенов. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);

  const session = await readSession();
  if (!session) {
    return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerifiedAt: true,
        timezone: true,
        sessionEpoch: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt !== null || user.sessionEpoch !== session.epoch) {
      return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
    }

    return ok(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerifiedAt !== null,
        timezone: user.timezone,
      },
      { requestId },
    );
  } catch (error) {
    return handleRouteError(error, requestId, "auth/me");
  }
}
