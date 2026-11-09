"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

/** Отдельная кнопка повторной отправки письма на /verify-email. */
export function ResendVerificationForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");

    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage("Если адрес зарегистрирован и ещё не подтверждён, мы отправили новое письмо.");
        return;
      }

      let text = "Не удалось отправить письмо. Попробуйте позже.";
      try {
        const payload = (await response.json()) as { error?: { message?: string } };
        text = payload.error?.message ?? text;
      } catch {
        // оставляем общий текст
      }
      setError(text);
    } catch {
      setError("Нет связи с сайтом. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {message ? (
        <Alert variant="success" title="Письмо отправлено">
          {message}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="error" title="Не удалось отправить">
          {error}
        </Alert>
      ) : null}

      <Field
        id="resend-email"
        name="email"
        label="Адрес почты"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={defaultEmail}
        hint="На этот адрес придёт новое письмо со ссылкой."
        required
      />

      <Button type="submit" variant="secondary" disabled={submitting}>
        {submitting ? "Отправляем…" : "Отправить письмо ещё раз"}
      </Button>
    </form>
  );
}
