import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/AdminNav";
import { requireStaff } from "@/lib/auth/admin";
import { roleLabel } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Админка",
  robots: { index: false, follow: false },
};

/**
 * Общий каркас служебного раздела.
 * Проверка роли — здесь, поэтому все вложенные страницы закрыты одним guard.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireStaff();

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-line pb-6">
        <p className="text-base font-semibold tracking-wide text-accent uppercase">
          Служебный раздел
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Админка</h1>
          <p className="text-base text-ink-soft">
            {roleLabel(user.role)}: {user.email}
          </p>
        </div>
        <p className="max-w-2xl text-lg text-ink-soft">
          Управление темами, вопросами и выпусками. Раздел видят только редакторы и администраторы.
        </p>
      </header>

      <AdminNav role={user.role} />

      {children}

      <p className="border-t border-line pt-6">
        <Link href="/" className="text-lg font-semibold text-accent underline underline-offset-4">
          Вернуться на сайт
        </Link>
      </p>
    </div>
  );
}
