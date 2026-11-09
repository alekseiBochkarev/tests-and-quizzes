import {
  AUTH_MESSAGES,
  handleRouteError,
  isFormSubmission,
  readForm,
  readJsonBody,
  redirectResponse,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { authConfig } from "@/lib/auth/authConfig";
import { setSession } from "@/lib/auth/cookieStore";
import { formatValidationError, verifyEmailSchema } from "@/lib/auth/schemas";
import { lookupToken, TOKEN_VERIFY } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/verify-email (§8.3, AC-AUTH-05…07).
 *
 * GET-страница /verify-email только показывает кнопку и не расходует токен.
 * Подтверждение — этот POST; для обычной формы он отвечает 303-редиректом,
 * для JSON-клиента — 200/4xx.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const isForm = isFormSubmission(request);

  let token: string;
  if (isForm) {
    const form = await readForm(request);
    token = form.token ?? "";
    const parsed = verifyEmailSchema.safeParse({ token });
    if (!parsed.success) {
      const validation = formatValidationError(parsed.error);
      return fail("validation_error", validation.message, {
        requestId,
        status: 400,
        details: { fields: validation.fields },
      });
    }
    token = parsed.data.token;
  } else {
    const bodyResult = await readJsonBody(request, requestId);
    if (!bodyResult.ok) return bodyResult.response;

    const parsed = verifyEmailSchema.safeParse(bodyResult.body);
    if (!parsed.success) {
      const validation = formatValidationError(parsed.error);
      return fail("validation_error", validation.message, {
        requestId,
        status: 400,
        details: { fields: validation.fields },
      });
    }
    token = parsed.data.token;
  }

  try {
    const lookup = await lookupToken(token, TOKEN_VERIFY);

    if (lookup.status === "invalid") {
      if (isForm) return redirectResponse("/verify-email?error=token_invalid", requestId);
      return fail("token_invalid", AUTH_MESSAGES.tokenInvalid, { requestId, status: 400 });
    }

    if (lookup.status === "expired") {
      if (isForm) return redirectResponse("/verify-email?error=token_expired", requestId);
      return fail("token_expired", AUTH_MESSAGES.tokenExpired, {
        requestId,
        status: 410,
        details: { canResend: true },
      });
    }

    const now = new Date();
    const consumed = await prisma.$transaction(async (tx) => {
      const marked = await tx.emailToken.updateMany({
        where: { id: lookup.tokenId, usedAt: null },
        data: { usedAt: now },
      });

      if (marked.count !== 1) return false;

      await tx.user.updateMany({
        where: { id: lookup.userId, emailVerifiedAt: null, deletedAt: null },
        data: { emailVerifiedAt: now },
      });

      return true;
    });

    if (!consumed) {
      if (isForm) return redirectResponse("/verify-email?error=token_invalid", requestId);
      return fail("token_invalid", AUTH_MESSAGES.tokenInvalid, { requestId, status: 400 });
    }

    if (authConfig.loginAfterVerify) {
      const user = await prisma.user.findUnique({
        where: { id: lookup.userId },
        select: { id: true, sessionEpoch: true, emailVerifiedAt: true, deletedAt: true },
      });

      if (user && user.deletedAt === null) {
        await setSession(user.id, user.sessionEpoch);
        if (isForm) return redirectResponse("/account", requestId);
        return ok({ status: "verified" }, { requestId });
      }
    }

    if (isForm) return redirectResponse("/login?verified=1", requestId);
    return ok({ status: "verified" }, { requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "auth/verify-email");
  }
}
