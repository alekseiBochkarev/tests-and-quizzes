"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { requestAdminApi } from "@/lib/admin/client";

/**
 * «Удаление» в контентной админке — перевод в архив.
 *
 * Физически ничего не удаляем: попытки, ответы и прогресс пользователей
 * ссылаются на вопрос, поэтому запись должна остаться. Подтверждение
 * объясняет это редактору до нажатия.
 */
export function ArchiveButton({
  endpoint,
  label,
  confirmMessage,
  redirectTo,
}: {
  endpoint: string;
  label: string;
  confirmMessage: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (busy) return;
    if (!window.confirm(confirmMessage)) return;

    setBusy(true);
    setError(null);

    const result = await requestAdminApi<unknown>(endpoint, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error.message);
      setBusy(false);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" onClick={handleClick} disabled={busy}>
        {busy ? "Убираем в архив…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-base font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
