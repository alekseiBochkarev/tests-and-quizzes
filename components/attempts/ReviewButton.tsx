"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type ApiErrorBody = {
  error?: { message?: string };
};

/**
 * Запуск повторения ошибок с готового результата.
 * Если повторять нечего, сервер вернёт понятное сообщение — показываем его.
 */
export function ReviewButton({
  topicId,
  label = "Повторить ошибки",
  variant = "primary",
}: {
  topicId?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(topicId ? { topicId } : {}),
          count: 10,
          mode: "REVIEW",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(payload?.error?.message ?? "Не удалось начать повторение.");
      }

      const payload = (await response.json()) as { data: { attemptId: string } };
      router.push(`/attempts/${payload.data.attemptId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось начать повторение.");
      setStarting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant={variant} onClick={() => void start()} disabled={starting}>
        {starting ? "Начинаем…" : label}
      </Button>
      {error ? (
        <Alert variant="error" title="Повторение не началось">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
