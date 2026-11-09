import {
  AUTH_MESSAGES,
  handleRouteError,
  rateLimited,
  readJsonBody,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { hashPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/passwordPolicy";
import { checkResetRateLimit, clientIp } from "@/lib/auth/rateLimit";
import { formatValidationError, resetPasswordSchema } from "@/lib/auth/schemas";
import { lookupToken, TOKEN_RESET } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/reset-password (§8.3, AC-AUTH-19…21).
 *
 * В одной транзакции: одноразовое погашение токена, смена хеша пароля,
 * инкремент sessionEpoch (все старые сессии становятся недействительными)
 * и сброс счётчика неудачных входов.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = resetPasswordSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    const validation = formatValidationError(parsed.error);
    return fail("validation_error", validation.message, {
      requestId,
      status: 400,
      details: { fields: validation.fields },
    });
  }

  const passwordCheck = validatePassword(parsed.data.password);
  if (!passwordCheck.ok) {
    return fail("validation_error", passwordCheck.message, {
      requestId,
      status: 400,
      details: { fields: { password: passwordCheck.message } },
    });
  }

  const ip = clientIp(request);
  const rateLimit = checkResetRateLimit(ip);
  if (rateLimit.limited) {
    return rateLimited(requestId, rateLimit.retryAfterSeconds);
  }

  try {
    const lookup = await lookupToken(parsed.data.token, TOKEN_RESET);

    if (lookup.status === "invalid") {
      return fail("token_invalid", AUTH_MESSAGES.tokenInvalid, { requestId, status: 400 });
    }
    if (lookup.status === "expired") {
      return fail("token_expired", AUTH_MESSAGES.tokenExpired, {
        requestId,
        status: 410,
        details: { canResend: true },
      });
    }

    const passwordHash = hashPassword(parsed.data.password);
    const now = new Date();

    const consumed = await prisma.$transaction(async (tx) => {
      const marked = await tx.emailToken.updateMany({
        where: { id: lookup.tokenId, usedAt: null },
        data: { usedAt: now },
      });
      if (marked.count !== 1) return false;

      // Другие активные ссылки сброса тоже гасим.
      await tx.emailToken.updateMany({
        where: { userId: lookup.userId, type: TOKEN_RESET, usedAt: null },
        data: { usedAt: now },
      });

      await tx.user.update({
        where: { id: lookup.userId },
        data: {
          passwordHash,
          sessionEpoch: { increment: 1 },
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      return true;
    });

    if (!consumed) {
      return fail("token_invalid", AUTH_MESSAGES.tokenInvalid, { requestId, status: 400 });
    }

    return ok({ status: "password_changed" }, { requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "auth/reset-password");
  }
}
