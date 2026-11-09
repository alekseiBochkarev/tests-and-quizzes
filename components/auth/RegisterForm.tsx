"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

import { PasswordField } from "@/components/auth/PasswordField";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: { fields?: Record<string, string> };
  };
};

async function readError(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return {};
  }
}

export function RegisterForm() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFields({});

    const data = new FormData(event.currentTarget);
    const body = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      acceptedTerms: data.get("acceptedTerms") === "on",
      acceptedPrivacy: data.get("acceptedPrivacy") === "on",
      marketingOptIn: data.get("marketingOptIn") === "on",
    };

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSent(true);
        return;
      }

      const payload = await readError(response);
      setFields(payload.error?.details?.fields ?? {});
      setFormError(payload.error?.message ?? "Не удалось отправить письмо. Попробуйте ещё раз.");
    } catch {
      setFormError("Нет связи с сайтом. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <Alert variant="success" title="Проверьте почту">
          Мы отправили письмо со ссылкой для подтверждения адреса. Откройте его и нажмите
          «Подтвердить почту». Если письма нет — загляните в папку «Спам».
        </Alert>
        <p className="text-base text-ink-soft">
          Уже подтвердили почту?{" "}
          <Link href="/login" className="font-semibold text-accent underline">
            Войти
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="error" title="Не удалось сохранить">
          {formError}
        </Alert>
      ) : null}

      <Field
        id="register-email"
        name="email"
        label="Адрес почты"
        type="email"
        inputMode="email"
        autoComplete="email"
        hint="На этот адрес придёт письмо для подтверждения."
        error={fields.email}
        required
      />

      <PasswordField
        id="register-password"
        name="password"
        label="Пароль"
        autoComplete="new-password"
        hint="Не короче 8 символов. Можно использовать фразу из нескольких слов."
        error={fields.password}
        required
      />

      <fieldset className="space-y-4 rounded-control border border-line bg-surface p-4">
        <legend className="px-1 text-lg font-semibold">Согласия</legend>

        <label className="flex min-h-12 cursor-pointer items-start gap-3 text-base leading-relaxed">
          <input
            type="checkbox"
            name="acceptedTerms"
            className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-accent)]"
            aria-describedby={fields.acceptedTerms ? "register-terms-error" : undefined}
            aria-invalid={fields.acceptedTerms ? true : undefined}
            required
          />
          <span>
            Я принимаю{" "}
            <Link
              href="/legal/terms"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent underline"
            >
              пользовательское соглашение
            </Link>
            .
          </span>
        </label>
        {fields.acceptedTerms ? (
          <p id="register-terms-error" role="alert" className="text-base font-semibold text-danger">
            {fields.acceptedTerms}
          </p>
        ) : null}

        <label className="flex min-h-12 cursor-pointer items-start gap-3 text-base leading-relaxed">
          <input
            type="checkbox"
            name="acceptedPrivacy"
            className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-accent)]"
            aria-describedby={fields.acceptedPrivacy ? "register-privacy-error" : undefined}
            aria-invalid={fields.acceptedPrivacy ? true : undefined}
            required
          />
          <span>
            Я согласен на обработку персональных данных согласно{" "}
            <Link
              href="/legal/privacy"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent underline"
            >
              политике конфиденциальности
            </Link>
            .
          </span>
        </label>
        {fields.acceptedPrivacy ? (
          <p
            id="register-privacy-error"
            role="alert"
            className="text-base font-semibold text-danger"
          >
            {fields.acceptedPrivacy}
          </p>
        ) : null}

        <label className="flex min-h-12 cursor-pointer items-start gap-3 text-base leading-relaxed">
          <input
            type="checkbox"
            name="marketingOptIn"
            className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-accent)]"
          />
          <span>Хочу получать письма о новых тестах. Можно отказаться в любой момент.</span>
        </label>
      </fieldset>

      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "Отправляем письмо…" : "Сохранить результаты"}
      </Button>

      <p className="text-base text-ink-soft">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-semibold text-accent underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
