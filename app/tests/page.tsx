import type { Metadata } from "next";

import { InterestPicker } from "@/components/content/InterestPicker";
import { TopicCard } from "@/components/content/TopicCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getCatalog } from "@/lib/content/catalog";
import { getUserInterests } from "@/lib/interests/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Тесты",
  description: "Выберите раздел и тему: история, кино, литература, природа, наука и кругозор.",
};

export default async function TestsPage() {
  const user = await getCurrentUser();
  const [catalog, interests] = await Promise.all([
    getCatalog(user?.id ?? null),
    user ? getUserInterests(user.id) : Promise.resolve(null),
  ]);

  const showOnboarding = Boolean(user && interests && interests.setAt === null);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Тесты</h1>
        <p className="max-w-3xl text-lg text-ink-soft">
          Выберите раздел, затем тему. В каждой тренировке — понятные вопросы с объяснениями,
          без таймера и спешки.
        </p>
      </div>

      {!user ? (
        <Alert variant="neutral" title="Можно смотреть без входа">
          Каталог открыт всем. Чтобы начать тренировку и сохранить прогресс, понадобится аккаунт —{" "}
          <a href="/register" className="font-semibold text-accent underline underline-offset-4">
            зарегистрируйтесь
          </a>{" "}
          или{" "}
          <a href="/login" className="font-semibold text-accent underline underline-offset-4">
            войдите
          </a>
          .
        </Alert>
      ) : null}

      {showOnboarding && catalog.length > 0 ? (
        <InterestPicker
          mode="onboarding"
          categories={catalog.map((category) => ({
            id: category.id,
            title: category.title,
            topics: category.topics.map((topic) => ({ id: topic.id, title: topic.title })),
          }))}
          initialSelected={interests?.topicIds ?? []}
        />
      ) : null}

      {user ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button href="/account" variant="secondary">
            Мои результаты
          </Button>
          <Button href="/interests" variant="quiet">
            Изменить интересы
          </Button>
        </div>
      ) : null}

      {catalog.length === 0 ? (
        <Alert variant="neutral" title="Каталог готовится">
          Темы пока не опубликованы. Загляните позже — мы добавляем новые разделы.
        </Alert>
      ) : (
        <div className="space-y-10">
          {catalog.map((category) => (
            <section key={category.id} aria-labelledby={`category-${category.slug}`} className="space-y-4">
              <div className="space-y-1">
                <h2 id={`category-${category.slug}`} className="text-2xl font-bold">
                  {category.title}
                </h2>
                {category.description ? (
                  <p className="max-w-3xl text-base text-ink-soft">{category.description}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {category.topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    href={`/tests/${topic.slug}`}
                    title={topic.title}
                    description={topic.description}
                    questionCount={topic.questionCount}
                    progress={topic.progress}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
