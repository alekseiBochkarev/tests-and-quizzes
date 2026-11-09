import {
  AUTH_MESSAGES,
  handleRouteError,
  isUniqueViolation,
  rateLimited,
  readJsonBody,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { buildConsentRecords } from "@/lib/auth/consent";
import { normalizeEmail } from "@/lib/auth/identity";
import { buildVerifyEmail, sendMail } from "@/lib/auth/mail";
import { hashPassword } from "@/lib/auth/password";
import { validatePassword } from "@/lib/auth/passwordPolicy";
import { checkRegisterRateLimit, clientIp } from "@/lib/auth/rateLimit";
import { formatValidationError, registerSchema } from "@/lib/auth/schemas";
import { issueToken, TOKEN_VERIFY } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveTimezone(value: string | undefined): string {
  const fallback = "Europe/Moscow";
  if (!value) return fallback;

  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return fallback;
  }
}

/**
 * POST /api/v1/auth/register (§8.3).
 *
 * Ответ всегда `202 verification_sent` — независимо от того, существует ли
 * email: это защита от перечисления пользователей (AC-AUTH-02).
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = registerSchema.safeParse(bodyResult.body);
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

  const emailNormalized = normalizeEmail(parsed.data.email);
  if (!emailNormalized) {
    return fail("validation_error", AUTH_MESSAGES.validation, {
      requestId,
      status: 400,
      details: { fields: { email: "Проверьте адрес почты." } },
    });
  }

  const ip = clientIp(request);
  const rateLimit = checkRegisterRateLimit(emailNormalized, ip);
  if (rateLimit.limited) {
    return rateLimited(requestId, rateLimit.retryAfterSeconds);
  }

  const email = parsed.data.email.trim();

  try {
    const existing = await prisma.user.findUnique({
      where: { emailNormalized },
      select: { id: true },
    });

    if (existing) {
      return ok({ status: "verification_sent" }, { requestId, status: 202 });
    }

    const passwordHash = hashPassword(parsed.data.password);
    const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;
    const consents = buildConsentRecords({
      marketingOptIn: parsed.data.marketingOptIn,
      ip,
      userAgent,
    });

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          emailNormalized,
          passwordHash,
          timezone: resolveTimezone(parsed.data.timezone),
          consents: { create: consents },
        },
        select: { id: true },
      });

      await tx.authIdentity.create({
        data: {
          userId: user.id,
          provider: "EMAIL",
          providerAccountId: emailNormalized,
          email,
          lastUsedAt: new Date(),
        },
      });

      return user;
    });

    const { token } = await issueToken({ userId: created.id, type: TOKEN_VERIFY, requestIp: ip });
    await sendMail(buildVerifyEmail({ to: email, token }));

    return ok({ status: "verification_sent" }, { requestId, status: 202 });
  } catch (error) {
    // Гонка на один email: параллельный запрос успел создать пользователя.
    if (isUniqueViolation(error)) {
      return ok({ status: "verification_sent" }, { requestId, status: 202 });
    }
    return handleRouteError(error, requestId, "auth/register");
  }
}
