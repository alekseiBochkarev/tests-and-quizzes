"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { requestAdminApi } from "@/lib/admin/client";

type TopicOption = {
  id: string;
  title: string;
  slug: string;
  status: string;
  categoryTitle: string;
};

type ImportIssue = {
  index: number | null;
  sourceTopic: string | null;
  code: string;
  severity: "error" | "warning";
  message: string;
};

type ImportCounts = {
  total: number;
  created: number;
  updated: number;
  replaced: number;
  skipped: number;
  draft: number;
  errors: number;
  warnings: number;
  demoArchived: number;
};

type ImportAction = {
  index: number;
  text: string;
  status: "PUBLISHED" | "DRAFT";
  kind: "create" | "update" | "replace" | "skip";
  warnings: { code: string; message: string }[];
};

type Preview = {
  topic: { id: string; title: string; slug: string; status: string };
  counts: ImportCounts;
  issues: ImportIssue[];
  actions: ImportAction[];
};

type ApplyResult = {
  counts: ImportCounts;
  issues: ImportIssue[];
};

const ACTION_LABELS: Record<ImportAction["kind"], string> = {
  create: "Добавить",
  update: "Обновить",
  replace: "Новая версия",
  skip: "Пропустить",
};

const MAX_FILE_BYTES = 1024 * 1024;

function countLabel(value: number, forms: [string, string, string]): string {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control border border-line bg-paper px-4 py-3">
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-base text-ink-soft">{label}</p>
    </div>
  );
}

/**
 * Загрузка вопросов из forms_writer: файл или вставка JSON → предпросмотр →
 * подтверждение. Предпросмотр обязателен: редактор видит, что именно
 * добавится, обновится или уйдёт в архив, до записи в базу.
 */
