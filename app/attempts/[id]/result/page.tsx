import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ReviewButton } from "@/components/attempts/ReviewButton";
import { ShareResult } from "@/components/attempts/ShareResult";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { attemptKindLabel, attemptTitle } from "@/lib/attempts/display";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getAttemptResult } from "@/lib/attempts/service";
import { DAILY_BONUS_XP } from "@/lib/daily/rules";
import { env } from "@/lib/env";
import { shareMessage } from "@/lib/share/text";
import { createShareToken, shareUrl } from "@/lib/share/token";
import { questionWord } from "@/lib/ui/text";
import { resolveTopicTheme } from "@/lib/ui/topicThemes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Результат тренировки",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AttemptResultPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    const { id } = await params;
    redirect(`/login?next=${encodeURIComponent(`/attempts/${id}/result`)}`);
  }

  const { id } = await params;
  const result = await getAttemptResult(id, user.id);
  if (!result) notFound();

  if (result.status === "IN_PROGRESS") {
    redirect(`/attempts/${id}`);
  }

  const isDaily = result.mode === "DAILY";
  const title = attemptTitle(result);
  const label = attemptKindLabel(result);
  // Уровень A: только полоса и акцент в цифрах, сцены на разборе нет (§3.8 ТЗ).
  const theme = resolveTopicTheme(result.topicSlug, result.topicThemeKey);
  const answeredAll = result.answeredCount >= result.questionCount;
  const abandoned = result.status === "ABANDONED";
  const heading = abandoned
    ? isDaily
      ? "Тест дня прерван"
      : "Тренировка прервана"
    : isDaily
      ? "Тест дня завершён"
      : "Тренировка завершена";

  // Ссылку выдаём только для завершённой тренировки: прерванная попытка
  // не даёт результата, которым стоит делиться.
  const share = abandoned
    ? null
    : {
        url: shareUrl(result.id, createShareToken(result.id, env.AUTH_SECRET), env.APP_URL),
        title: `${title} — ${result.percent}%`,
        text: shareMessage({
          title,
          correctCount: result.correctCount,
          questionCount: result.questionCount,
          percent: result.percent,
        }),
      };

  return (
    <div className="mx-auto max-w-3xl space-y-8" data-topic-theme={theme ?? undefined}>
      {theme ? <div className="topic-stripe" aria-hidden="true" /> : null}
      <div className="space-y-3">
        <p className="text-base font-semibold tracking-[0.02em] text-muted normal-case">{label}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>
        {abandoned ? (
          <p className="text-lg text-ink-soft">
            Ответы, которые вы успели дать, сохранены. Баллы за них остались.
          </p>
        ) : null}
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="text-5xl font-bold text-accent">{result.percent}%</p>
          <p className="text-xl font-semibold">
            {result.correctCount} из {result.questionCount} {questionWord(result.questionCount)}{" "}
            верно
          </p>
        </div>

        <dl className="grid gap-3 text-base sm:grid-cols-3">
          <div>
            <dt className="text-muted">Отвечено</dt>
            <dd className="text-lg font-semibold">
              {result.answeredCount} из {result.questionCount}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Баллы</dt>
            <dd className="text-lg font-semibold">+{result.xpEarned}</dd>
          </div>
          <div>
            <dt className="text-muted">Ошибки</dt>
            <dd className="text-lg font-semibold">{result.mistakes.length}</dd>
          </div>
        </dl>

        {isDaily && !abandoned ? (
          <p className="text-base text-ink-soft">
            Включая +{DAILY_BONUS_XP} баллов за завершение теста дня.
          </p>
        ) : null}

        {!answeredAll && !abandoned ? (
          <Alert variant="neutral" title="Не на все вопросы дан ответ">
            Можно вернуться и продолжить тренировку.
          </Alert>
        ) : null}
      </Card>

      {share ? <ShareResult url={share.url} title={share.title} text={share.text} /> : null}

      {result.topics.length > 1 ? (
        <section aria-labelledby="topics-title" className="space-y-3">
          <h2 id="topics-title" className="text-2xl font-bold">
            По темам
          </h2>
          <div className="space-y-2">
            {result.topics.map((topic) => (
              <div
                key={topic.title}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-surface px-4 py-3"
              >
                <span className="text-lg font-semibold">{topic.title}</span>
                <span className="text-base text-ink-soft">
                  {topic.correct} из {topic.total} верно
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="mistakes-title" className="space-y-4">
        <h2 id="mistakes-title" className="text-2xl font-bold">
          {result.mistakes.length > 0 ? "Что стоит повторить" : "Ошибок нет"}
        </h2>

        {result.mistakes.length === 0 ? (
          <Alert variant="success" title="Отличный результат">
            Все ответы верные. Можно выбрать другую тему или пройти эту ещё раз позже.
          </Alert>
        ) : (
          <div className="space-y-4">
            {result.mistakes.map((mistake) => (
              <Card key={mistake.questionId} className="space-y-3">
                <p className="text-base font-semibold tracking-[0.02em] text-muted normal-case">
                  {mistake.topic}
                </p>
                <h3 className="text-xl font-bold leading-snug">{mistake.question}</h3>
                <p className="text-base text-ink-soft">
                  <span className="font-semibold">Ваш ответ:</span>{" "}
                  {mistake.selectedAnswer ?? "ответа не было"}
                </p>
                <p className="text-base text-ink-soft">
                  <span className="font-semibold">Правильный ответ:</span> {mistake.correctAnswer}
                </p>
                <p className="text-base text-ink">{mistake.explanation}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {result.mistakes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Закрепить</h2>
          <p className="text-base text-ink-soft">
            Повторение соберёт вопросы, где были ошибки, и те, что пора освежить. Это короткая
            тренировка без спешки.
          </p>
          <ReviewButton />
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button href="/tests">Выбрать другой тест</Button>
        <Button href="/account" variant="secondary">
          Мои результаты
        </Button>
        <Button href="/" variant="quiet">
          На главную
        </Button>
      </div>
    </div>
  );
}
