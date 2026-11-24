import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Темы и вопросы",
};

export default function AdminTopicsPage() {
  return (
    <AdminPlaceholder
      title="Темы и вопросы"
      nextStep="Создание, редактирование и публикация появятся в задаче CNT-04. До этого контент меняется импортом и сидом."
    >
      Здесь будет каталог разделов, список тем и банк вопросов с фильтрами по статусу и теме.
    </AdminPlaceholder>
  );
}
