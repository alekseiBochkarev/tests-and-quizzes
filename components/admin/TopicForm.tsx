"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { CONTENT_STATUSES, CONTENT_STATUS_LABELS } from "@/lib/admin/contentLabels";
import { requestAdminApi } from "@/lib/admin/client";
import { slugify } from "@/lib/admin/slug";

export type TopicFormValues = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  order: number;
  status: string;
  categoryId: string;
};

type CategoryOption = { id: string; title: string };

function Labeled({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-lg font-semibold text-ink">
        {label}
      </label>

      {hint ? (
        <p id={`${id}-hint`} className="text-base text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-base font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Создание и редактирование темы.
 *
 * Адрес темы подставляется из названия, пока редактор не изменил его вручную:
 * это снимает необходимость знать латиницу и правила slug.
 */
export function TopicForm({
  categories,
  topic,
}: {
  categories: CategoryOption[];
  topic?: TopicFormValues;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [slug, setSlug] = useState(topic?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(topic));
  const [categoryId, setCategoryId] = useState(topic?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const [coverUrl, setCoverUrl] = useState(topic?.coverUrl ?? "");
  const [order, setOrder] = useState(topic ? String(topic.order) : "");
  const [status, setStatus] = useState(topic?.status ?? "DRAFT");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);
    setFields({});

    const payload = {
      categoryId,
      title,
      slug: slug || slugify(title),
      description,
      coverUrl,
      ...(order.trim() ? { order: Number(order) } : {}),
      status,
    };

    const result = topic
      ? await requestAdminApi<{ topic: { id: string } }>(`/api/v1/admin/topics/${topic.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await requestAdminApi<{ topic: { id: string } }>("/api/v1/admin/topics", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    if (!result.ok) {
      setFormError(result.error.message);
      setFields(result.error.fields);
      setSubmitting(false);
      return;
    }

    router.push(`/admin/topics/${result.data.topic.id}?saved=1`);
    router.refresh();
  }

  const backHref = topic ? `/admin/topics/${topic.id}` : "/admin/topics";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {formError ? (
        <Alert variant="error" title="Не удалось сохранить">
          {formError}
        </Alert>
      ) : null}

      <Card className="space-y-5">
        <Field
          id="topic-title"
          label="Название темы"
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          hint="Как тему увидят пользователи. Например: «Советское кино»."
          error={fields.title}
          maxLength={120}
          required
        />

        <Field
          id="topic-slug"
          label="Адрес темы"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          hint="Латинские буквы, цифры и дефис. Подставляется из названия автоматически."
          error={fields.slug}
          maxLength={80}
          required
        />

        <Labeled id="topic-category" label="Раздел" error={fields.categoryId}>
          <Select
            id="topic-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </Select>
        </Labeled>

        <Labeled
          id="topic-description"
          label="Описание"
          hint="Одно-два предложения: о чём тема и почему её интересно проходить."
          error={fields.description}
        >
          <Textarea
            id="topic-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
        </Labeled>

        <Field
          id="topic-cover"
          label="Ссылка на обложку"
          value={coverUrl}
          onChange={(event) => setCoverUrl(event.target.value)}
          hint="Необязательно. Адрес картинки, начинающийся с http:// или https://."
          error={fields.coverUrl}
          inputMode="url"
        />

        <Field
          id="topic-order"
          label="Порядок в разделе"
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          hint="Необязательно. Меньшее число показывается раньше."
          error={fields.order}
          inputMode="numeric"
        />

        <Labeled
          id="topic-status"
          label="Статус"
          hint="Черновик виден только в админке. Опубликованная тема появляется в каталоге, если в ней есть опубликованные вопросы."
          error={fields.status}
        >
          <Select
            id="topic-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {CONTENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {CONTENT_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </Labeled>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Сохраняем…" : "Сохранить тему"}
        </Button>
        <Button href={backHref} variant="secondary">
          Отмена
        </Button>
      </div>

      <p className="text-base text-ink-soft">
        После сохранения вернитесь к теме: там же добавляются вопросы.{" "}
        <Link href="/admin/topics" className="font-semibold text-accent underline underline-offset-4">
          Все темы
        </Link>
      </p>
    </form>
  );
}
