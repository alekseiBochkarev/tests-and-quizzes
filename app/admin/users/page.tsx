import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Пользователи",
};

export default async function AdminUsersPage() {
  await requireAdmin("/admin/users");

  return (
    <AdminPlaceholder
      title="Пользователи"
      nextStep="Список пользователей и смена ролей через интерфейс появятся позже. Роль выдаётся командой."
    >
      Пока роль меняется в терминале:{" "}
      <code className="rounded bg-paper px-1">npm run user:role -- user@example.com EDITOR</code>.
      Доступны роли <strong>USER</strong>, <strong>EDITOR</strong> и <strong>ADMIN</strong>.
    </AdminPlaceholder>
  );
}
