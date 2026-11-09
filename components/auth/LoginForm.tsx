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
    details?: {
      fields?: Record<string, string>;
      canResend?: boolean;
      retryAfterSec?: number;
    };
  };
};

async function readError(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return {};
  }
}

export function LoginForm({ next }: { next: string }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [lastEmail, setLastEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setResendMessage(null);
    setCanResend(false);
    setFields({});

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setLastEmail(email);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        window.location.assign(next);
        return;
      }

      const payload = await readError(response);
      setFields(payload.error?.details?.fields ?? {});

      if (payload.error?.code === "email_not_verified") {
        setFormError("Почта ещё не подтверждена. Откройте письмо и нажмите «Подтвердить почту».");
        setCanResend(true);
        return;
      }

      if (payload.error?.code === "account_locked") {
        const minutes = Math.max(
          1,
          Math.ceil((payload.error.details?.retryAfterSec ?? 900) / 60),
        );
        setFormError(
          `Вход временно заблокирован после нескольких неудачных попыток. Попробуйте снова примерно через ${minutes} мин.`,
        );
        return;
      }

      setFormError(payload.error?.message ?? "Не удалось войти. Попробуйте ещё раз.");
    } catch {
      setFormError("Нет связи с сайтом. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!lastEmail) return;
    setResending(true);
    setResendMessage(null);

    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lastEmail }),
      });

      if (response.ok) {
        setResendMessage("Если адрес зарегистрирован, новое письмо отправлено. Проверьте почту.");
      } else {
        const payload = await readError(response);
        setResendMessage(payload.error?.message ?? "Не удалось отправить письмо. Попробуйте позже.");
      }
    } catch {
      setResendMessage("Нет связи с сайтом. Попробуйте ещё раз.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="error" title="Не удалось войти">
          {formError}
          {canResend ? (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? "Отправляем…" : "Отправить письмо ещё раз"}
              </Button>
            </div>
          ) : null}
        </Alert>
      ) : null}

      {resendMessage ? <Alert variant="neutral" title="Письмо">{resendMessage}</Alert> : null}

      <Field
        id="login-email"
        name="email"
        label="Адрес почты"
        type="email"
        inputMode="email"
        autoComplete="email"
        error={fields.email}
        required
      />

      <PasswordField
        id="login-password"
        name="password"
        label="Пароль"
        autoComplete="current-password"
        error={fields.password}
        required
      />

      <p>
        <Link href="/forgot-password" className="text-lg font-semibold text-accent underline">
          Забыли пароль?
        </Link>
      </p>

      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "Входим…" : "Войти"}
      </Button>

      <p className="text-base text-ink-soft">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-semibold text-accent underline">
          Сохранить результаты
        </Link>
      </p>
    </form>
  );
}
