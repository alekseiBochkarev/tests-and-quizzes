import type { Metadata } from "next";
import Link from "next/link";

import { TopicForm } from "@/components/admin/TopicForm";
import { Alert } from "@/components/ui/Alert";
import { listAdminCategories } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Новая тема",
};

export default async function AdminNewTopicPage() {
  const categories = await listAdminCategories();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-base text-muted">
          <Link href="/admin/topics" className="font-semibold text-accent underline underline-offset-4">
            Темы и вопросы
          </Link>{" "}
          / Новая тема
        </p>
        <h2 className="text-2xl font-bold">Новая тема</h2>
        <p className="max-w-2xl text-lg text-ink-soft">
          Тема появляется в каталоге, когда в ней есть хотя бы один опубликованный вопрос. Начните
          с черновика: вопросы можно добавить сразу после сохранения.
        </p>
      </div>

      {categories.length === 0 ? (
        <Alert variant="error" title="Нет разделов">
          В базе нет ни одного раздела, поэтому тему создать нельзя. Разделы задаются сидом
          каталога.
        </Alert>
      ) : (
        <TopicForm categories={categories} />
      )}
    </section>
  );
}
