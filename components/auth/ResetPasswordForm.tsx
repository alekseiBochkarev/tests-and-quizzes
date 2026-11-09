"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

import { PasswordField } from "@/components/auth/PasswordField";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFields({});

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const repeated = String(data.get("passwordRepeat") ?? "");

    if (password !== repeated) {
      setFields({ passwordRepeat: "Пароли не совпадают. Введите одинаковый пароль в оба поля." });
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (response.ok) {
        setDone(true);
        return;
      }

      try {
        const payload = (await response.json()) as {
          error?: { message?: string; details?: { fields?: Record<string, string> } };
        };
        setFields(payload.error?.details?.fields ?? {});
        setFormError(payload.error?.message ?? "Не удалось сменить пароль. Попробуйте ещё раз.");
      } catch {
        setFormError("Не удалось сменить пароль. Попробуйте ещё раз.");
      }
    } catch {
      setFormError("Нет связи с сайтом. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Пароль изменён">
          Теперь войдите с новым паролем. Все прежние сессии завершены.
        </Alert>
        <p>
          <Link href="/login?reset=1" className="text-lg font-semibold text-accent underline">
            Перейти ко входу
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="error" title="Не удалось сменить пароль">
          {formError}
        </Alert>
      ) : null}

      <PasswordField
        id="reset-password"
        name="password"
        label="Новый пароль"
        autoComplete="new-password"
        hint="Не короче 8 символов. Можно использовать фразу из нескольких слов."
        error={fields.password}
        required
      />

      <PasswordField
        id="reset-password-repeat"
        name="passwordRepeat"
        label="Повторите новый пароль"
        autoComplete="new-password"
        error={fields.passwordRepeat}
        required
      />

      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "Сохраняем…" : "Сохранить новый пароль"}
      </Button>
    </form>
  );
}
