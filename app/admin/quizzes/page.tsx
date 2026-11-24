import type { Metadata } from "next";

import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Выпуски",
};

export default function AdminQuizzesPage() {
  return (
    <AdminPlaceholder
      title="Выпуски"
      nextStep="Управление составами выпусков появится в задаче CNT-04. Сейчас выпуски создаются сидом."
    >
      Здесь будет список готовых тестов на 10–12 вопросов: название, тема, число вопросов и статус.
    </AdminPlaceholder>
  );
}
