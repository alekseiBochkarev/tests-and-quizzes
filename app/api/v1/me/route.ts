import { anonymizeAccount } from "@/lib/account/deletion";
import { isDeletionConfirmation } from "@/lib/account/rules";
import {
  AUTH_MESSAGES,
  handleRouteError,
  rateLimited,
  readJsonBody,
  rejectCrossOrigin,
} from "@/lib/auth/api";
import { clearSession, readSession } from "@/lib/auth/cookieStore";
import { verifyPassword } from "@/lib/auth/password";
import { checkAccountDeletionRateLimit } from "@/lib/auth/rateLimit";
import { deleteAccountSchema, formatValidationError } from "@/lib/auth/schemas";
import { prisma } from "@/lib/db";
import { fail, noContent } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASSWORD_MISMATCH = "Пароль не подошёл. Проверьте раскладку и попробуйте снова.";
const CONFIRMATION_MISMATCH = "Введите слово УДАЛИТЬ, чтобы подтвердить удаление.";

/**
 * DELETE /api/v1/me — удаление аккаунта (ACC-01, AUTH-6, LEG-4).
 *
 * Требует текущий пароль и явное подтверждение. Данные не стираются
 * физически: аккаунт обезличивается, агрегированная статистика остаётся
 * (§9.4). Все сессии завершаются через рост `sessionEpoch`.
 */
export async function DELETE(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const session = await readSession();
  if (!session) {
    return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
  }

  const rateLimit = checkAccountDeletionRateLimit(session.userId);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = deleteAccountSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    const validation = formatValidationError(parsed.error);
    return fail("validation_error", validation.message, {
      requestId,
      status: 400,
      details: { fields: validation.fields },
    });
  }

  const fields: Record<string, string> = {};
  if (!isDeletionConfirmation(parsed.data.confirmation)) {
    fields.confirmation = CONFIRMATION_MISMATCH;
  }

  if (Object.keys(fields).length > 0) {
    return fail("validation_error", AUTH_MESSAGES.validation, {
      requestId,
      status: 400,
      details: { fields },
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

    if (!user || user.deletedAt !== null || user.sessionEpoch !== session.epoch) {
      return fail("unauthorized", AUTH_MESSAGES.unauthorized, { requestId, status: 401 });
    }

    if (!verifyPassword(parsed.data.password, user.passwordHash)) {
      return fail("validation_error", AUTH_MESSAGES.validation, {
        requestId,
        status: 400,
        details: { fields: { password: PASSWORD_MISMATCH } },
      });
    }

    await anonymizeAccount(user.id);
    await clearSession();

    return noContent({ requestId });
  } catch (error) {
    return handleRouteError(error, requestId, "me/delete");
  }
}
