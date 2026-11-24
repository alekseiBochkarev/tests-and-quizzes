import { cookies } from "next/headers";
import { z } from "zod";

import { rateLimited, readJsonBody, rejectCrossOrigin } from "@/lib/auth/api";
import { authConfig } from "@/lib/auth/authConfig";
import { buildCookieConsentRecords } from "@/lib/auth/consent";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { checkCookieConsentRateLimit, clientIp } from "@/lib/auth/rateLimit";
import {
  COOKIE_CONSENT_COOKIE,
  COOKIE_CONSENT_MAX_AGE_DAYS,
  createCookieConsent,
  serializeCookieConsent,
} from "@/lib/cookies/consent";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http/json";
import { getRequestId } from "@/lib/http/requestId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const consentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
});

/**
 * POST /api/v1/cookies/consent — сохранить выбор cookie.
 *
 * Выбор кладём в first-party cookie (её читает layout, поэтому баннер не
 * мигает). Для вошедшего пользователя дополнительно пишем `Consent`:
 * обе категории, и при включении, и при отказе. Гостю запись в БД не нужна —
 * его решения достаточно в cookie, а журнал не засоряется анонимными строками.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  const originError = rejectCrossOrigin(request, requestId);
  if (originError) return originError;

  const bodyResult = await readJsonBody(request, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = consentSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return fail("validation_error", "Не удалось сохранить настройки cookie.", {
      requestId,
      status: 400,
    });
  }

  const user = await getCurrentUser();
  const ip = clientIp(request);

  const rateLimit = checkCookieConsentRateLimit(user?.id ?? null, ip);
  if (rateLimit.limited) return rateLimited(requestId, rateLimit.retryAfterSeconds);

  const consent = createCookieConsent({
    analytics: parsed.data.analytics,
    marketing: parsed.data.marketing,
    version: authConfig.legalCookiesVersion,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_CONSENT_COOKIE, serializeCookieConsent(consent), {
    // Cookie не содержит секретов и должна быть доступна клиентским скриптам,
    // когда появятся аналитика и реклама: иначе их нельзя будет выключить.
    httpOnly: false,
    sameSite: "lax",
    secure: authConfig.cookieSecure,
    path: "/",
    maxAge: COOKIE_CONSENT_MAX_AGE_DAYS * 24 * 60 * 60,
  });

  if (user) {
    const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;
    const records = buildCookieConsentRecords({
      analytics: parsed.data.analytics,
      marketing: parsed.data.marketing,
      ip,
      userAgent,
    });

    try {
      await prisma.consent.createMany({
        data: records.map((record) => ({ ...record, userId: user.id })),
      });
    } catch (error) {
      // Выбор уже сохранён в cookie: сбой журнала не должен отменять согласие.
      console.error({
        event: "cookie_consent.audit_failed",
        requestId,
        reason: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  return ok({ consent }, { requestId });
}
