import { isAdminRole, isStaffRole } from "@/lib/auth/roles";

/**
 * Разделы админки (CNT-03).
 *
 * Темы, вопросы и импорт работают с CNT-04; выпуски, пользователи и аналитика
 * пока заглушки. Конфиг общий для навигации и обзорной страницы, чтобы новый
 * раздел добавлялся в одном месте.
 */

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  /** Раздел доступен только администратору. */
  adminOnly: boolean;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    href: "/admin",
    label: "Обзор",
    description: "Коротко о том, что уже работает и что появится дальше.",
    adminOnly: false,
  },
  {
    href: "/admin/topics",
    label: "Темы и вопросы",
    description: "Каталог разделов, темы и банк вопросов.",
    adminOnly: false,
  },
  {
    href: "/admin/quizzes",
    label: "Выпуски",
    description: "Готовые тесты из 10–12 вопросов.",
    adminOnly: false,
  },
  {
    href: "/admin/import",
    label: "Импорт",
    description: "Загрузка вопросов из forms_writer.",
    adminOnly: false,
  },
  {
    href: "/admin/users",
    label: "Пользователи",
    description: "Роли и доступ к служебному разделу.",
    adminOnly: true,
  },
  {
    href: "/admin/analytics",
    label: "Аналитика",
    description: "Сводка по продукту без персональных данных.",
    adminOnly: true,
  },
];

/** Пункты навигации, доступные роли. Не-сотрудники не получают ничего. */
export function visibleAdminNav(role: string | null | undefined): AdminNavItem[] {
  if (!isStaffRole(role)) return [];
  return ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly || isAdminRole(role));
}
