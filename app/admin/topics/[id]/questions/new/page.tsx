import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuestionForm } from "@/components/admin/QuestionForm";
import { Alert } from "@/components/ui/Alert";
import { getAdminTopic } from "@/lib/admin/content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Новый вопрос",
};

export default async function AdminNewQuestionPage({ params }: PageProps) {
  const { id } = await params;
  const topic = await getAdminTopic(id);
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
          / Новый вопрос
        </p>
        <h2 className="text-2xl font-bold">Новый вопрос</h2>
        <p className="max-w-2xl text-lg text-ink-soft">
          Четыре варианта, один правильный и объяснение. Без объяснения вопрос сохранится как
          черновик — опубликовать его нельзя.
        </p>
      </div>

      {topic.status === "ARCHIVED" ? (
        <Alert variant="neutral" title="Тема в архиве">
          Вопрос можно сохранить, но пользователи его не увидят, пока тема не вернётся из архива.
        </Alert>
      ) : null}

      <QuestionForm topicId={topic.id} topicTitle={topic.title} />
    </section>
  );
}
