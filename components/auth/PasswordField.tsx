"use client";

import { useId, useState } from "react";

import { Field } from "@/components/ui/Field";

/**
 * Поле пароля с крупной подписью «Показать пароль».
 * Показ пароля — осознанная помощь для аудитории 55+: меньше ошибок ввода.
 */
export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  hint,
  error,
  required,
}: {
  id: string;
  label: string;
  name: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const checkboxId = useId();

  return (
    <div className="space-y-3">
      <Field
        id={id}
        name={name}
        label={label}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        hint={hint}
        error={error}
        required={required}
      />
      <label
        htmlFor={checkboxId}
        className="inline-flex min-h-12 cursor-pointer items-center gap-3 text-base text-ink-soft"
      >
        <input
          id={checkboxId}
          type="checkbox"
          className="h-6 w-6 accent-[var(--color-accent)]"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
        />
        Показать пароль
      </label>
    </div>
  );
}
