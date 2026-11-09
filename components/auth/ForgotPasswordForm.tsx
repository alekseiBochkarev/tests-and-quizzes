"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function ForgotPasswordForm() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFields({});

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSent(true);
        return;
      }

      try {
        const payload = (await response.json()) as {
          error?: { message?: string; details?: { fields?: Record<string, string> } };
        };
        setFields(payload.error?.details?.fields ?? {});
        setFormError(payload.error?.message ?? "Не удалось отправить письмо. Попробуйте позже.");
      } catch {
        setFormError("Не удалось отправить письмо. Попробуйте позже.");
      }
    } catch {
      setFormError("Нет связи с сайтом. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Alert variant="success" title="Проверьте почту">
        Если такой адрес у нас есть, мы отправили письмо со ссылкой для смены пароля. Ссылка
        действует один час.
      </Alert>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="error" title="Не удалось отправить">
          {formError}
        </Alert>
      ) : null}

      <Field
        id="forgot-email"
        name="email"
        label="Адрес почты"
        type="email"
        inputMode="email"
        autoComplete="email"
        hint="Укажите адрес, на который вы регистрировались."
        error={fields.email}
        required
      />

      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "Отправляем…" : "Отправить ссылку"}
      </Button>
    </form>
  );
}
