"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

type PickerCategory = {
  id: string;
  title: string;
  topics: Array<{ id: string; title: string }>;
};

export function InterestPicker({
  categories,
  initialSelected,
  mode = "edit",
}: {
  categories: PickerCategory[];
  initialSelected: string[];
  mode?: "onboarding" | "edit";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(topicId: string) {
    setSaved(false);
    setSelected((current) =>
      current.includes(topicId)
        ? current.filter((id) => id !== topicId)
        : [...current, topicId],
    );
  }

  async function save(skipped = false) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/me/interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicIds: skipped ? [] : selected, skipped }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? "Не удалось сохранить выбор.");
      }

      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить выбор.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          {mode === "onboarding" ? "Что вам интересно?" : "Ваши интересы"}
        </h2>
        <p className="text-base text-ink-soft">
          Отметьте темы — они будут выше в рекомендациях. Выбор можно изменить в любой момент.
        </p>
      </div>

      <div className="space-y-5">
        {categories.map((category) => (
          <fieldset key={category.id} className="space-y-3">
            <legend className="text-lg font-bold text-ink">{category.title}</legend>
            <div className="flex flex-wrap gap-3">
              {category.topics.map((topic) => {
                const checked = selected.includes(topic.id);
                return (
                  <label
                    key={topic.id}
                    className={cn(
                      "inline-flex min-h-14 cursor-pointer items-center gap-3 rounded-control border-2 px-4 py-2 text-base font-semibold transition-colors",
                      checked
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-line-strong bg-surface text-ink hover:bg-accent-soft",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-6 w-6 shrink-0 accent-[var(--color-accent)]"
                      checked={checked}
                      onChange={() => toggle(topic.id)}
                    />
                    {topic.title}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {error ? (
        <Alert variant="error" title="Не сохранилось">
          {error}
        </Alert>
      ) : null}

      {saved ? (
        <Alert variant="success" title="Сохранено">
          Рекомендации на главной обновятся с учётом выбора.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void save(false)} disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
        {mode === "onboarding" ? (
          <Button type="button" variant="secondary" onClick={() => void save(true)} disabled={saving}>
            Пропустить
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
