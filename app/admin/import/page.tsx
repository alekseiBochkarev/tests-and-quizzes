import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Импорт",
};

export default function AdminImportPage() {
  return (
    <AdminPlaceholder
      title="Импорт"
      nextStep="Загрузка JSON через админку появится в задаче CNT-04."
    >
      Импорт из forms_writer через командную строку уже работает:{" "}
      <code className="rounded bg-paper px-1">npm run db:import</code>. Здесь появится загрузка
      файла, проверка и предпросмотр перед публикацией.
    </AdminPlaceholder>
  );
}
