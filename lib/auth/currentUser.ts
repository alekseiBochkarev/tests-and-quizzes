import { readSession } from "@/lib/auth/cookieStore";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/generated/prisma/enums";

/**
 * Серверное чтение текущего пользователя для server components и API.
 *
 * Две проверки: подпись cookie (session.ts) и актуальный `sessionEpoch` в БД.
 * После смены пароля, сброса или «выйти на всех устройствах» epoch растёт,
 * и все ранее выданные cookie перестают действовать.
 *
 * Ошибки БД наружу не пробрасываются: для шапки и страниц «гость» —
 * безопасное состояние. API-роуты, которым нужен явный 503, проверяют
 * сессию сами через readSession + prisma.
 */
export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  emailVerified: boolean;
  timezone: string;
  sessionEpoch: number;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerifiedAt: true,
        timezone: true,
        sessionEpoch: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt !== null) return null;
    if (user.sessionEpoch !== session.epoch) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
      timezone: user.timezone,
      sessionEpoch: user.sessionEpoch,
    };
  } catch {
    return null;
  }
}
