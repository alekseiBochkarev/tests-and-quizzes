/**
 * Роли и доступ в служебный раздел (CNT-03).
 *
 * Один источник правды для серверной проверки и для видимости ссылок.
 * Проверка всегда выполняется на сервере: скрытая ссылка — удобство, а не
 * защита. Роли хранятся в `User.role` и меняются только через CLI.
 */

export const USER_ROLES = ["USER", "EDITOR", "ADMIN"] as const;

export type UserRoleName = (typeof USER_ROLES)[number];

/** Роли, которым открыт `/admin`. */
export const STAFF_ROLES = ["EDITOR", "ADMIN"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "EDITOR" || role === "ADMIN";
}

/** Пользователи и аналитика — только для администратора. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

export function isUserRole(value: unknown): value is UserRoleName {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

/** Понятная подпись роли для интерфейса. */
export function roleLabel(role: string | null | undefined): string {
  if (role === "ADMIN") return "Администратор";
  if (role === "EDITOR") return "Редактор";
  return "Пользователь";
}
