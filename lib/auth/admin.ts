import { notFound, redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/currentUser";
import { isAdminRole, isStaffRole, type StaffRole } from "@/lib/auth/roles";

/**
 * Серверная защита админки (CNT-03).
 *
 * - гость уходит на вход и возвращается в админку;
 * - обычный пользователь получает 404, чтобы служебный раздел не
 *   рекламировался;
 * - редактор видит контентные разделы, администратор — все.
 *
 * Функции вызываются в layout и в страницах, которым нужна конкретная роль.
 * Проверка только на сервере: клиентские ссылки ничего не разрешают.
 */

export type StaffUser = CurrentUser & { role: StaffRole };

export async function requireStaff(nextPath = "/admin"): Promise<StaffUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!isStaffRole(user.role)) notFound();

  return { ...user, role: user.role };
}

export async function requireAdmin(nextPath = "/admin"): Promise<StaffUser> {
  const user = await requireStaff(nextPath);
  if (!isAdminRole(user.role)) notFound();

  return user;
}
