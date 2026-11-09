import {
  AUTH_MESSAGES,
  handleRouteError,
  rateLimited,
  readJsonBody,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { authConfig } from "@/lib/auth/authConfig";
import { setSession } from "@/lib/auth/cookieStore";
import { normalizeEmail } from "@/lib/auth/identity";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import { checkLoginRateLimit, clientIp } from "@/lib/auth/rateLimit";
import { formatValidationError, loginSchema } from "@/lib/auth/schemas";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/login (§8.3, AC-AUTH-10…13).
 *
 * Порядок: rate-limit → scrypt → блокировка → неподтверждённый email.
 * scrypt выполняется всегда, даже для несуществующего email, чтобы время
 * ответа не выдавало наличие аккаунта. Неверный пароль всегда даёт
 * `401 invalid_credentials`, даже если аккаунт заблокирован.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = loginSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    const validation = formatValidationError(parsed.error);
    return fail("validation_error", validation.message, {
      requestId,
      status: 400,
      details: { fields: validation.fields },
    });
  }

  const emailNormalized = normalizeEmail(parsed.data.email);
  if (!emailNormalized) {
    return fail("validation_error", AUTH_MESSAGES.validation, {
      requestId,
      status: 400,
      details: { fields: { email: "Проверьте адрес почты." } },
    });
  }

  const ip = clientIp(request);
  const rateLimit = checkLoginRateLimit(emailNormalized, ip);
  if (rateLimit.limited) {
    return rateLimited(requestId, rateLimit.retryAfterSeconds);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { emailNormalized },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        emailVerifiedAt: true,
        sessionEpoch: true,
        failedLoginCount: true,
        lockedUntil: true,
        deletedAt: true,
      },
    });

    // Всегда scrypt: для несуществующего email — против DUMMY_HASH.
    const storedHash = user?.passwordHash ?? DUMMY_HASH;
    const passwordOk = verifyPassword(parsed.data.password, storedHash);

    if (!user || !user.passwordHash || !passwordOk) {
      if (user && user.passwordHash) {
        const failedLoginCount = user.failedLoginCount + 1;
        const shouldLock = failedLoginCount >= authConfig.maxFailedAttempts;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount,
            ...(shouldLock
              ? { lockedUntil: new Date(Date.now() + authConfig.lockoutMinutes * 60 * 1000) }
              : {}),
          },
        });
      }

      return fail("invalid_credentials", AUTH_MESSAGES.invalidCredentials, {
        requestId,
        status: 401,
      });
    }

    // Состояние аккаунта раскрываем только после верного пароля.
    if (user.deletedAt) {
      return fail("invalid_credentials", AUTH_MESSAGES.invalidCredentials, {
        requestId,
        status: 401,
      });
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000),
      );
      return fail("account_locked", AUTH_MESSAGES.accountLocked, {
        requestId,
        status: 423,
        headers: { "Retry-After": String(retryAfterSec) },
        details: { retryAfterSec },
      });
    }

    if (!user.emailVerifiedAt) {
      return fail("email_not_verified", AUTH_MESSAGES.emailNotVerified, {
        requestId,
        status: 403,
        details: { canResend: true },
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
      select: { id: true, email: true, name: true, role: true, sessionEpoch: true },
    });

    await prisma.authIdentity.updateMany({
      where: { userId: user.id, provider: "EMAIL" },
      data: { lastUsedAt: new Date() },
    });

    await setSession(updated.id, updated.sessionEpoch);

    return ok(
      {
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
        },
      },
      { requestId },
    );
  } catch (error) {
    return handleRouteError(error, requestId, "auth/login");
  }
}
