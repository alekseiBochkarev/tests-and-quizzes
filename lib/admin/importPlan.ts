import type { ContentStatus } from "@/lib/generated/prisma/enums";
import type { ImportIssue, ImportItem, ImportPlan } from "@/lib/content/import";
import { areTextsSimilar, normalizeForHash } from "@/lib/content/import";

/**
 * План применения импорта к конкретной теме (CNT-04).
 *
 * Чистая логика: получает уже провалидированные вопросы файла и текущие
 * вопросы темы, возвращает действия «создать / обновить / заменить / пропустить».
 * Запись в БД делает сервис в одной транзакции. Такое разделение позволяет
 * показать предпросмотр и не расходиться с фактическим импортом.
 */

export type ExistingImportQuestion = {
  id: string;
  text: string;
  explanation: string;
  status: ContentStatus;
  isDemo: boolean;
  contentHash: string | null;
  version: number;
};

export type AdminImportActionKind = "create" | "update" | "replace" | "skip";

export type AdminImportAction = {
  item: ImportItem;
  kind: AdminImportActionKind;
  /** Для `update` — id существующего вопроса. */
  targetId: string | null;
  /** Для `replace` — какие живые версии уходят в архив. */
  archiveIds: string[];
  /** Версия нового вопроса для `create`/`replace`. */
  version: number;
  warnings: ImportIssue[];
};

export type AdminImportCounts = {
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

export type AdminImportPlan = {
  actions: AdminImportAction[];
  issues: ImportIssue[];
  counts: AdminImportCounts;
};

function warning(item: ImportItem, code: ImportIssue["code"], message: string): ImportIssue {
  return {
    index: item.index,
    sourceTopic: item.sourceTopic,
    code,
    severity: "warning",
    message,
  };
}

export function planAdminImport(
  plan: ImportPlan,
  existing: ExistingImportQuestion[],
): AdminImportPlan {
  const actions: AdminImportAction[] = [];
  const issues: ImportIssue[] = [...plan.issues];

  for (const item of plan.items) {
    const hashMatches = existing.filter(
      (question) => !question.isDemo && question.contentHash === item.contentHash,
    );

    if (hashMatches.length > 0) {
      const row = hashMatches[0];
      if (!row) continue;

      const warnings: ImportIssue[] = [];
      if (hashMatches.length > 1) {
        warnings.push(
          warning(
            item,
            "duplicate_hash",
            `В теме несколько вопросов с одинаковым отпечатком (${hashMatches.length}); обновляется первый.`,
          ),
        );
      }

      if (row.status === "ARCHIVED") {
        warnings.push(
          warning(
            item,
            "existing_question",
            "Вопрос в архиве. Импорт не публикует его повторно, чтобы не отменять решение редактора.",
          ),
        );
        actions.push({
          item,
          kind: "skip",
          targetId: row.id,
          archiveIds: [],
          version: row.version,
          warnings,
        });
        issues.push(...warnings);
        continue;
      }

      if (item.status === "DRAFT" && row.status === "PUBLISHED") {
        warnings.push(
          warning(
            item,
            "existing_question",
            "В файле нет объяснения, а вопрос уже опубликован — оставлен как есть.",
          ),
        );
        actions.push({
          item,
          kind: "skip",
          targetId: row.id,
          archiveIds: [],
          version: row.version,
          warnings,
        });
        issues.push(...warnings);
        continue;
      }

      if (row.explanation !== item.explanation || row.status !== item.status) {
        actions.push({
          item,
          kind: "update",
          targetId: row.id,
          archiveIds: [],
          version: row.version + 1,
          warnings,
        });
      } else {
        actions.push({
          item,
          kind: "skip",
          targetId: row.id,
          archiveIds: [],
          version: row.version,
          warnings,
        });
      }

      issues.push(...warnings);
      continue;
    }

    const textKey = normalizeForHash(item.text);
    const previousVersions = existing.filter(
      (question) => !question.isDemo && normalizeForHash(question.text) === textKey,
    );
    const livePrevious = previousVersions.filter((question) => question.status !== "ARCHIVED");

    if (item.status === "DRAFT" && livePrevious.length > 0) {
      const existingWarning = warning(
        item,
        "existing_question",
        "В файле нет объяснения, а вопрос с таким текстом уже есть — оставлен как есть.",
      );
      actions.push({
        item,
        kind: "skip",
        targetId: livePrevious[0]?.id ?? null,
        archiveIds: [],
        version: livePrevious[0]?.version ?? 1,
        warnings: [existingWarning],
      });
      issues.push(existingWarning);
      continue;
    }

    const warnings: ImportIssue[] = [];
    if (previousVersions.length > 0) {
      const maxVersion = Math.max(...previousVersions.map((question) => question.version), 0);
      warnings.push(
        warning(
          item,
          livePrevious.length > 0 ? "new_version" : "archived_version",
          livePrevious.length > 0
            ? "Новая версия вопроса: предыдущая формулировка переходит в архив."
            : "В теме был архивный вопрос с таким текстом. Создана новая версия — проверьте, не отменяет ли это решение редактора.",
        ),
      );
      actions.push({
        item,
        kind: "replace",
        targetId: null,
        archiveIds: livePrevious.map((question) => question.id),
        version: maxVersion + 1,
        warnings,
      });
    } else {
      const similar = existing.find(
        (question) =>
          !question.isDemo &&
          question.status !== "ARCHIVED" &&
          areTextsSimilar(question.text, item.text),
      );
      if (similar) {
        warnings.push(
          warning(
            item,
            "possible_duplicate_text",
            `Похоже на существующий вопрос «${similar.text.slice(0, 80)}${
              similar.text.length > 80 ? "…" : ""
            }». Создаётся новый вопрос: если это правка формулировки, старую версию нужно архивировать вручную.`,
          ),
        );
      }
      actions.push({
        item,
        kind: "create",
        targetId: null,
        archiveIds: [],
        version: 1,
        warnings,
      });
    }

    issues.push(...warnings);
  }

  const counts: AdminImportCounts = {
    total: plan.items.length,
    created: actions.filter((action) => action.kind === "create").length,
    updated: actions.filter((action) => action.kind === "update").length,
    replaced: actions.filter((action) => action.kind === "replace").length,
    skipped: actions.filter((action) => action.kind === "skip").length,
    draft: plan.items.filter((item) => item.status === "DRAFT").length,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    demoArchived: 0,
  };

  const publishedDemo = existing.filter(
    (question) => question.isDemo && question.status === "PUBLISHED",
  ).length;

  let publishedReal = existing.filter(
    (question) => !question.isDemo && question.status === "PUBLISHED",
  ).length;

  for (const action of actions) {
    if (action.kind === "skip") continue;

    if (action.kind === "update" && action.targetId) {
      const target = existing.find((question) => question.id === action.targetId);
      if (target?.status === "PUBLISHED" && action.item.status !== "PUBLISHED") {
        publishedReal -= 1;
      }
      if (target?.status !== "PUBLISHED" && action.item.status === "PUBLISHED") {
        publishedReal += 1;
      }
      continue;
    }

    if (action.kind === "replace") {
      for (const id of action.archiveIds) {
        const previous = existing.find((question) => question.id === id);
        if (previous?.status === "PUBLISHED") publishedReal -= 1;
      }
      if (action.item.status === "PUBLISHED") publishedReal += 1;
      continue;
    }

    if (action.item.status === "PUBLISHED") publishedReal += 1;
  }

  counts.demoArchived = publishedReal > 0 ? publishedDemo : 0;

  return { actions, issues, counts };
}
