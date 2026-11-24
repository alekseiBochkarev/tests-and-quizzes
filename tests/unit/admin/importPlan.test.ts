import { describe, expect, it } from "vitest";

import {
  planAdminImport,
  type ExistingImportQuestion,
} from "@/lib/admin/importPlan";
import type { ImportItem, ImportPlan } from "@/lib/content/import";

function item(overrides: Partial<ImportItem> = {}): ImportItem {
  return {
    index: 1,
    sourceTopic: "История",
    categorySlug: "nauka",
    topicSlug: "history",
    text: "В каком году пала Западная Римская империя?",
    explanation: "В 476 году Одоакр низложил Ромула Августула.",
    context: null,
    options: ["395", "410", "476", "1453"],
    correctIndex: 2,
    contentHash: "hash-1",
    status: "PUBLISHED",
    ...overrides,
  };
}

function existing(overrides: Partial<ExistingImportQuestion> = {}): ExistingImportQuestion {
  return {
    id: "question-1",
    text: "В каком году пала Западная Римская империя?",
    explanation: "В 476 году Одоакр низложил Ромула Августула.",
    status: "PUBLISHED",
    isDemo: false,
    contentHash: "hash-1",
    version: 1,
    ...overrides,
  };
}

function planOf(...items: ImportItem[]): ImportPlan {
  return { items, issues: [] };
}

describe("planAdminImport", () => {
  it("создаёт новый вопрос, если в теме его нет", () => {
    const result = planAdminImport(planOf(item()), []);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]?.kind).toBe("create");
    expect(result.actions[0]?.version).toBe(1);
    expect(result.counts.created).toBe(1);
    expect(result.counts.errors).toBe(0);
  });

  it("обновляет объяснение по совпадению отпечатка и повышает версию", () => {
    const result = planAdminImport(
      planOf(item({ explanation: "Новое объяснение." })),
      [existing()],
    );

    expect(result.actions[0]?.kind).toBe("update");
    expect(result.actions[0]?.targetId).toBe("question-1");
    expect(result.actions[0]?.version).toBe(2);
    expect(result.counts.updated).toBe(1);
  });

  it("пропускает вопрос, который не изменился", () => {
    const result = planAdminImport(planOf(item()), [existing()]);

    expect(result.actions[0]?.kind).toBe("skip");
    expect(result.counts.skipped).toBe(1);
  });

  it("не возвращает архивный вопрос в публикацию", () => {
    const result = planAdminImport(planOf(item()), [existing({ status: "ARCHIVED" })]);

    expect(result.actions[0]?.kind).toBe("skip");
    expect(result.issues.some((issue) => issue.code === "existing_question")).toBe(true);
  });

  it("создаёт новую версию, когда у того же вопроса изменился правильный ответ", () => {
    const result = planAdminImport(
      planOf(item({ correctIndex: 1, contentHash: "hash-2" })),
      [existing()],
    );

    expect(result.actions[0]?.kind).toBe("replace");
    expect(result.actions[0]?.archiveIds).toEqual(["question-1"]);
    expect(result.actions[0]?.version).toBe(2);
    expect(result.counts.replaced).toBe(1);
    expect(result.issues.some((issue) => issue.code === "new_version")).toBe(true);
  });

  it("учитывает архивные версии при нумерации новой", () => {
    const result = planAdminImport(
      planOf(item({ correctIndex: 1, contentHash: "hash-2" })),
      [existing({ status: "ARCHIVED", version: 4 })],
    );

    expect(result.actions[0]?.kind).toBe("replace");
    expect(result.actions[0]?.archiveIds).toEqual([]);
    expect(result.actions[0]?.version).toBe(5);
    expect(result.issues.some((issue) => issue.code === "archived_version")).toBe(true);
  });

  it("не заменяет живой вопрос черновиком без объяснения", () => {
    const result = planAdminImport(
      planOf(item({ status: "DRAFT", explanation: "", contentHash: "hash-2" })),
      [existing()],
    );

    expect(result.actions[0]?.kind).toBe("skip");
    expect(result.issues.some((issue) => issue.code === "existing_question")).toBe(true);
  });

  it("предупреждает о похожем вопросе с другой формулировкой", () => {
    const result = planAdminImport(
      planOf(
        item({
          text: "В каком году пала Западная Римская империя и что случилось с Ромулом Августулом?",
          contentHash: "hash-3",
        }),
      ),
      [existing()],
    );

    expect(result.actions[0]?.kind).toBe("create");
    expect(result.issues.some((issue) => issue.code === "possible_duplicate_text")).toBe(true);
  });

  it("считает демо-вопросы, которые уйдут в архив после публикации реального", () => {
    const result = planAdminImport(planOf(item()), [
      existing({ id: "demo-1", isDemo: true, contentHash: "demo-hash" }),
    ]);

    expect(result.counts.demoArchived).toBe(1);
  });

  it("не архивирует демо-вопросы, если реальный вопрос остаётся черновиком", () => {
    const result = planAdminImport(planOf(item({ status: "DRAFT" })), [
      existing({ id: "demo-1", isDemo: true, contentHash: "demo-hash" }),
    ]);

    expect(result.counts.demoArchived).toBe(0);
  });

  it("переносит ошибки разбора в общий отчёт", () => {
    const result = planAdminImport(
      {
        items: [],
        issues: [
          {
            index: 2,
            sourceTopic: "История",
            code: "empty_question",
            severity: "error",
            message: "Вопрос #2: пустой текст вопроса.",
          },
        ],
      },
      [],
    );

    expect(result.counts.errors).toBe(1);
    expect(result.issues).toHaveLength(1);
  });
});
