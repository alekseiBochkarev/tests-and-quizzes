import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ArchiveButton } from "@/components/admin/ArchiveButton";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { getAdminQuestion } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Редактирование вопроса",
};

export default async function AdminQuestionPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const question = await getAdminQuestion(id);
  if (!question) notFound();

  const versioned = query.versioned === "1";

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-base text-muted">
          <Link href="/admin/topics" className="font-semibold text-accent underline underline-offset-4">
            Темы и вопросы
          </Link>{" "}
          /{" "}
          <Link
            href={`/admin/topics/${question.topicId}`}
            className="font-semibold text-accent underline underline-offset-4"
          >
            {question.topicTitle}
          </Link>{" "}
          / Вопрос
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold">Редактирование вопроса</h2>
          <AdminStatusBadge status={question.status} />
        </div>
        <p className="text-base text-ink-soft">
          Версия {question.version}
          {question.isDemo ? " · демонстрационный вопрос" : ""}
        </p>
      </div>

      {versioned ? (
        <Alert variant="success" title="Создана новая версия">
          Текст, варианты или правильный ответ опубликованного вопроса изменились, поэтому старая
          версия ушла в архив. Прогресс пользователей остаётся привязанным к тем формулировкам,
          которые они проходили.
        </Alert>
      ) : null}

      {question.status === "ARCHIVED" ? (
        <Alert variant="neutral" title="Вопрос в архиве">
          Он не участвует в тренировках и не виден пользователям. Чтобы вернуть вопрос, выберите
          статус «Черновик» или «Опубликовано» и сохраните.
        </Alert>
      ) : null}

      <Card className="space-y-3">
        <h3 className="text-xl font-bold">Что важно знать</h3>
        <p className="text-base text-ink-soft">
          Изменение текста, вариантов или правильного ответа создаёт новую версию и архивирует
          старую. Объяснение, сложность и изображение можно править на месте.
        </p>
        <p className="text-base text-ink-soft">
          Архивация сохраняет историю:{" "}
          <Link
            href={`/admin/topics/${question.topicId}`}
            className="font-semibold text-accent underline underline-offset-4"
          >
            вернуться к вопросам темы
          </Link>
          .
        </p>
      </Card>

      <QuestionForm
        topicId={question.topicId}
        topicTitle={question.topicTitle}
        question={{
          id: question.id,
          topicId: question.topicId,
          topicTitle: question.topicTitle,
          text: question.text,
          explanation: question.explanation,
          imageUrl: question.imageUrl,
          imageLicense: question.imageLicense,
          imageSource: question.imageSource,
          imageAlt: question.imageAlt,
          difficulty: question.difficulty,
          status: question.status,
          version: question.version,
          options: question.options,
        }}
      />

      {question.status !== "ARCHIVED" ? (
        <ArchiveButton
          endpoint={`/api/v1/admin/questions/${question.id}`}
          label="Убрать вопрос в архив"
          confirmMessage="Вопрос исчезнет из тренировок, но ответы и прогресс пользователей сохранятся. Продолжить?"
          redirectTo={`/admin/topics/${question.topicId}?archived=1`}
        />
      ) : null}
    </section>
  );
}
