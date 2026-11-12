import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StartTraining } from "@/components/content/StartTraining";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { countDueQuestions } from "@/lib/attempts/service";
import { getTopicBySlug } from "@/lib/content/catalog";
import { questionWord, topicLevelLabel } from "@/lib/ui/text";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug, null);
  if (!topic) return { title: "Тема не найдена" };
  return {
    title: topic.title,
    description: topic.description ?? `Тренировка по теме «${topic.title}».`,
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const topic = await getTopicBySlug(slug, user?.id ?? null);

  if (!topic) notFound();

  const reviewCount = user ? await countDueQuestions(user.id, topic.id) : 0;
  const progress = topic.progress;

  return (
    <div className="space-y-8">
      <nav aria-label="Хлебные крошки" className="text-base text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/tests" className="underline underline-offset-4 hover:text-accent">
              Тесты
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>{topic.category.title}</li>
        </ol>
      </nav>

      <div className="space-y-3">
        <p className="text-base font-semibold tracking-wide text-accent uppercase">
          {topic.category.title}
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{topic.title}</h1>
        {topic.description ? (
          <p className="max-w-3xl text-xl text-ink-soft">{topic.description}</p>
        ) : null}
        <p className="text-base text-muted">
          {topic.questionCount} {questionWord(topic.questionCount)} с объяснениями после каждого
          ответа.
        </p>
      </div>

      {progress && progress.seenQuestions > 0 ? (
        <div className="max-w-2xl space-y-3 rounded-card border border-line bg-surface p-5">
          <ProgressBar
            value={progress.progress}
            label={`Освоено ${Math.round(progress.progress)}%`}
            tone="success"
          />
          <p className="text-base text-ink-soft">
            {topicLevelLabel(progress.level)}: изучено {progress.seenQuestions} из{" "}
            {topic.questionCount}, освоено {progress.masteredQuestions}.
          </p>
          {progress.accuracy > 0 ? (
            <p className="text-base text-muted">
              Точность ответов в этой теме: {Math.round(progress.accuracy)}%.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="max-w-3xl">
        <StartTraining
          topicId={topic.id}
          maxQuestions={topic.questionCount}
          isAuthenticated={Boolean(user)}
          loginNext={`/tests/${topic.slug}`}
          reviewCount={reviewCount}
        />
      </div>
    </div>
  );
}
