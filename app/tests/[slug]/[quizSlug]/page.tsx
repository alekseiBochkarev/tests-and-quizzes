import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StartQuiz } from "@/components/content/StartQuiz";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getQuizBySlug } from "@/lib/quizzes/service";
import { questionWord } from "@/lib/ui/text";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ slug: string; quizSlug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, quizSlug } = await params;
  const quiz = await getQuizBySlug(slug, quizSlug);
  if (!quiz) return { title: "Выпуск не найден" };
  return {
    title: quiz.title,
    description:
      quiz.description ??
      `Выпуск «${quiz.title}»: ${quiz.questionCount} вопросов с объяснениями по теме «${quiz.topic.title}».`,
  };
}

export default async function QuizPage({ params }: PageProps) {
  const { slug, quizSlug } = await params;
  const user = await getCurrentUser();
  const quiz = await getQuizBySlug(slug, quizSlug);

  if (!quiz) notFound();

  const quizPath = `/tests/${quiz.topic.slug}/${quiz.slug}`;

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
          <li>
            <Link
              href={`/tests/${quiz.topic.slug}`}
              className="underline underline-offset-4 hover:text-accent"
            >
              {quiz.topic.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>{quiz.title}</li>
        </ol>
      </nav>

      <div className="space-y-3">
        <p className="text-base font-semibold tracking-wide text-accent uppercase">
          {quiz.topic.category.title}
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{quiz.title}</h1>
        {quiz.description ? (
          <p className="max-w-3xl text-xl text-ink-soft">{quiz.description}</p>
        ) : null}
        <p className="text-base text-muted">
          Готовый выпуск по теме «{quiz.topic.title}»: {quiz.questionCount}{" "}
          {questionWord(quiz.questionCount)} с объяснениями. Без таймера и спешки.
        </p>
      </div>

      <div className="max-w-3xl">
        <StartQuiz
          quizId={quiz.id}
          questionCount={quiz.questionCount}
          isAuthenticated={Boolean(user)}
          loginNext={quizPath}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button href={`/tests/${quiz.topic.slug}`} variant="secondary">
          Все выпуски и тренировки темы
        </Button>
        <Button href="/tests" variant="quiet">
          В каталог
        </Button>
      </div>
    </div>
  );
}
