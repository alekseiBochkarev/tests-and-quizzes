import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  areTextsSimilar,
  hasErrors,
  normalizeForHash,
  parseFormsWriterFile,
  parseTopicMap,
  planImport,
  type ImportItem,
  type TopicTarget,
} from "@/lib/content/import";

/**
 * Партии CNT-02 проверяются тем же кодом, что и импорт: если файл перестанет
 * проходить валидацию, упадёт unit-тест, а не заливка в базу.
 *
 * В `content/batches` лежат только полные партии по 60 вопросов. Черновики и
 * неполные наборы держим вне этой папки, иначе тест их не пропустит.
 */
const batchesDir = path.join(process.cwd(), "content", "batches");
const mapPath = path.join(process.cwd(), "scripts", "import", "topic-map.json");

const batchFiles = readdirSync(batchesDir)
  .filter((fileName) => fileName.endsWith(".json"))
  .sort();

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

const mapResult = parseTopicMap(readJson(mapPath));

describe("маппинг контентных тем", () => {
  it("содержит все восемь целевых тем CNT-02", () => {
    const expected: Array<[string, TopicTarget]> = [
      ["История России", { category: "nauka", topic: "history" }],
      ["Советское кино", { category: "kino", topic: "soviet-cinema" }],
      ["Песни и музыка", { category: "iskusstvo", topic: "music" }],
      ["Литература", { category: "nauka", topic: "literature" }],
      ["География", { category: "priroda", topic: "geography" }],
      ["Природа и животные", { category: "priroda", topic: "animals" }],
      [
        "Кулинария и традиции",
        { category: "krugozor", topic: "cooking", title: "Кулинария и традиции" },
      ],
      ["Быт и ностальгия", { category: "krugozor", topic: "nostalgia", title: "Быт и ностальгия" }],
    ];

    expect(mapResult.issues).toHaveLength(0);
    for (const [sourceTopic, target] of expected) {
      expect(mapResult.map.get(sourceTopic), `Нет маппинга темы «${sourceTopic}»`).toEqual(target);
    }
  });
});

describe("контентные партии", () => {
  it("в папке есть хотя бы одна партия", () => {
    expect(batchFiles.length).toBeGreaterThan(0);
  });

  it.each(batchFiles)("%s: 60 вопросов без ошибок валидации", (fileName) => {
    const fileValue = readJson(path.join(batchesDir, fileName));
    const parsed = parseFormsWriterFile(fileValue);
    const plan = planImport(fileValue, mapResult.map);

    expect(parsed.issues).toHaveLength(0);
    expect(parsed.questions).toHaveLength(60);
    expect(hasErrors(plan.issues)).toBe(false);
    expect(plan.issues).toHaveLength(0);
    expect(plan.items).toHaveLength(60);
  });

  it.each(batchFiles)("%s: вопросы опубликованы и объяснены", (fileName) => {
    const plan = planImport(readJson(path.join(batchesDir, fileName)), mapResult.map);

    for (const item of plan.items) {
      expect(item.topicSlug).toBeTruthy();
      expect(item.categorySlug).toBeTruthy();
      expect(item.status).toBe("PUBLISHED");
      expect(item.explanation.length).toBeGreaterThanOrEqual(40);
    }
  });

  it.each(batchFiles)("%s: по четыре разных варианта и корректный ответ", (fileName) => {
    const plan = planImport(readJson(path.join(batchesDir, fileName)), mapResult.map);

    for (const item of plan.items) {
      expect(item.options).toHaveLength(4);
      expect(new Set(item.options.map(normalizeForHash)).size).toBe(4);
      expect(item.options[item.correctIndex]).toBeTruthy();
    }
  });

  it.each(batchFiles)("%s: нет повторов по хешу и тексту", (fileName) => {
    const plan = planImport(readJson(path.join(batchesDir, fileName)), mapResult.map);
    const hashes = new Set(plan.items.map((item) => item.contentHash));
    const texts = new Set(plan.items.map((item) => normalizeForHash(item.text)));

    expect(hashes.size).toBe(plan.items.length);
    expect(texts.size).toBe(plan.items.length);
  });

  it.each(batchFiles)("%s: похожие вопросы спрашивают о разном", (fileName) => {
    const plan = planImport(readJson(path.join(batchesDir, fileName)), mapResult.map);
    const similarPairs: Array<[ImportItem, ImportItem]> = [];

    for (let leftIndex = 0; leftIndex < plan.items.length; leftIndex += 1) {
      const left = plan.items[leftIndex];
      if (!left) continue;

      for (let rightIndex = leftIndex + 1; rightIndex < plan.items.length; rightIndex += 1) {
        const right = plan.items[rightIndex];
        if (!right) continue;
        if (areTextsSimilar(left.text, right.text)) similarPairs.push([left, right]);
      }
    }

    // Похожая формулировка допустима для вопросов об одной картине, но ответ
    // должен быть разным — иначе это дубль под другим соусом.
    for (const [left, right] of similarPairs) {
      expect(
        left.options[left.correctIndex] ?? "",
        `Одинаковый ответ у вопросов: «${left.text}» и «${right.text}»`,
      ).not.toBe(right.options[right.correctIndex] ?? "");
    }
  });

  it.each(batchFiles)("%s: правильный ответ не стоит всё время на одном месте", (fileName) => {
    const plan = planImport(readJson(path.join(batchesDir, fileName)), mapResult.map);
    const distribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

    for (const item of plan.items) {
      distribution[item.correctIndex] = (distribution[item.correctIndex] ?? 0) + 1;
    }

    expect(distribution).toEqual({ 0: 15, 1: 15, 2: 15, 3: 15 });
  });
});
