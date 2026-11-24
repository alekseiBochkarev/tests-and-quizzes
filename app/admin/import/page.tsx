import type { Metadata } from "next";
import Link from "next/link";

import { ImportForm } from "@/components/admin/ImportForm";
import { Alert } from "@/components/ui/Alert";
import { listAdminTopics } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Импорт",
};

export default async function AdminImportPage() {
  const topics = await listAdminTopics();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Импорт вопросов</h2>
        <p className="max-w-3xl text-lg text-ink-soft">
          Загрузите JSON из forms_writer в выбранную тему. Сначала покажем предпросмотр: что
          добавится, что обновится и что уйдёт в архив. Запись в базу произойдёт только после
          подтверждения.
        </p>
      </div>

      <Alert variant="neutral" title="Импорт не создаёт темы">
        Тему выберите здесь. Поле topic внутри файла используется только для отчёта: вопросы
        попадут в выбранную тему. Новые темы создаются в{" "}
        <Link href="/admin/topics" className="font-semibold text-accent underline underline-offset-4">
          разделе «Темы и вопросы»
        </Link>
        .
      </Alert>

      <ImportForm
        topics={topics.map((topic) => ({
          id: topic.id,
          title: topic.title,
          slug: topic.slug,
          status: topic.status,
          categoryTitle: topic.categoryTitle,
        }))}
      />
    </section>
  );
}
