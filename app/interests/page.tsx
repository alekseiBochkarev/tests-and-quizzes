import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InterestPicker } from "@/components/content/InterestPicker";
import { Alert } from "@/components/ui/Alert";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getCatalog } from "@/lib/content/catalog";
import { getUserInterests } from "@/lib/interests/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Интересы",
  description: "Выберите темы, которые вам интересны: они будут выше в рекомендациях.",
};

export default async function InterestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/interests");

  const [catalog, interests] = await Promise.all([getCatalog(user.id), getUserInterests(user.id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Интересы</h1>
        <p className="max-w-2xl text-lg text-ink-soft">
          Отметьте темы, которые вам близки. Они будут чаще появляться в рекомендациях, но
          остальные темы тоже останутся доступны.
        </p>
      </div>

      {interests.topicIds.length === 0 ? (
        <Alert variant="neutral" title="Пока ничего не выбрано">
          Можно выбрать несколько тем или оставить как есть — рекомендации будут строиться по
          вашим тренировкам.
        </Alert>
      ) : null}

      {catalog.length === 0 ? (
        <Alert variant="neutral" title="Темы пока не опубликованы">
          Как только появятся темы, здесь можно будет выбрать интересы.
        </Alert>
      ) : (
        <InterestPicker
          mode="edit"
          categories={catalog.map((category) => ({
            id: category.id,
            title: category.title,
            topics: category.topics.map((topic) => ({ id: topic.id, title: topic.title })),
          }))}
          initialSelected={interests.topicIds}
        />
      )}
    </div>
  );
}
