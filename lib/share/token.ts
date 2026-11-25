import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Подписанная ссылка на результат (GRW-01).
 *
 * Ссылка ведёт на публичную страницу `/share/<attemptId>/<token>`: её можно
 * открыть без входа в аккаунт. Токен — это усечённый HMAC-SHA256 от id попытки,
 * поэтому:
 *
 * - его нельзя подобрать, не зная `AUTH_SECRET`;
 * - в БД не нужна новая колонка и миграция;
 * - ссылка стабильна: один и тот же результат всегда даёт один и тот же адрес.
 *
 * Ограничение осознанное: отозвать отдельную ссылку нельзя, а смена
 * `AUTH_SECRET` делает недействительными все ранее выданные ссылки. Для MVP
 * этого достаточно; отзыв появится вместе с настройками приватности.
 *
 * Модуль чистый (без next/*), чтобы его можно было покрыть unit-тестами.
 */

/** 24 байта HMAC в base64url — 32 символа: коротко для ссылки и достаточно стойко. */
const TOKEN_LENGTH = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

function payload(attemptId: string): string {
  // Префикс отделяет домен подписи от сессионной cookie с тем же секретом.
  return `share:attempt:${attemptId}`;
}

/** Создаёт токен ссылки для попытки. */
export function createShareToken(attemptId: string, secret: string): string {
  if (!attemptId) {
    throw new Error("createShareToken: attemptId is required");
  }
  if (!secret) {
    throw new Error("createShareToken: secret is required");
  }

  return createHmac("sha256", secret)
    .update(payload(attemptId))
    .digest("base64url")
    .slice(0, TOKEN_LENGTH);
}

/** Проверяет токен. Любая проблема — `false`, без исключений. */
export function verifyShareToken(
  attemptId: string,
  token: string | null | undefined,
  secret: string,
): boolean {
  if (!attemptId || !token || !secret) return false;
  if (!TOKEN_PATTERN.test(token)) return false;

  const expected = Buffer.from(createShareToken(attemptId, secret), "utf8");
  const actual = Buffer.from(token, "utf8");

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Путь публичной страницы результата. */
export function sharePath(attemptId: string, token: string): string {
  return `/share/${encodeURIComponent(attemptId)}/${token}`;
}

/** Абсолютная ссылка для кнопки «Поделиться». */
export function shareUrl(attemptId: string, token: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${sharePath(attemptId, token)}`;
}
