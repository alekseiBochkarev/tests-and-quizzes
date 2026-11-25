import { deletedEmailFor } from "@/lib/account/rules";
import { prisma } from "@/lib/db";

/**
 * Анонимизация аккаунта (ACC-01, AUTH-6, LEG-4, §9.4).
 *
 * По ТЗ удаление — это анонимизация ПДн с сохранением агрегированной
 * статистики. Поэтому пользователь остаётся строкой в БД: попытки, ответы
 * и прогресс продолжают учитываться в обезличенных агрегатах, но связать их
 * с человеком больше нельзя.
 *
 * Что удаляем полностью:
 * - `AuthIdentity` — внешние идентификаторы входа;
 * - `EmailToken` — ссылки подтверждения и сброса;
 * - `UserInterest` — персональные предпочтения.
 *
 * Что обезличиваем:
 * - email → `deleted-<id>@deleted.invalid` (освобождает настоящий адрес);
 * - пароль, имя, аватар, подтверждение почты — в null;
 * - IP и User-Agent в согласиях — в null, сами согласия остаются как
 *   доказательство их выдачи;
 * - `sessionEpoch` растёт, поэтому все сессии становятся недействительными.
 *
 * Действие фиксируется в `AuditLog` без IP/UA: журнал не должен возвращать
 * персональные данные, от которых мы только что избавились.
 */
export async function anonymizeAccount(userId: string): Promise<void> {
  const anonymousEmail = deletedEmailFor(userId);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymousEmail,
        emailNormalized: anonymousEmail,
        passwordHash: null,
        name: null,
        avatarUrl: null,
        emailVerifiedAt: null,
        interestsSetAt: null,
        lastLoginAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
        role: "USER",
        deletedAt: new Date(),
        sessionEpoch: { increment: 1 },
      },
    });

    await tx.authIdentity.deleteMany({ where: { userId } });
    await tx.emailToken.deleteMany({ where: { userId } });
    await tx.userInterest.deleteMany({ where: { userId } });

    await tx.consent.updateMany({
      where: { userId },
      data: { ip: null, userAgent: null },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        action: "account.deleted",
        entityType: "User",
        entityId: userId,
      },
    });
  });
}
