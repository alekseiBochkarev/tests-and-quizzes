import { isIP } from "node:net";

import { authConfig } from "@/lib/auth/authConfig";

/**
 * In-memory rate-limit (§4.5, §8.10).
 *
 * Бакеты разделены по операции и субъекту: `login:email:<email>` и
 * `login:ip:<ip>` не пересекаются. Для одного инстанса этого достаточно;
 * при горизонтальном масштабировании счётчики переедут в Redis.
 *
 * `clientIp()` доверяет `x-forwarded-for` / `x-real-ip` только при явном
 * `TRUST_PROXY=true`. Значение по умолчанию — `false`, в том числе в
 * production: заголовки легко подделать, если приложение не стоит за
 * доверенным прокси. Без флага IP-бакеты не действуют.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 100_000;

export type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

const ALLOWED: RateLimitResult = { limited: false, retryAfterSeconds: 0 };

function check(key: string, limit: number, windowMs: number): RateLimitResult {
  if (limit <= 0) return ALLOWED;

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return ALLOWED;
  }

  if (bucket.count >= limit) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return ALLOWED;
}

function sweep(now: number): void {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) buckets.clear();
}

function worst(a: RateLimitResult, b: RateLimitResult): RateLimitResult {
  if (!a.limited && !b.limited) return ALLOWED;
  return a.retryAfterSeconds >= b.retryAfterSeconds ? a : b;
}

function checkPair(params: {
  prefix: string;
  email?: string | null;
  ip?: string | null;
  emailLimit: number;
  ipLimit: number;
  windowMs: number;
}): RateLimitResult {
  sweep(Date.now());

  const byEmail = params.email
    ? check(`${params.prefix}:email:${params.email}`, params.emailLimit, params.windowMs)
    : ALLOWED;
  const byIp = params.ip
    ? check(`${params.prefix}:ip:${params.ip}`, params.ipLimit, params.windowMs)
    : ALLOWED;

  return worst(byEmail, byIp);
}

const HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export function checkRegisterRateLimit(
  emailNormalized: string | null,
  ip: string | null,
): RateLimitResult {
  return checkPair({
    prefix: "register",
    email: emailNormalized,
    ip,
    emailLimit: authConfig.rateLimit.registerPerEmailH,
    ipLimit: authConfig.rateLimit.registerPerIpH,
    windowMs: HOUR_MS,
  });
}

export function checkLoginRateLimit(
  emailNormalized: string | null,
  ip: string | null,
): RateLimitResult {
  return checkPair({
    prefix: "login",
    email: emailNormalized,
    ip,
    emailLimit: authConfig.rateLimit.loginPerEmail15m,
    ipLimit: authConfig.rateLimit.loginPerIp15m,
    windowMs: FIFTEEN_MIN_MS,
  });
}

export function checkResendRateLimit(
  emailNormalized: string | null,
  ip: string | null,
): RateLimitResult {
  return checkPair({
    prefix: "resend",
    email: emailNormalized,
    ip,
    emailLimit: authConfig.rateLimit.resendPerEmailH,
    ipLimit: authConfig.rateLimit.resendPerIpH,
    windowMs: HOUR_MS,
  });
}

export function checkForgotRateLimit(
  emailNormalized: string | null,
  ip: string | null,
): RateLimitResult {
  return checkPair({
    prefix: "forgot",
    email: emailNormalized,
    ip,
    emailLimit: authConfig.rateLimit.forgotPerEmailH,
    ipLimit: authConfig.rateLimit.forgotPerIpH,
    windowMs: HOUR_MS,
  });
}

export function checkResetRateLimit(ip: string | null): RateLimitResult {
  if (!ip) return ALLOWED;
  return check(`reset:ip:${ip}`, authConfig.rateLimit.resetPerIpH, HOUR_MS);
}

export function checkChangePasswordRateLimit(userId: string | null): RateLimitResult {
  if (!userId) return ALLOWED;
  return check(
    `change-password:user:${userId}`,
    authConfig.rateLimit.changePasswordPerUserH,
    HOUR_MS,
  );
}

/**
 * IP клиента. Заголовкам прокси верим только при явном `TRUST_PROXY=true`;
 * иначе возвращаем null, и IP-бакет не действует. Флаг передаётся
 * параметром, чтобы тесты не зависели от `process.env`.
 */
export function clientIp(request: Request, trustProxy: boolean = authConfig.trustProxy): string | null {
  if (!trustProxy) return null;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && isIP(first) !== 0) return first;
  }

  const real = request.headers.get("x-real-ip")?.trim();
  if (real && isIP(real) !== 0) return real;

  return null;
}

/** Сброс бакетов — только для unit-тестов. */
export function resetRateLimits(): void {
  buckets.clear();
}
