import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Аналитика",
};

export default async function AdminAnalyticsPage() {
  await requireAdmin("/admin/analytics");

  return (
    <AdminPlaceholder
      title="Аналитика"
      nextStep="Сводка по продукту появится в задаче QA-03, после подключения событий и согласий."
    >
      Здесь будут регистрации, завершение тестов, возвраты и популярные темы — без email и других
      персональных данных.
    </AdminPlaceholder>
  );
}
