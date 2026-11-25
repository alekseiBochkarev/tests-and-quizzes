"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { PasswordField } from "@/components/auth/PasswordField";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { isDeletionConfirmation } from "@/lib/account/rules";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: { fields?: Record<string, string> };
  };
};

/**
 * Подтверждение удаления аккаунта (ACC-01).
 *
 * Два барьера: текущий пароль и слово «УДАЛИТЬ». Это не тёмный паттерн —
 * рядом объяснено, что произойдёт и что данные можно сначала скачать.
 */
export function DeleteAccountForm() {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setFields({});
    setFormError(null);

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    const confirmed = data.get("confirmed") === "on";

    const nextFields: Record<string, string> = {};
    if (!password) {
      nextFields.password = "Введите текущий пароль.";
    }
    if (!isDeletionConfirmation(confirmation)) {
      nextFields.confirmation = "Введите слово УДАЛИТЬ, чтобы подтвердить удаление.";
    }

    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields);
      return;
    }

    if (!confirmed) {
      setFormError("Отметьте, что понимаете: аккаунт нельзя восстановить.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/v1/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });

      if (response.status === 204) {
        router.push("/?account=deleted");
        router.refresh();
        return;
      }

      if (response.status === 401) {
        setFormError("Сессия истекла. Войдите снова и повторите удаление.");
        return;
      }

      let payload: ApiErrorBody = {};
      try {
        payload = (await response.json()) as ApiErrorBody;
      } catch {
        // Ниже покажем общий текст.
      }

      setFields(payload.error?.details?.fields ?? {});
      setFormError(payload.error?.message ?? "Не удалось удалить аккаунт. Попробуйте ещё раз.");
    } catch {
      setFormError("Нет связи с сайтом. Проверьте интернет и попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="error" title="Аккаунт не удалён">
          {formError}
        </Alert>
      ) : null}

      <PasswordField
        id="delete-account-password"
        name="password"
        label="Текущий пароль"
        autoComplete="current-password"
        hint="Пароль нужен, чтобы удаление не мог сделать кто-то другой с вашего устройства."
        error={fields.password}
        required
      />

      <Field
        id="delete-account-confirmation"
        name="confirmation"
        label="Введите слово УДАЛИТЬ"
        autoComplete="off"
        hint="Заглавными или строчными буквами — как удобно. Это подтверждение, что вы всё обдумали."
        error={fields.confirmation}
        required
      />

      <label className="flex min-h-12 cursor-pointer items-start gap-3 text-base leading-relaxed">
        <input
          type="checkbox"
          name="confirmed"
          className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-danger)]"
        />
        <span>
          Я понимаю, что аккаунт нельзя восстановить, а прогресс и история больше не будут
          связаны с моим именем и почтой.
        </span>
      </label>

      <Button type="submit" variant="danger" fullWidth disabled={submitting}>
        {submitting ? "Удаляем…" : "Удалить аккаунт навсегда"}
      </Button>
    </form>
  );
}
