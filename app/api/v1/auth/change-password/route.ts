import {
  AUTH_MESSAGES,
  handleRouteError,
  rateLimited,
  readJsonBody,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { readSession, setSession } from "@/lib/auth/cookieStore";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/passwordPolicy";
import { checkChangePasswordRateLimit } from "@/lib/auth/rateLimit";
import { changePasswordSchema, formatValidationError } from "@/lib/auth/schemas";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/change-password (§8.3, P1).
 *
 * Требует текущий пароль. Инкремент sessionEpoch инвалидирует остальные
 * сессии, а текущая cookie перевыпускается с новым epoch.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const session = await readSession();
  if (!session) {
    return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
  }

  const rateLimit = checkChangePasswordRateLimit(session.userId);
  if (rateLimit.limited) {
    return rateLimited(requestId, rateLimit.retryAfterSeconds);
  }

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = changePasswordSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    const validation = formatValidationError(parsed.error);
    return fail("validation_error", validation.message, {
      requestId,
      status: 400,
      details: { fields: validation.fields },
    });
  }

  const passwordCheck = validatePassword(parsed.data.newPassword);
  if (!passwordCheck.ok) {
    return fail("validation_error", passwordCheck.message, {
      requestId,
      status: 400,
      details: { fields: { newPassword: passwordCheck.message } },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        passwordHash: true,
        sessionEpoch: true,
        deletedAt: true,
      },
    });

    if (
      !user ||
      user.deletedAt !== null ||
      user.sessionEpoch !== session.epoch ||
      !user.passwordHash
    ) {
      return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
    }

    if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
      return fail("invalid_credentials", AUTH_MESSAGES.invalidCredentials, {
        requestId,
        status: 401,
      });
    }

    const passwordHash = hashPassword(parsed.data.newPassword);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        sessionEpoch: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
      select: { id: true, sessionEpoch: true },
    });

    await setSession(updated.id, updated.sessionEpoch);

    return ok({ status: "password_changed" }, { requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "auth/change-password");
  }
}
