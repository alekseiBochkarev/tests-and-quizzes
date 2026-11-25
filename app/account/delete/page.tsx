import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Удаление аккаунта",
  description: "Как удалить аккаунт и что произойдёт с результатами и историей.",
};

export default async function DeleteAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/delete");

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Удаление аккаунта</h1>
        <p className="text-lg text-ink-soft">
          Вы вошли как <span className="font-semibold text-ink">{user.email}</span>.
        </p>
      </header>

      <Alert variant="neutral" title="Что произойдёт">
        <ul className="list-disc space-y-2 pl-5">
          <li>Почта, имя и пароль будут удалены.</li>
          <li>Войти в этот аккаунт больше не получится.</li>
          <li>
            История и прогресс останутся в обезличенном виде — без вашего имени и почты.
          </li>
          <li>Восстановить аккаунт нельзя.</li>
        </ul>
      </Alert>

      <p className="text-base text-ink-soft">
        Если хотите сохранить свои данные, сначала{" "}
        <Link
          href="/account"
          className="font-semibold text-accent underline underline-offset-4"
        >
          скачайте их на странице «Мои результаты»
        </Link>
        . Там же можно вернуться назад без удаления.
      </p>

      <Card>
        <DeleteAccountForm />
      </Card>

      <p>
        <Link
          href="/account"
          className="text-lg font-semibold text-accent underline underline-offset-4"
        >
          Вернуться в «Мои результаты»
        </Link>
      </p>
    </article>
  );
}
