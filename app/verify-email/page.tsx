import type { Metadata } from "next";
import Link from "next/link";

import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Подтверждение почты",
  description: "Подтвердите адрес почты, чтобы сохранять результаты тестов.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "token_invalid":
      return "Ссылка недействительна или уже использована. Можно запросить новое письмо.";
    case "token_expired":
      return "Срок действия ссылки истёк. Запросите новое письмо — это займёт меньше минуты.";
    default:
      return null;
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const token = first(params.token)?.trim() ?? "";
  const error = errorMessage(first(params.error));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Подтверждение почты</h1>
        <p className="text-lg text-ink-soft">
          Остался один шаг: подтвердите адрес, чтобы сохранять результаты тестов.
        </p>
      </div>

      {error ? (
        <Alert variant="error" title="Ссылка не сработала">
          {error}
        </Alert>
      ) : null}

      {token ? (
        <Card>
          <p className="text-base text-ink-soft">
            Нажмите кнопку ниже. Страница не подтверждает почту сама по себе — это защищает ссылку
            от случайного открытия почтовой программой.
          </p>
          <form action="/api/v1/auth/verify-email" method="post" className="mt-5">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" fullWidth>
              Подтвердить почту
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-base text-ink-soft">
            В ссылке нет токена. Откройте письмо ещё раз или запросите новое ниже.
          </p>
          <p className="mt-4">
            <Link href="/login" className="text-lg font-semibold text-accent underline">
              Перейти ко входу
            </Link>
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold">Письмо не пришло?</h2>
        <p className="mt-2 text-base text-ink-soft">
          Проверьте папку «Спам». Или отправьте письмо ещё раз — адрес можно указать ниже.
        </p>
        <div className="mt-4">
          <ResendVerificationForm />
        </div>
      </Card>
    </div>
  );
}
