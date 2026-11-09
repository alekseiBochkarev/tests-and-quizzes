import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Чистые функции сессионной cookie (§4.5, §8.9). Без импорта next/*.
 *
 * Значение: `<userId>:<sessionEpoch>.<hmacBase64url>`.
 * HMAC-SHA256 считается от `<userId>:<sessionEpoch>` с секретом AUTH_SECRET.
 * Подпись защищает от подмены userId/epoch на клиенте; актуальность epoch
 * дополнительно сверяется с БД в currentUser.ts.
 */

export const SESSION_COOKIE = "quiz_user_id";

export type ParsedSession = {
  userId: string;
  epoch: number;
  signature: string;
};

export type VerifiedSession = {
  userId: string;
  epoch: number;
};

function payload(userId: string, epoch: number): string {
  return `${userId}:${epoch}`;
}

function signPayload(payloadValue: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadValue).digest("base64url");
}

/** Разбирает cookie без проверки подписи. Возвращает null для мусора. */
export function parseSession(raw: string | null | undefined): ParsedSession | null {
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;

  const payloadValue = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!signature) return null;

  const colon = payloadValue.lastIndexOf(":");
  if (colon <= 0) return null;

  const userId = payloadValue.slice(0, colon);
  const epochRaw = payloadValue.slice(colon + 1);
  if (!userId || !/^\d+$/.test(epochRaw)) return null;

  const epoch = Number.parseInt(epochRaw, 10);
  if (!Number.isSafeInteger(epoch) || epoch < 0) return null;

  return { userId, epoch, signature };
}

/** Собирает подписанное значение cookie. */
export function signSession(userId: string, epoch: number, secret: string): string {
  if (!userId) {
    throw new Error("signSession: userId is required");
  }
  if (!Number.isSafeInteger(epoch) || epoch < 0) {
    throw new Error("signSession: epoch must be a non-negative integer");
  }

  const payloadValue = payload(userId, epoch);
  return `${payloadValue}.${signPayload(payloadValue, secret)}`;
}

/**
 * Проверяет подпись и формат cookie. Возвращает null при любой проблеме:
 * старое значение без подписи, подделка, неверный epoch.
 */
export function verifySession(
  raw: string | null | undefined,
  secret: string,
): VerifiedSession | null {
  if (!secret) return null;

  const parsed = parseSession(raw);
  if (!parsed) return null;

  const expected = Buffer.from(
    signPayload(payload(parsed.userId, parsed.epoch), secret),
    "utf8",
  );
  const actual = Buffer.from(parsed.signature, "utf8");

  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;

  return { userId: parsed.userId, epoch: parsed.epoch };
}
