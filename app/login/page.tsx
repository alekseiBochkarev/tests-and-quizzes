import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { safeNext } from "@/lib/http/redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Войти",
  description: "Вход в аккаунт, чтобы сохранять результаты тестов.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "token_invalid":
      return "Ссылка недействительна или уже использована. Запросите новое письмо.";
    case "token_expired":
      return "Срок действия ссылки истёк. Запросите новое письмо.";
    default:
      return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = safeNext(first(params.next));

  const user = await getCurrentUser();
  if (user) redirect(next);

  const verified = first(params.verified) === "1";
  const reset = first(params.reset) === "1";
  const error = errorMessage(first(params.error));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Вход</h1>
        <p className="text-lg text-ink-soft">
          Войдите, чтобы продолжить тесты и увидеть свои результаты.
        </p>
      </div>

      {verified ? (
        <Alert variant="success" title="Почта подтверждена">
          Почта подтверждена, войдите.
        </Alert>
      ) : null}

      {reset ? (
        <Alert variant="success" title="Пароль изменён">
          Войдите с новым паролем.
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error" title="Ссылка не сработала">
          {error}
        </Alert>
      ) : null}

      <Card>
        <LoginForm next={next} />
      </Card>
    </div>
  );
}
