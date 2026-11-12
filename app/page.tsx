import type { Metadata } from "next";

import { ReviewButton } from "@/components/attempts/ReviewButton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getHomeData } from "@/lib/stats/service";
import { RECOMMENDATION_REASONS, dayWord, questionWord } from "@/lib/ui/text";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Проверьте себя",
  description:
    "Короткие тесты по истории, кино, литературе и географии. Крупный текст, понятные объяснения и никакой спешки.",
};

const steps = [
  {
    title: "Выберите тему",
    text: "История, кино, литература, природа, наука и кругозор. Можно начать с короткой тренировки на 10 вопросов.",
  },
  {
    title: "Отвечайте без спешки",
    text: "Без таймера и автоперехода. После каждого ответа — короткое объяснение.",
  },
  {
    title: "Возвращайтесь к забытому",
    text: "Сайт подскажет, что пора повторить, и покажет, что вы уже освоили.",
  },
];

function GuestHome() {
  return (
    <div className="space-y-10">
      <section aria-labelledby="hero-title" className="space-y-6">
        <p className="text-base font-semibold tracking-wide text-accent uppercase">
          Тесты для спокойной проверки знаний
        </p>
        <h1 id="hero-title" className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Проверьте себя
        </h1>
        <p className="max-w-2xl text-xl text-ink-soft">
          Короткие тесты по истории, кино, литературе и географии. Крупный текст, понятные
          объяснения и никакой спешки.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button href="/tests" fullWidth className="sm:w-auto">
            Выбрать тест
          </Button>
          <Button href="/register" variant="secondary" fullWidth className="sm:w-auto">
            Зарегистрироваться
          </Button>
        </div>
        <p className="text-base text-muted">
          Каталог открыт без входа. Аккаунт нужен, чтобы сохранять прогресс и возвращаться к
          ошибкам.
        </p>
      </section>

      <section aria-labelledby="how-title" className="space-y-4">
        <h2 id="how-title" className="text-2xl font-bold">
          Как это работает
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <p className="text-base font-bold text-accent">Шаг {index + 1}</p>
              <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
              <p className="mt-2 text-base text-ink-soft">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <Alert variant="neutral" title="Бесплатно и без звонков">
        Для сохранения результатов нужна только почта. Мы не звоним и не присылаем СМС — только
        письмо для подтверждения адреса.
      </Alert>
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <GuestHome />;

  const data = await getHomeData(user.id);
  const { overview, continueCard, recommendations } = data;
  const numberFormat = new Intl.NumberFormat("ru-RU");
  const levelSpan = Math.max(1, overview.level.nextLevelXp - overview.level.currentLevelXp);
  const levelPercent = Math.min(
    100,
    Math.max(0, ((overview.level.xp - overview.level.currentLevelXp) / levelSpan) * 100),
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="hello-title" className="space-y-3">
        <h1 id="hello-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
          {user.name ? `Здравствуйте, ${user.name}` : "Здравствуйте"}
        </h1>
        <p className="max-w-2xl text-lg text-ink-soft">
          Продолжите с того места, где остановились, или начните новую тему.
        </p>
      </section>

      <section aria-labelledby="overview-title" className="space-y-4">
        <h2 id="overview-title" className="text-2xl font-bold">
          Ваш прогресс
        </h2>
        <Card className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xl font-bold">Уровень {overview.level.level}</p>
            <p className="text-base text-ink-soft">{numberFormat.format(overview.xp)} баллов</p>
          </div>
          <ProgressBar
            value={levelPercent}
            label={`До следующего уровня: ${numberFormat.format(overview.level.pointsToNext)} баллов`}
            tone="success"
          />

          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-base text-muted">Освоено вопросов</dt>
              <dd className="text-2xl font-bold">{overview.masteredQuestions}</dd>
            </div>
            <div>
              <dt className="text-base text-muted">Тренировок пройдено</dt>
              <dd className="text-2xl font-bold">{overview.completedAttempts}</dd>
            </div>
            <div>
              <dt className="text-base text-muted">Дней подряд</dt>
              <dd className="text-2xl font-bold">
                {overview.dailyStreak} {dayWord(overview.dailyStreak)}
              </dd>
            </div>
          </dl>
        </Card>
      </section>

      {continueCard ? (
        <section aria-labelledby="continue-title" className="space-y-4">
          <h2 id="continue-title" className="text-2xl font-bold">
            Продолжить
          </h2>
          <Card className="space-y-4">
            <div>
              <p className="text-xl font-bold">{continueCard.title}</p>
              <p className="text-base text-ink-soft">{continueCard.subtitle}</p>
            </div>
            <Button href={continueCard.href}>
              {continueCard.kind === "attempt" ? "Продолжить тренировку" : "Вернуться к теме"}
            </Button>
          </Card>
        </section>
      ) : null}

      {overview.dueCount > 0 ? (
        <section aria-labelledby="review-title" className="space-y-4">
          <h2 id="review-title" className="text-2xl font-bold">
            Пора повторить
          </h2>
          <Card className="space-y-4">
            <p className="text-lg">
              {overview.dueCount} {questionWord(overview.dueCount)} стоит освежить. Это короткая
              тренировка без спешки.
            </p>
            <ReviewButton label={`Повторить (${overview.dueCount})`} />
          </Card>
        </section>
      ) : null}

      {recommendations.length > 0 ? (
        <section aria-labelledby="recommendations-title" className="space-y-4">
          <h2 id="recommendations-title" className="text-2xl font-bold">
            Рекомендуем
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((topic) => (
              <Card key={topic.id} className="flex h-full flex-col justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-base font-semibold tracking-wide text-accent uppercase">
                    {RECOMMENDATION_REASONS[topic.reason] ?? "Стоит попробовать"}
                  </p>
                  <h3 className="text-xl font-bold leading-snug">{topic.title}</h3>
                  <p className="text-base text-muted">
                    {topic.categoryTitle} · {topic.questionCount} {questionWord(topic.questionCount)}
                  </p>
                  {topic.progress > 0 ? (
                    <p className="text-base text-ink-soft">
                      Освоено {Math.round(topic.progress)}%
                    </p>
                  ) : null}
                </div>
                <Button href={`/tests/${topic.slug}`} variant="secondary" fullWidth>
                  Открыть тему
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button href="/tests">Все тесты</Button>
        <Button href="/interests" variant="secondary">
          Мои интересы
        </Button>
        <Button href="/account" variant="secondary">
          Мои результаты
        </Button>
      </div>
    </div>
  );
}
