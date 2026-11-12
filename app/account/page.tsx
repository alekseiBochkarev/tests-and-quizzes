import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewButton } from "@/components/attempts/ReviewButton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { MIN_SEEN_FOR_WEAK, getAccountData } from "@/lib/stats/service";
import { dayWord, questionWord, topicLevelLabel } from "@/lib/ui/text";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Мои результаты",
  description: "Баллы, освоенные темы, история тренировок и то, что стоит повторить.",
};

function formatDate(value: Date | null, timeZone: string): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone }).format(value);
  } catch {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(value);
  }
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const data = await getAccountData(user.id);
  const { overview } = data;
  const numberFormat = new Intl.NumberFormat("ru-RU");

  const levelSpan = Math.max(1, overview.level.nextLevelXp - overview.level.currentLevelXp);
  const levelPercent = Math.min(
    100,
    Math.max(
      0,
      ((overview.level.xp - overview.level.currentLevelXp) / levelSpan) * 100,
    ),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Мои результаты</h1>
        <p className="text-lg text-ink-soft">
          Вы вошли как <span className="font-semibold text-ink">{user.email}</span>.
        </p>
      </div>

      <section aria-labelledby="summary-title" className="space-y-4">
        <h2 id="summary-title" className="text-2xl font-bold">
          Итоги
        </h2>

        <Card className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xl font-bold">Уровень {overview.level.level}</p>
            <p className="text-base text-ink-soft">
              {numberFormat.format(overview.xp)} баллов
            </p>
          </div>
          <ProgressBar
            value={levelPercent}
            label={`До следующего уровня: ${numberFormat.format(overview.level.pointsToNext)} баллов`}
            tone="success"
          />

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-base text-muted">Тренировок пройдено</dt>
              <dd className="text-2xl font-bold">{overview.completedAttempts}</dd>
            </div>
            <div>
              <dt className="text-base text-muted">Освоено вопросов</dt>
              <dd className="text-2xl font-bold">{overview.masteredQuestions}</dd>
            </div>
            <div>
              <dt className="text-base text-muted">Точность ответов</dt>
              <dd className="text-2xl font-bold">
                {data.showAccuracy ? `${overview.accuracy}%` : "Мало данных"}
              </dd>
              {!data.showAccuracy ? (
                <p className="text-base text-muted">
                  Покажем, когда ответите хотя бы на 10 вопросов.
                </p>
              ) : null}
            </div>
            <div>
              <dt className="text-base text-muted">Дней подряд</dt>
              <dd className="text-2xl font-bold">
                {overview.dailyStreak} {dayWord(overview.dailyStreak)}
              </dd>
              <p className="text-base text-muted">
                Лучшая серия: {overview.longestStreak} {dayWord(overview.longestStreak)}
              </p>
            </div>
          </dl>
        </Card>
      </section>

      <section aria-labelledby="review-title" className="space-y-4">
        <h2 id="review-title" className="text-2xl font-bold">
          Что стоит повторить
        </h2>

        {overview.dueCount > 0 ? (
          <Card className="space-y-4">
            <p className="text-lg text-ink">
              Пора освежить {overview.dueCount} {questionWord(overview.dueCount)}. Это займёт
              несколько минут.
            </p>
            <ReviewButton label={`Повторить (${overview.dueCount})`} />
          </Card>
        ) : (
          <Alert variant="success" title="Повторять пока нечего">
            Ошибок в очереди нет. Можно выбрать новую тему в каталоге.
          </Alert>
        )}

        {data.weakTopics.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xl font-bold">Темы, где есть ошибки</h3>
            <ul className="space-y-3">
              {data.weakTopics.map((topic) => (
                <li key={topic.id}>
                  <Card className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/tests/${topic.slug}`}
                        className="text-lg font-bold underline-offset-4 hover:text-accent hover:underline"
                      >
                        {topic.title}
                      </Link>
                      <span className="text-base text-ink-soft">
                        точность {Math.round(topic.accuracy)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={topic.progress}
                      label={`Освоено ${Math.round(topic.progress)}%`}
                      tone="success"
                    />
                    <p className="text-base text-muted">
                      Изучено {topic.seenQuestions} из {topic.totalQuestions} вопросов
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="learned-title" className="space-y-4">
        <h2 id="learned-title" className="text-2xl font-bold">
          Что вы уже знаете
        </h2>

        {data.learnedTopics.length === 0 ? (
          <Alert variant="neutral" title="Пока нет освоенных тем">
            Освоенными считаются вопросы, которые вы уверенно отвечаете несколько раз. Начните с
            любой темы в{" "}
            <Link href="/tests" className="font-semibold underline underline-offset-4">
              каталоге
            </Link>
            .
          </Alert>
        ) : (
          <ul className="space-y-2">
            {data.learnedTopics.map((topic) => (
              <li
                key={topic.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-surface px-4 py-3"
              >
                <div>
                  <Link
                    href={`/tests/${topic.slug}`}
                    className="text-lg font-semibold underline-offset-4 hover:text-accent hover:underline"
                  >
                    {topic.title}
                  </Link>
                  <p className="text-base text-muted">{topic.categoryTitle}</p>
                </div>
                <p className="text-base text-ink-soft">
                  Освоено {topic.masteredQuestions} из {topic.totalQuestions}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="topics-title" className="space-y-4">
        <h2 id="topics-title" className="text-2xl font-bold">
          Прогресс по темам
        </h2>

        {data.topics.length === 0 ? (
          <Alert variant="neutral" title="Прогресс появится после первой тренировки">
            Пройдите любой тест — здесь появятся темы и проценты освоения.
          </Alert>
        ) : (
          <div className="space-y-3">
            {data.topics.map((topic) => (
              <Card key={topic.id} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/tests/${topic.slug}`}
                    className="text-lg font-bold underline-offset-4 hover:text-accent hover:underline"
                  >
                    {topic.title}
                  </Link>
                  <span className="text-base text-muted">{topicLevelLabel(topic.level)}</span>
                </div>
                <ProgressBar
                  value={topic.progress}
                  label={`Освоено ${Math.round(topic.progress)}%`}
                  tone="success"
                />
                <p className="text-base text-muted">
                  Изучено {topic.seenQuestions} из {topic.totalQuestions} · освоено{" "}
                  {topic.masteredQuestions}
                  {topic.seenQuestions >= MIN_SEEN_FOR_WEAK ? (
                    <> · точность {Math.round(topic.accuracy)}%</>
                  ) : null}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="history-title" className="space-y-4">
        <h2 id="history-title" className="text-2xl font-bold">
          Последние тренировки
        </h2>

        {data.history.length === 0 ? (
          <Alert variant="neutral" title="История пуста">
            Здесь появятся завершённые тренировки с результатами.
          </Alert>
        ) : (
          <ul className="space-y-2">
            {data.history.map((attempt) => (
              <li
                key={attempt.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-surface px-4 py-3"
              >
                <div>
                  <Link
                    href={`/attempts/${attempt.id}/result`}
                    className="text-lg font-semibold underline-offset-4 hover:text-accent hover:underline"
                  >
                    {attempt.title}
                  </Link>
                  <p className="text-base text-muted">
                    {formatDate(attempt.finishedAt, user.timezone)}
                  </p>
                </div>
                <p className="text-base text-ink-soft">
                  {attempt.correctCount} из {attempt.questionCount} · {attempt.percent}%
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button href="/tests">Выбрать тест</Button>
        <form action="/api/v1/auth/logout" method="post">
          <Button type="submit" variant="secondary">
            Выйти
          </Button>
        </form>
        <form action="/api/v1/auth/logout-all" method="post">
          <Button type="submit" variant="quiet">
            Выйти на всех устройствах
          </Button>
        </form>
      </div>
    </div>
  );
}
