import { prisma } from "@/lib/db";
import type { IdentityProvider } from "@/lib/generated/prisma/enums";

export const PROVIDER_EMAIL: IdentityProvider = "EMAIL";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Нормализация email: trim → lowercase. Источник истины — User.emailNormalized.
 * Возвращает null для пустого/слишком длинного/невалидного значения,
 * никогда не возвращает пустую строку.
 */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const value = input.trim().toLowerCase();
  if (!value || value.length > 254) return null;
  if (!EMAIL_RE.test(value)) return null;

  return value;
}

export function isValidEmail(input: unknown): boolean {
  return normalizeEmail(input) !== null;
}

/** Маскирует email для прикладных логов: `u***@example.com`. */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const at = email.indexOf("@");
  if (at <= 0) return "***";

  return `${email.slice(0, 1)}***${email.slice(at)}`;
}

export async function findUserByEmail(emailNormalized: string) {
  return prisma.user.findUnique({ where: { emailNormalized } });
}

/** Создаёт/обновляет AuthIdentity(EMAIL) для пользователя. */
export async function upsertEmailIdentity(params: {
  userId: string;
  emailNormalized: string;
  email: string;
}) {
  return prisma.authIdentity.upsert({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER_EMAIL,
        providerAccountId: params.emailNormalized,
      },
    },
    create: {
      userId: params.userId,
      provider: PROVIDER_EMAIL,
      providerAccountId: params.emailNormalized,
      email: params.email,
      lastUsedAt: new Date(),
    },
    update: {
      userId: params.userId,
      email: params.email,
      lastUsedAt: new Date(),
    },
  });
}
