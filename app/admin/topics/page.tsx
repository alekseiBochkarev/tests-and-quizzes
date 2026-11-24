import type { Metadata } from "next";
import Link from "next/link";

import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listAdminCategories, listAdminTopics } from "@/lib/admin/content";
import { pluralize, questionWord } from "@/lib/ui/text";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Темы и вопросы",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [topics, categories, params] = await Promise.all([
    listAdminTopics(),
    listAdminCategories(),
    searchParams,
  ]);

  const grouped = categories.map((category) => ({
    category,
    topics: topics.filter((topic) => topic.categoryId === category.id),
  }));

  const withoutCategory = topics.filter(
    (topic) => !categories.some((category) => category.id === topic.categoryId),
  );

  const publishedTopics = topics.filter((topic) => topic.status === "PUBLISHED").length;
  const totalQuestions = topics.reduce((sum, topic) => sum + topic.questionCount, 0);
  const saved = first(params.saved) === "1";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Темы и вопросы</h2>
          <p className="max-w-2xl text-lg text-ink-soft">
            Создавайте темы, добавляйте вопросы и публикуйте их. Опубликованные вопросы
            участвуют в тренировках, черновики видит только редакция.
          </p>
        </div>
        <Button href="/admin/topics/new">Новая тема</Button>
      </div>

      {saved ? (
        <Alert variant="success" title="Сохранено">
          Изменения темы сохранены.
        </Alert>
      ) : null}

      <p className="text-base text-ink-soft">
        Всего тем: <span className="font-semibold text-ink">{topics.length}</span>, опубликовано:{" "}
        <span className="font-semibold text-ink">{publishedTopics}</span>. Вопросов в темах:{" "}
        <span className="font-semibold text-ink">{totalQuestions}</span>.
      </p>

      {topics.length === 0 ? (
        <Alert variant="neutral" title="Тем пока нет">
          Создайте первую тему, затем добавьте в неё вопросы. Пока в теме нет опубликованных
          вопросов, она не показывается в каталоге.
        </Alert>
      ) : null}

      <div className="space-y-6">
        {grouped.map(({ category, topics: categoryTopics }) => (
          <Card key={category.id} className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-bold">{category.title}</h3>
              <p className="text-base text-muted">
                {categoryTopics.length
                  ? `${categoryTopics.length} ${pluralize(categoryTopics.length, [
                      "тема",
                      "темы",
                      "тем",
                    ])}`
                  : "Тем нет"}
              </p>
            </div>

            {categoryTopics.length === 0 ? (
              <p className="text-base text-ink-soft">
                В этом разделе пока нет тем.{" "}
                <Link
                  href="/admin/topics/new"
                  className="font-semibold text-accent underline underline-offset-4"
                >
                  Создать тему
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {categoryTopics.map((topic) => (
                  <li key={topic.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">
                          <Link
                            href={`/admin/topics/${topic.id}`}
                            className="text-accent underline underline-offset-4"
                          >
                            {topic.title}
                          </Link>
                        </p>
                        <p className="text-base text-muted">
                          Адрес: {topic.slug} · Порядок: {topic.order}
                        </p>
                        <p className="text-base text-ink-soft">
                          {topic.questionCount} {questionWord(topic.questionCount)}: опубликовано{" "}
                          {topic.publishedCount}, черновиков {topic.draftCount}, в архиве{" "}
                          {topic.archivedCount}
                          {topic.demoCount > 0 ? `, демо ${topic.demoCount}` : ""}.
                        </p>
                      </div>
                      <AdminStatusBadge status={topic.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}

        {withoutCategory.length > 0 ? (
          <Card className="space-y-3">
            <h3 className="text-xl font-bold">Без раздела</h3>
            <ul className="divide-y divide-line">
              {withoutCategory.map((topic) => (
                <li key={topic.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/admin/topics/${topic.id}`}
                    className="text-lg font-semibold text-accent underline underline-offset-4"
                  >
                    {topic.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
