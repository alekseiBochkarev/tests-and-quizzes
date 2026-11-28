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

export type QuestionFormValues = {
  id: string;
  topicId: string;
  topicTitle: string;
  text: string;
  explanation: string;
  imageUrl: string | null;
  imageLicense: string | null;
  imageSource: string | null;
  imageAlt: string | null;
  difficulty: number;
  status: string;
  version: number;
  options: { text: string; isCorrect: boolean }[];
};

function Labeled({
  id,
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Если задан, подпись связывается с конкретным полем. */
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="block text-lg font-semibold text-ink">
          {label}
        </label>
      ) : (
        <p className="text-lg font-semibold text-ink">{label}</p>
      )}
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

/** Четыре варианта, один правильный. Форма общая для создания и правки. */
export function QuestionForm({
  topicId,
  topicTitle,
  question,
}: {
  topicId: string;
  topicTitle: string;
  question?: QuestionFormValues;
}) {
  const router = useRouter();

  const initialOptions = [0, 1, 2, 3].map((index) => question?.options[index]?.text ?? "");
  const [text, setText] = useState(question?.text ?? "");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [correctIndex, setCorrectIndex] = useState(() => {
    const found = question?.options.findIndex((option) => option.isCorrect) ?? -1;
    return found >= 0 ? found : 0;
  });
  const [difficulty, setDifficulty] = useState(String(question?.difficulty ?? 2));
  const [imageUrl, setImageUrl] = useState(question?.imageUrl ?? "");
  const [imageLicense, setImageLicense] = useState(question?.imageLicense ?? "");
  const [imageSource, setImageSource] = useState(question?.imageSource ?? "");
  const [imageAlt, setImageAlt] = useState(question?.imageAlt ?? "");
  const [status, setStatus] = useState(question?.status ?? "DRAFT");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, position) => (position === index ? value : option)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);
    setFields({});

    const payload = {
      text,
      explanation,
      options,
      correctIndex,
      difficulty: Number(difficulty),
      imageUrl,
      imageLicense,
      imageSource,
      imageAlt,
      status,
    };

    if (question) {
      const result = await requestAdminApi<{ question: { id: string; versioned: boolean } }>(
        `/api/v1/admin/questions/${question.id}`,
        { method: "PATCH", body: JSON.stringify(payload) },
      );

      if (!result.ok) {
        setFormError(result.error.message);
        setFields(result.error.fields);
        setSubmitting(false);
        return;
      }

      router.push(
        result.data.question.versioned
          ? `/admin/topics/${topicId}?versioned=1`
          : `/admin/topics/${topicId}?saved=1`,
      );
      router.refresh();
      return;
    }

    const result = await requestAdminApi<{ question: { id: string } }>(
      `/api/v1/admin/topics/${topicId}/questions`,
      { method: "POST", body: JSON.stringify(payload) },
    );

    if (!result.ok) {
      setFormError(result.error.message);
      setFields(result.error.fields);
      setSubmitting(false);
      return;
    }

    router.push(`/admin/topics/${topicId}?saved=1`);
    router.refresh();
  }

  const backHref = `/admin/topics/${topicId}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {formError ? (
        <Alert variant="error" title="Не удалось сохранить">
          {formError}
        </Alert>
      ) : null}

      {question?.status === "PUBLISHED" ? (
        <Alert variant="neutral" title="Это опубликованный вопрос">
          Если изменить текст, варианты или правильный ответ, старая версия уйдёт в архив, а
          новая получит следующий номер. Объяснение, сложность и изображение можно исправлять
          без новой версии.
        </Alert>
      ) : null}

      <Card className="space-y-5">
        <Field
          id="question-text"
          label="Текст вопроса"
          value={text}
          onChange={(event) => setText(event.target.value)}
          hint="Один вопрос без отрицаний и подсказок в формулировке."
          error={fields.text}
          maxLength={2000}
          required
        />

        <Labeled
          id="question-options"
          label="Варианты ответа"
          hint="Заполните все четыре варианта и отметьте один правильный."
          error={fields.options}
        >
          <div className="space-y-3">
            {options.map((option, index) => {
              const inputId = `question-option-${index}`;
              return (
                <div key={inputId} className="flex items-start gap-3">
                  <input
                    id={`question-correct-${index}`}
                    type="radio"
                    name="correct-option"
                    className="mt-4 h-6 w-6 shrink-0 accent-[var(--color-accent)]"
                    checked={correctIndex === index}
                    onChange={() => setCorrectIndex(index)}
                    aria-label={`Правильный ответ: вариант ${index + 1}`}
                  />
                  <div className="flex-1 space-y-1">
                    <label htmlFor={inputId} className="block text-base font-semibold text-ink">
                      Вариант {index + 1}
                    </label>
                    <input
                      id={inputId}
                      value={option}
                      onChange={(event) => updateOption(index, event.target.value)}
                      maxLength={500}
                      required
                      className="min-h-14 w-full rounded-control border-2 border-line-strong bg-surface px-4 py-3 text-lg text-ink placeholder:text-muted focus-visible:border-accent"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Labeled>

        <Labeled
          id="question-explanation"
          htmlFor="question-explanation"
          label="Объяснение"
          hint="Одно-три предложения. Обязательно для публикации: пользователь увидит объяснение после ответа."
          error={fields.explanation}
        >
          <Textarea
            id="question-explanation"
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            maxLength={3000}
          />
        </Labeled>

        <Labeled
          id="question-difficulty"
          htmlFor="question-difficulty"
          label="Сложность"
          error={fields.difficulty}
        >
          <Select
            id="question-difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="1">1 — простой</option>
            <option value="2">2 — средний</option>
            <option value="3">3 — сложный</option>
          </Select>
        </Labeled>

        <Field
          id="question-image"
          label="Ссылка на изображение"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          hint="Необязательно. Свободная лицензия: CC0, CC BY, CC BY-SA или общественное достояние. Постеры, кадры фильмов и логотипы не используем."
          error={fields.imageUrl}
          inputMode="url"
        />

        <Field
          id="question-image-alt"
          label="Описание изображения"
          value={imageAlt}
          onChange={(event) => setImageAlt(event.target.value)}
          hint="Что видно на картинке. Прочитают незрячие пользователи. Обязательно, если есть изображение."
          error={fields.imageAlt}
          maxLength={300}
        />

        <Field
          id="question-image-license"
          label="Лицензия изображения"
          value={imageLicense}
          onChange={(event) => setImageLicense(event.target.value)}
          hint="Например: CC BY-SA 4.0, CC0 или общественное достояние. Обязательно, если есть изображение."
          error={fields.imageLicense}
          maxLength={300}
        />

        <Field
          id="question-image-source"
          label="Ссылка на источник"
          value={imageSource}
          onChange={(event) => setImageSource(event.target.value)}
          hint="Страница файла или страница автора: её увидит пользователь рядом с картинкой."
          error={fields.imageSource}
          inputMode="url"
        />

        {imageUrl ? (
          <div className="space-y-2">
            <p className="text-lg font-semibold text-ink">Предпросмотр</p>
            {/* Внешние иллюстрации: перенос в собственное хранилище — отдельная задача. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageAlt}
              className="max-h-64 w-full rounded-card border border-line bg-surface object-contain"
            />
          </div>
        ) : null}

        <Labeled
          id="question-status"
          htmlFor="question-status"
          label="Статус"
          hint="Черновик видят только сотрудники. Опубликованный вопрос участвует в тренировках."
          error={fields.status}
        >
          <Select
            id="question-status"
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
          {submitting ? "Сохраняем…" : "Сохранить вопрос"}
        </Button>
        <Button href={backHref} variant="secondary">
          Отмена
        </Button>
      </div>

      <p className="text-base text-ink-soft">
        Тема: <span className="font-semibold text-ink">{topicTitle}</span>.{" "}
        <Link href={backHref} className="font-semibold text-accent underline underline-offset-4">
          Вернуться к вопросам темы
        </Link>
      </p>
    </form>
  );
}