export function ImportForm({ topics }: { topics: TopicOption[] }) {
  const fileInputId = useId();
  const textareaId = useId();
  const topicSelectId = useId();

  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);

  function resetPreview() {
    setPreview(null);
    setApplied(null);
    setError(null);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    resetPreview();
    setFileName(file.name);

    if (file.size > MAX_FILE_BYTES) {
      setError("Файл больше 1 МБ. Загрузите вопросы частями — до 500 за раз.");
      return;
    }

    try {
      setText(await file.text());
    } catch {
      setError("Не удалось прочитать файл. Скопируйте JSON в поле ниже.");
    }
  }

  function parseData(): unknown | null {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      setError("Не удалось прочитать JSON. Проверьте кавычки и запятые.");
      return null;
    }
  }

  async function handlePreview() {
    if (busy) return;

    if (!topicId) {
      setError("Выберите тему.");
      return;
    }

    const data = parseData();
    if (data === null) return;

    setBusy("preview");
    setError(null);
    setApplied(null);

    const result = await requestAdminApi<{ preview: Preview }>("/api/v1/admin/import/preview", {
      method: "POST",
      body: JSON.stringify({ topicId, data }),
    });

    setBusy(null);
    if (!result.ok) {
      setPreview(null);
      setError(result.error.message);
      return;
    }

    setPreview(result.data.preview);
  }

  async function handleApply() {
    if (busy || !preview || preview.counts.errors > 0) return;

    const data = parseData();
    if (data === null) return;

    setBusy("apply");
    setError(null);

    const result = await requestAdminApi<ApplyResult>("/api/v1/admin/import/apply", {
      method: "POST",
      body: JSON.stringify({ topicId, data }),
    });

    setBusy(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setApplied(result.data);
    setPreview(null);
  }

  if (topics.length === 0) {
    return (
      <Alert variant="neutral" title="Сначала создайте тему">
        Импорт добавляет вопросы в выбранную тему, поэтому нужна хотя бы одна тема.{" "}
        <Link href="/admin/topics/new" className="font-semibold text-accent underline underline-offset-4">
          Создать тему
        </Link>
        .
      </Alert>
    );
  }

  const errors = preview?.issues.filter((issue) => issue.severity === "error") ?? [];
  const warnings = preview?.issues.filter((issue) => issue.severity === "warning") ?? [];

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="error" title="Не получилось">
          {error}
        </Alert>
      ) : null}

      {applied ? (
        <Alert variant="success" title="Вопросы загружены">
          <p>
            Добавлено: {applied.counts.created}, обновлено: {applied.counts.updated}, новых версий:{" "}
            {applied.counts.replaced}, пропущено: {applied.counts.skipped}.
          </p>
          {applied.counts.demoArchived > 0 ? (
            <p className="mt-2">
              Демонстрационные вопросы темы убраны из публикации — в теме есть реальные
              опубликованные вопросы.
            </p>
          ) : null}
          <p className="mt-2">
            <Link
              href={`/admin/topics/${topicId}`}
              className="font-semibold text-accent underline underline-offset-4"
            >
              Открыть тему и проверить вопросы
            </Link>
          </p>
        </Alert>
      ) : null}

      <Card className="space-y-5">
        <div className="space-y-2">
          <label htmlFor={topicSelectId} className="block text-lg font-semibold text-ink">
            Тема, в которую загружаем
          </label>
          <Select
            id={topicSelectId}
            value={topicId}
            onChange={(event) => {
              setTopicId(event.target.value);
              resetPreview();
            }}
          >
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.categoryTitle}: {topic.title}
                {topic.status === "PUBLISHED" ? "" : " (не опубликована)"}
              </option>
            ))}
          </Select>
          <p className="text-base text-muted">
            Все вопросы из файла попадут в эту тему. Поле topic внутри файла только показывается в
            предпросмотре и не создаёт новые темы.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor={fileInputId} className="block text-lg font-semibold text-ink">
            Файл JSON
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleFile(event.target.files?.[0])}
            className="block w-full rounded-control border-2 border-line-strong bg-surface px-4 py-3 text-lg text-ink file:mr-4 file:min-h-12 file:rounded-control file:border-0 file:bg-accent file:px-4 file:py-2 file:text-base file:font-semibold file:text-white"
          />
          {fileName ? <p className="text-base text-muted">Выбран файл: {fileName}</p> : null}
          <p className="text-base text-muted">
            Формат forms_writer: {"{"} questions: [{"{"} question, options, correct_index,
            explanation {"}"}] {"}"}. До 500 вопросов и 1 МБ.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor={textareaId} className="block text-lg font-semibold text-ink">
            Или вставьте JSON
          </label>
          <Textarea
            id={textareaId}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              resetPreview();
            }}
            className="min-h-56 font-mono text-base"
            placeholder='{"questions": [{"question": "…", "options": ["…"], "correct_index": 0, "explanation": "…"}]}'
            spellCheck={false}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={handlePreview} disabled={busy !== null || !text.trim()}>
            {busy === "preview" ? "Проверяем…" : "Проверить и показать предпросмотр"}
          </Button>
        </div>
      </Card>

      {preview ? (
        <Card className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Предпросмотр</h3>
            <p className="text-base text-ink-soft">
              Тема: {preview.topic.title}. В файле {preview.counts.total}{" "}
              {countLabel(preview.counts.total, ["вопрос", "вопроса", "вопросов"])}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <CountCard label="Добавится" value={preview.counts.created} />
            <CountCard label="Обновится" value={preview.counts.updated} />
            <CountCard label="Новых версий" value={preview.counts.replaced} />
            <CountCard label="Пропустится" value={preview.counts.skipped} />
            <CountCard label="Черновиков" value={preview.counts.draft} />
            <CountCard label="Ошибок" value={preview.counts.errors} />
            <CountCard label="Предупреждений" value={preview.counts.warnings} />
            <CountCard label="Демо в архив" value={preview.counts.demoArchived} />
          </div>

          {preview.counts.draft > 0 ? (
            <Alert variant="neutral" title="Есть вопросы без объяснения">
              Они сохранятся как черновики и не будут показываться пользователям. Добавить
              объяснение можно в карточке вопроса.
            </Alert>
          ) : null}

          {errors.length > 0 ? (
            <Alert variant="error" title="Исправьте ошибки в файле">
              <ul className="space-y-2">
                {errors.map((issue, index) => (
                  <li key={`${issue.code}-${issue.index ?? "file"}-${index}`}>
                    {issue.index ? `Вопрос #${issue.index}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : (
            <Alert variant="success" title="Ошибок нет">
              Можно загружать. Если передумали, просто измените файл или текст — предпросмотр
              сбросится.
            </Alert>
          )}

          {warnings.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-lg font-bold">Предупреждения</h4>
              <ul className="space-y-1 text-base text-ink-soft">
                {warnings.map((issue, index) => (
                  <li key={`${issue.code}-${issue.index ?? "file"}-${index}`}>
                    {issue.index ? `Вопрос #${issue.index}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.actions.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-lg font-bold">Что произойдёт с вопросами</h4>
              <ul className="divide-y divide-line">
                {preview.actions.slice(0, 40).map((action) => (
                  <li key={action.index} className="space-y-1 py-3 first:pt-0 last:pb-0">
                    <p className="text-base font-semibold text-ink">
                      #{action.index} · {ACTION_LABELS[action.kind]} ·{" "}
                      {action.status === "PUBLISHED" ? "опубликуется" : "черновик"}
                    </p>
                    <p className="text-base text-ink-soft">{action.text}</p>
                    {action.warnings.length > 0 ? (
                      <ul className="space-y-1 text-base text-muted">
                        {action.warnings.map((warning) => (
                          <li key={warning.code}>{warning.message}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
              {preview.actions.length > 40 ? (
                <p className="text-base text-muted">
                  Показаны первые 40 из {preview.actions.length}. Остальные обработаются так же.
                </p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={handleApply}
            disabled={busy !== null || preview.counts.errors > 0}
          >
            {busy === "apply" ? "Загружаем…" : "Загрузить вопросы"}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
