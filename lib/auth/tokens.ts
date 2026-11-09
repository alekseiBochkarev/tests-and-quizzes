import { createHash, randomBytes } from "node:crypto";

import { authConfig } from "@/lib/auth/authConfig";
import { prisma } from "@/lib/db";
import type { EmailTokenType } from "@/lib/generated/prisma/enums";

/**
 * Одноразовые email-токены (§4.5, §7.3).
 *
 * Сырой токен существует только в письме. В БД хранится sha256-хеш,
 * поэтому утечка таблицы не даёт готовых ссылок. Одноразовость —
 * `usedAt`, выставляемый в той же транзакции, что и целевое действие.
 */

export const TOKEN_VERIFY: EmailTokenType = "VERIFY_EMAIL";
export const TOKEN_RESET: EmailTokenType = "RESET_PASSWORD";

export const TOKEN_BYTES = 32;

/** 32 случайных байта в URL-safe кодировке. */
export function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** sha256 в hex — ровно то, что хранится в EmailToken.tokenHash. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenTtlMs(type: EmailTokenType): number {
  const hours =
    type === TOKEN_RESET ? authConfig.resetTokenTtlHours : authConfig.verifyTokenTtlHours;
  return hours * 60 * 60 * 1000;
}

/**
 * Выпускает новый токен, инвалидируя предыдущие неиспользованные того же типа.
 * Возвращает сырое значение — его нужно сразу отправить письмом и не хранить.
 */
export async function issueToken(params: {
  userId: string;
  type: EmailTokenType;
  requestIp?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const now = new Date();

  await prisma.emailToken.updateMany({
    where: { userId: params.userId, type: params.type, usedAt: null },
    data: { usedAt: now },
  });

  const token = createToken();
  const expiresAt = new Date(now.getTime() + tokenTtlMs(params.type));

  await prisma.emailToken.create({
    data: {
      userId: params.userId,
      type: params.type,
      tokenHash: hashToken(token),
      expiresAt,
      requestedIp: params.requestIp ?? null,
    },
  });

  // Ленивая очистка: старые использованные/истёкшие записи не нужны.
  await prisma.emailToken.deleteMany({
    where: {
      userId: params.userId,
      type: params.type,
      expiresAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  return { token, expiresAt };
}

export type TokenLookup =
  | { status: "valid"; tokenId: string; userId: string; expiresAt: Date }
  | { status: "expired"; tokenId: string; userId: string }
  | { status: "invalid" };

/** Находит токен по сырому значению и проверяет тип/TTL/одноразовость. */
export async function lookupToken(
  rawToken: string,
  expectedType: EmailTokenType,
): Promise<TokenLookup> {
  if (!rawToken) return { status: "invalid" };

  const token = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: {
      id: true,
      userId: true,
      type: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!token || token.type !== expectedType || token.usedAt !== null) {
    return { status: "invalid" };
  }

  if (token.expiresAt.getTime() <= Date.now()) {
    return { status: "expired", tokenId: token.id, userId: token.userId };
  }

  return {
    status: "valid",
    tokenId: token.id,
    userId: token.userId,
    expiresAt: token.expiresAt,
  };
}
