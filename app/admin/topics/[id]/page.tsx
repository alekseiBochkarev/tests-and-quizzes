import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ArchiveButton } from "@/components/admin/ArchiveButton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAdminTopic } from "@/lib/admin/content";
import { pluralize, questionWord } from "@/lib/ui/text";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const topic = await getAdminTopic(id);
  return { title: topic ? `Тема: ${topic.title}` : "Тема не найдена" };
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const FILTERS = [
  { value: "", label: "Все" },
  { value: "PUBLISHED", label: "Опубликованные" },
  { value: "DRAFT", label: "Черновики" },
  { value: "ARCHIVED", label: "В архиве" },
] as const;

function pluralQuestions(count: number): string {
  return `${count} ${questionWord(count)}`;
}

export default async function AdminTopicPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const topic = await getAdminTopic(id);
  if (!topic) notFound();

  const status = first(query.status);
  const activeFilter = FILTERS.some((filter) => filter.value === status) ? status : "";
  const questions =
    activeFilter === "" ? topic.questions : topic.questions.filter((q) => q.status === activeFilter);

  const published = topic.questions.filter((question) => question.status === "PUBLISHED").length;
  const drafts = topic.questions.filter((question) => question.status === "DRAFT").length;
  const archived = topic.questions.filter((question) => question.status === "ARCHIVED").length;
  const demo = topic.questions.filter((question) => question.isDemo).length;

  const saved = first(query.saved) === "1";
  const versioned = first(query.versioned) === "1";

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-base text-muted">
          <Link href="/admin/topics" className="font-semibold text-accent underline underline-offset-4">
            Темы и вопросы
          </Link>{" "}
          / {topic.title}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold">{topic.title}</h2>
          <AdminStatusBadge status={topic.status} />
        </div>
        <p className="text-base text-ink-soft">
          Раздел: {topic.categoryTitle} · Адрес: {topic.slug} · Порядок: {topic.order}
        </p>
        {topic.description ? (
          <p className="max-w-3xl text-lg text-ink-soft">{topic.description}</p>
        ) : null}
      </div>

      {saved ? (
        <Alert variant="success" title="Сохранено">
          Изменения сохранены.
        </Alert>
      ) : null}

      {versioned ? (
        <Alert variant="success" title="Создана новая версия">
          Потому что изменился текст, варианты или правильный ответ опубликованного вопроса.
          Старая версия в архиве, новая уже в списке.
        </Alert>
      ) : null}

      {topic.status === "ARCHIVED" ? (
        <Alert variant="neutral" title="Тема в архиве">
          Пользователи не видят тему в каталоге. Вернуть её можно через редактирование, выбрав
          статус «Черновик» или «Опубликовано».
        </Alert>
      ) : null}

      {published === 0 ? (
        <Alert variant="neutral" title="Нет опубликованных вопросов">
          Пока в теме нет опубликованных вопросов, она не показывается в каталоге. Добавьте вопрос
          и опубликуйте его.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button href={`/admin/topics/${topic.id}/edit`} variant="secondary">
          Редактировать тему
        </Button>
        <Button href={`/admin/topics/${topic.id}/questions/new`}>Добавить вопрос</Button>
        {topic.status !== "ARCHIVED" ? (
          <ArchiveButton
            endpoint={`/api/v1/admin/topics/${topic.id}`}
            label="Убрать тему в архив"
            confirmMessage="Тема и её вопросы исчезнут из каталога, но попытки и прогресс сохранятся. Продолжить?"
          />
        ) : null}
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xl font-bold">Вопросы темы</h3>
          <p className="text-base text-muted">
            Всего {pluralQuestions(topic.questions.length)} · опубликовано {published} · черновиков{" "}
            {drafts} · в архиве {archived}
            {demo > 0 ? ` · демо ${demo}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по статусу вопросов">
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.value;
            const href =
              filter.value === ""
                ? `/admin/topics/${topic.id}`
                : `/admin/topics/${topic.id}?status=${filter.value}`;
            return (
              <Link
                key={filter.value || "all"}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "inline-flex min-h-12 items-center rounded-control border-2 border-accent bg-accent-soft px-4 py-2 text-base font-semibold text-ink"
                    : "inline-flex min-h-12 items-center rounded-control border-2 border-line-strong bg-surface px-4 py-2 text-base font-semibold text-ink"
                }
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        {questions.length === 0 ? (
          <div className="space-y-3">
            <p className="text-base text-ink-soft">
              {topic.questions.length === 0
                ? "В теме пока нет вопросов."
                : "По выбранному статусу вопросов нет."}
            </p>
            <Button href={`/admin/topics/${topic.id}/questions/new`} variant="secondary">
              Добавить вопрос
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {questions.map((question) => (
              <li key={question.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-3xl text-lg font-semibold">{question.text}</p>
                  <AdminStatusBadge status={question.status} />
                </div>
                <p className="text-base text-muted">
                  Версия {question.version} · сложность {question.difficulty} ·{" "}
                  {pluralQuestions(question.optionsCount)} · изменён{" "}
                  {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
                    question.updatedAt,
                  )}
                  {question.isDemo ? " · демо" : ""}
                </p>
                <Link
                  href={`/admin/questions/${question.id}`}
                  className="inline-flex min-h-12 items-center text-base font-semibold text-accent underline underline-offset-4"
                >
                  Открыть вопрос
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-base text-ink-soft">
        Всего в теме {pluralize(topic.questions.length, ["вопрос", "вопроса", "вопросов"])}.{" "}
        <Link href="/admin/import" className="font-semibold text-accent underline underline-offset-4">
          Загрузить вопросы из JSON
        </Link>
        .
      </p>
    </section>
  );
}
