import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { visibleAdminNav } from "@/lib/admin/nav";
import { requireStaff } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Обзор",
};

export default async function AdminOverviewPage() {
  const user = await requireStaff();
  const sections = visibleAdminNav(user.role).filter((item) => item.href !== "/admin");

  return (
    <div className="space-y-8">
      <Alert variant="neutral" title="Что уже работает">
        Вход по ролям, навигация и заглушки разделов. Управление контентом появится в задаче CNT-04.
      </Alert>

      <section aria-labelledby="admin-sections" className="space-y-4">
        <h2 id="admin-sections" className="text-2xl font-bold">
          Разделы
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((item) => (
            <Card key={item.href}>
              <h3 className="text-xl font-bold">
                <Link href={item.href} className="text-accent underline underline-offset-4">
                  {item.label}
                </Link>
              </h3>
              <p className="mt-2 text-base text-ink-soft">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
