import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новый пароль",
  description: "Задайте новый пароль для входа в аккаунт.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Новый пароль</h1>
        <p className="text-lg text-ink-soft">
          Придумайте новый пароль. Все прежние сессии после этого завершатся.
        </p>
      </div>

      {token ? (
        <Card>
          <ResetPasswordForm token={token} />
        </Card>
      ) : (
        <Card>
          <Alert variant="error" title="Ссылка неполная">
            В ссылке нет токена. Запросите письмо для смены пароля ещё раз.
          </Alert>
          <p className="mt-4">
            <Link href="/forgot-password" className="text-lg font-semibold text-accent underline">
              Запросить письмо
            </Link>
          </p>
        </Card>
      )}
    </div>
  );
}
