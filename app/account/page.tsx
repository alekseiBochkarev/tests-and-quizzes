import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Мои результаты",
  description: "Здесь появятся результаты тестов и освоенные темы.",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Мои результаты</h1>
        <p className="text-lg text-ink-soft">
          Вы вошли как <span className="font-semibold text-ink">{user.email}</span>.
        </p>
      </div>

      <Card>
        <h2 className="text-xl font-bold">Здесь появятся ваши результаты</h2>
        <p className="mt-2 text-base leading-relaxed text-ink-soft">
          Здесь появятся ваши результаты и освоенные темы. Пока каталог тестов готовится — можно
          спокойно посмотреть, как устроен сайт.
        </p>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
