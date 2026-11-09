import {
  AUTH_MESSAGES,
  handleRouteError,
  rateLimited,
  readJsonBody,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { normalizeEmail } from "@/lib/auth/identity";
import { buildVerifyEmail, sendMail } from "@/lib/auth/mail";
import { checkResendRateLimit, clientIp } from "@/lib/auth/rateLimit";
import { emailOnlySchema, formatValidationError } from "@/lib/auth/schemas";
import { issueToken, TOKEN_VERIFY } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/auth/resend-verification — нейтральный ответ 202 всегда. */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = emailOnlySchema.safeParse(bodyResult.body);
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
  const rateLimit = checkResendRateLimit(emailNormalized, ip);
  if (rateLimit.limited) {
    return rateLimited(requestId, rateLimit.retryAfterSeconds);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { emailNormalized },
      select: { id: true, email: true, emailVerifiedAt: true, deletedAt: true },
    });

    if (user && user.deletedAt === null && user.emailVerifiedAt === null) {
      const { token } = await issueToken({
        userId: user.id,
        type: TOKEN_VERIFY,
        requestIp: ip,
      });
      await sendMail(buildVerifyEmail({ to: user.email, token }));
    }

    return ok({ status: "sent" }, { requestId, status: 202 });
  } catch (error) {
    return handleRouteError(error, requestId, "auth/resend-verification");
  }
}
