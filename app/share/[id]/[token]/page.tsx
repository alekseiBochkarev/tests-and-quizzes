import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { attemptTitle } from "@/lib/attempts/display";
import { env } from "@/lib/env";
import { getSharedAttempt } from "@/lib/share/service";
import { resultPraise, scoreLine, shareDescription, shareHeadline } from "@/lib/share/text";
import { verifyShareToken } from "@/lib/share/token";

/**
 * Публичная страница результата (GRW-01, RES-6).
 *
 * Открывается без входа: ссылка подписана HMAC-токеном и ведёт на конкретную
 * завершённую попытку. На странице только итог — название теста, процент,
 * число верных ответов и дата. Почта, имя и ответы не показываются.
 *
 * Индексировать такие страницы нельзя: `noindex` и в metadata, и в robots
 * наследуется от корневого layout.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string; token: string }> };

async function loadShared(params: PageProps["params"]) {
  const { id, token } = await params;
  if (!verifyShareToken(id, token, env.AUTH_SECRET)) return null;
  return getSharedAttempt(id);
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(value);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const base: Metadata = {
    metadataBase: new URL(env.APP_URL),
    robots: { index: false, follow: false },
  };

  const attempt = await loadShared(params);
  if (!attempt) {
    return { ...base, title: "Результат теста" };
  }

  const title = attemptTitle(attempt);
  const headline = shareHeadline({ title, percent: attempt.percent });
  const description = shareDescription({
    title,
    correctCount: attempt.correctCount,
    questionCount: attempt.questionCount,
  });

  return {
    ...base,
    title: headline,
    description,
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: "Тесты",
      title: headline,
      description,
    },
  };
}

export default async function SharedResultPage({ params }: PageProps) {
  const attempt = await loadShared(params);
  if (!attempt) notFound();

  const title = attemptTitle(attempt);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <p className="text-base font-semibold tracking-wide text-accent uppercase">
          Результат теста
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-lg text-ink-soft">
          Эту ссылку можно открыть без входа в аккаунт.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="text-5xl font-bold text-accent">{attempt.percent}%</p>
          <p className="text-xl font-semibold">
            {scoreLine(attempt.correctCount, attempt.questionCount)}
          </p>
        </div>

        <p className="text-lg font-semibold text-success">{resultPraise(attempt.percent)}</p>

        <dl className="grid gap-3 text-base sm:grid-cols-2">
          <div>
            <dt className="text-muted">Пройден</dt>
            <dd className="text-lg font-semibold">{formatDate(attempt.finishedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">Вопросов в тесте</dt>
            <dd className="text-lg font-semibold">{attempt.questionCount}</dd>
          </div>
        </dl>
      </Card>

      <Alert variant="neutral" title="Личные данные не показываются">
        На странице виден только итог: название теста, результат и дата. Ответы и почта не
        раскрываются.
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button href="/tests">Пройти тест</Button>
        <Button href="/register" variant="secondary">
          Сохранить свои результаты
        </Button>
      </div>

      <p className="text-base text-ink-soft">
        Короткие тесты с объяснениями: крупный текст, спокойный темп, без таймеров.
      </p>
    </div>
  );
}
