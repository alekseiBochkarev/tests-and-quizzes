import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TopicForm } from "@/components/admin/TopicForm";
import { listAdminCategories } from "@/lib/admin/content";
import { getAdminTopic } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Редактирование темы",
};

export default async function AdminEditTopicPage({ params }: PageProps) {
  const { id } = await params;
  const [topic, categories] = await Promise.all([getAdminTopic(id), listAdminCategories()]);

  if (!topic) notFound();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-base text-muted">
          <Link href="/admin/topics" className="font-semibold text-accent underline underline-offset-4">
            Темы и вопросы
          </Link>{" "}
          /{" "}
          <Link
            href={`/admin/topics/${topic.id}`}
            className="font-semibold text-accent underline underline-offset-4"
          >
            {topic.title}
          </Link>{" "}
          / Редактирование
        </p>
        <h2 className="text-2xl font-bold">Редактирование темы</h2>
        <p className="max-w-2xl text-lg text-ink-soft">
          Название, описание и статус видны в каталоге. Смена адреса меняет ссылку на тему.
        </p>
      </div>

      <TopicForm
        categories={categories}
        topic={{
          id: topic.id,
          title: topic.title,
          slug: topic.slug,
          description: topic.description,
          coverUrl: topic.coverUrl,
          order: topic.order,
          status: topic.status,
          categoryId: topic.categoryId,
        }}
      />
    </section>
  );
}
