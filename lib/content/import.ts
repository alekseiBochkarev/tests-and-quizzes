import { createHash } from "node:crypto";

/**
 * Импорт вопросов из `forms_writer` (CNT-01).
 *
 * Модуль намеренно чистый: здесь только разбор файла, нормализация, дедуп и
 * валидация. Ни БД, ни `pg`, ни Prisma — поэтому логика покрывается unit-тестами
 * без поднятой базы. Запись в БД делает `scripts/import-questions.mjs`.
 *
 * Формат `forms_writer` (`samples/questions.json`):
 * `{ questions: [{ topic, question, options[4], correct_index, context?, explanation? }] }`.
 * `topic`, `context` и `explanation` там могут быть пустыми строками — это
 * штатное поведение генератора, а не битый файл.
 */

export type TopicTarget = {
  category: string;
  topic: string;
  title?: string;
};

/** Ключ — значение `topic` из файла, например «История». */
export type TopicMap = Map<string, TopicTarget>;

export type ImportIssueCode =
  | "invalid_file"
  | "empty_file"
  | "invalid_item"
  | "empty_topic"
  | "unknown_topic"
  | "topic_not_found"
  | "empty_question"
  | "missing_options"
  | "options_count"
  | "empty_option"
  | "duplicate_option"
  | "invalid_correct_index"
  | "duplicate_in_file"
  | "conflicting_duplicate"
  | "missing_explanation"
  | "invalid_map"
  | "topic_archived"
  | "topic_not_found"
  | "existing_question"
  | "new_version"
  | "archived_version"
  | "duplicate_hash"
  | "possible_duplicate_text"
  | "topic_category_mismatch"
  | "unknown_category";

export type ImportIssue = {
  /** Номер вопроса в файле, 1-based. Для ошибок файла/маппинга — null. */
  index: number | null;
  sourceTopic: string | null;
  code: ImportIssueCode;
  severity: "error" | "warning";
  message: string;
};

export type ImportItem = {
  /** Номер вопроса в файле, 1-based. */
  index: number;
  sourceTopic: string;
  categorySlug: string;
  topicSlug: string;
  text: string;
  /** Пустая строка, если генератор не дал объяснение. */
  explanation: string;
  /** «Завязка» из форм: в БД пока не хранится, нужна для отчёта. */
  context: string | null;
  options: string[];
  correctIndex: number;
  contentHash: string;
  /** Без объяснения вопрос уходит в DRAFT и не показывается пользователю. */
  status: "PUBLISHED" | "DRAFT";
};

export type ImportPlan = {
  items: ImportItem[];
  issues: ImportIssue[];
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OPTIONS_PER_QUESTION = 4;
const HASH_VERSION = "q1";
const HASH_SEPARATOR = "\u001f";

/**
 * Нормализация только для сравнения: регистр, «ё», кавычки, тире, пробелы и
 * завершающая пунктуация не должны создавать «новый» вопрос при повторном
 * импорте. Исходный текст в БД сохраняется как есть.
 */
export function normalizeForHash(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»„“”"']/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?…]+$/u, "")
    .trim();

  // Внешние кавычки вокруг всего текста не меняют смысл: «Война и мир» и
  // Война и мир — один и тот же вопрос. Кавычки внутри текста сохраняем.
  if (normalized.length > 1 && normalized.startsWith('"') && normalized.endsWith('"')) {
    return normalized.slice(1, -1).trim();
  }

  return normalized;
}

/**
 * Грубая проверка «похоже на тот же вопрос другими словами».
 *
 * Точной идентичности у `forms_writer` нет, поэтому изменение формулировки
 * создаёт новый вопрос. Чтобы такая правка не превращалась в молчаливый дубль,
 * CLI сравнивает текст с уже существующими вопросами темы и предупреждает при
 * высоком совпадении слов. Это подсказка, а не блокировка: решает редактор.
 */
export function areTextsSimilar(left: string, right: string): boolean {
  const words = (value: string) =>
    new Set(
      normalizeForHash(value)
        .split(" ")
        .filter((word) => word.length > 2),
    );

  const first = words(left);
  const second = words(right);
  if (first.size < 3 || second.size < 3) return false;

  let intersection = 0;
  for (const word of first) {
    if (second.has(word)) intersection += 1;
  }

  const union = first.size + second.size - intersection;
  return intersection / union >= 0.6;
}

/**
 * Хеш содержания вопроса.
 *
 * Варианты сортируются, а правильный ответ берётся по тексту: `forms_writer`
 * перемешивает варианты (`shuffle`), поэтому хеш от порядка сломал бы
 * идемпотентность повторного импорта.
 *
 * Тема входит в хеш: одинаковый вопрос в разных темах — не дубликат.
 */
export function buildContentHash(input: {
  topic: string;
  text: string;
  options: string[];
  correctIndex: number;
}): string {
  const correct = input.options[input.correctIndex];
  if (correct === undefined) {
    throw new Error("correctIndex вне диапазона вариантов");
  }

  const parts = [
    HASH_VERSION,
    normalizeForHash(input.topic),
    normalizeForHash(input.text),
    ...input.options.map(normalizeForHash).sort(),
    normalizeForHash(correct),
  ];

  return createHash("sha256").update(parts.join(HASH_SEPARATOR)).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function issue(
  code: ImportIssueCode,
  message: string,
  options: {
    index?: number | null;
    sourceTopic?: string | null;
    severity?: "error" | "warning";
  } = {},
): ImportIssue {
  return {
    index: options.index ?? null,
    sourceTopic: options.sourceTopic ?? null,
    code,
    severity: options.severity ?? "error",
    message,
  };
}

/** Разбирает объект маппинга тем из `scripts/import/topic-map.json`. */
export function parseTopicMap(value: unknown): { map: TopicMap; issues: ImportIssue[] } {
  const map: TopicMap = new Map();
  const issues: ImportIssue[] = [];

  if (!isRecord(value) || !isRecord(value.topics)) {
    issues.push(
      issue(
        "invalid_map",
        'Маппинг тем должен быть объектом вида { "topics": { "Тема в файле": { "category": "...", "topic": "..." } } }.',
      ),
    );
    return { map, issues };
  }

  if (value.version !== undefined && value.version !== 1) {
    issues.push(
      issue(
        "invalid_map",
        `Неподдерживаемая версия маппинга: ${String(value.version)}. Ожидается version = 1.`,
      ),
    );
    return { map, issues };
  }

  for (const [sourceTopic, rawTarget] of Object.entries(value.topics)) {
    const normalizedSource = sourceTopic.trim();
    if (!normalizedSource) {
      issues.push(issue("invalid_map", "В маппинге есть пустое название темы."));
      continue;
    }

    if (!isRecord(rawTarget)) {
      issues.push(
        issue("invalid_map", `Маппинг темы «${normalizedSource}» должен быть объектом.`, {
          sourceTopic: normalizedSource,
        }),
      );
      continue;
    }

    const category = readString(rawTarget.category);
    const topic = readString(rawTarget.topic);
    const title = readString(rawTarget.title);

    if (!SLUG_PATTERN.test(category) || !SLUG_PATTERN.test(topic)) {
      issues.push(
        issue(
          "invalid_map",
          `Маппинг темы «${normalizedSource}»: category и topic должны быть slug-ами из строчных латинских букв, цифр и дефисов.`,
          { sourceTopic: normalizedSource },
        ),
      );
      continue;
    }

    map.set(normalizedSource, {
      category,
      topic,
      ...(title ? { title } : {}),
    });
  }

  if (map.size === 0 && issues.length === 0) {
    issues.push(issue("invalid_map", "Маппинг тем пуст."));
  }

  return { map, issues };
}

/** Достаёт массив вопросов из файла `forms_writer`. */
export function parseFormsWriterFile(value: unknown): {
  questions: unknown[];
  issues: ImportIssue[];
} {
  if (Array.isArray(value)) {
    return { questions: value, issues: [] };
  }

  if (isRecord(value) && Array.isArray(value.questions)) {
    return { questions: value.questions, issues: [] };
  }

  return {
    questions: [],
    issues: [
      issue(
        "invalid_file",
        'Ожидается массив вопросов или объект { "questions": [ ... ] } в формате forms_writer.',
      ),
    ],
  };
}

type ValidationResult = {
  item: ImportItem | null;
  issues: ImportIssue[];
  /** Предупреждения по самому вопросу; попадают в отчёт, только если вопрос остался в плане. */
  warnings?: ImportIssue[];
};

function validateQuestion(raw: unknown, index: number, map: TopicMap): ValidationResult {
  const position = index + 1;
  const issues: ImportIssue[] = [];

  if (!isRecord(raw)) {
    return {
      item: null,
      issues: [
        issue("invalid_item", `Вопрос #${position} должен быть объектом.`, { index: position }),
      ],
    };
  }

  const sourceTopic = readString(raw.topic);
  if (!sourceTopic) {
    return {
      item: null,
      issues: [
        issue("empty_topic", `Вопрос #${position}: не указана тема (поле topic).`, {
          index: position,
        }),
      ],
    };
  }

  const target = map.get(sourceTopic);
  if (!target) {
    return {
      item: null,
      issues: [
        issue(
          "unknown_topic",
          `Вопрос #${position}: тема «${sourceTopic}» отсутствует в scripts/import/topic-map.json.`,
          { index: position, sourceTopic },
        ),
      ],
    };
  }

  const text = readString(raw.question);
  if (!text) {
    return {
      item: null,
      issues: [
        issue("empty_question", `Вопрос #${position}: пустой текст вопроса.`, {
          index: position,
          sourceTopic,
        }),
      ],
    };
  }

  if (!Array.isArray(raw.options)) {
    return {
      item: null,
      issues: [
        issue("missing_options", `Вопрос #${position}: не найден массив вариантов (options).`, {
          index: position,
          sourceTopic,
        }),
      ],
    };
  }

  if (raw.options.length !== OPTIONS_PER_QUESTION) {
    return {
      item: null,
      issues: [
        issue(
          "options_count",
          `Вопрос #${position}: нужно ровно ${OPTIONS_PER_QUESTION} варианта, найдено ${raw.options.length}.`,
          { index: position, sourceTopic },
        ),
      ],
    };
  }

  const options: string[] = [];
  for (const [optionIndex, rawOption] of raw.options.entries()) {
    const optionText = readString(rawOption);
    if (!optionText) {
      return {
        item: null,
        issues: [
          issue("empty_option", `Вопрос #${position}: пустой вариант ответа №${optionIndex + 1}.`, {
            index: position,
            sourceTopic,
          }),
        ],
      };
    }
    options.push(optionText);
  }

  const normalizedOptions = options.map(normalizeForHash);
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    return {
      item: null,
      issues: [
        issue("duplicate_option", `Вопрос #${position}: варианты ответа повторяются.`, {
          index: position,
          sourceTopic,
        }),
      ],
    };
  }

  const correctIndex = raw.correct_index;
  if (
    typeof correctIndex !== "number" ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= options.length
  ) {
    return {
      item: null,
      issues: [
        issue(
          "invalid_correct_index",
          `Вопрос #${position}: correct_index должен быть целым числом от 0 до ${options.length - 1}.`,
          { index: position, sourceTopic },
        ),
      ],
    };
  }

  const explanation = readString(raw.explanation);
  const warnings: ImportIssue[] = [];
  if (!explanation) {
    warnings.push(
      issue(
        "missing_explanation",
        `Вопрос #${position}: нет объяснения — такой вопрос сохраняется как черновик и не показывается пользователям; уже опубликованный вопрос остаётся как есть.`,
        { index: position, sourceTopic, severity: "warning" },
      ),
    );
  }

  const context = readString(raw.context) || null;

  return {
    item: {
      index: position,
      sourceTopic,
      categorySlug: target.category,
      topicSlug: target.topic,
      text,
      explanation,
      context,
      options,
      correctIndex,
      contentHash: buildContentHash({
        topic: target.topic,
        text,
        options,
        correctIndex,
      }),
      status: explanation ? "PUBLISHED" : "DRAFT",
    },
    issues,
    warnings,
  };
}

/**
 * Полный план импорта: разбирает файл, валидирует вопросы и убирает дубликаты
 * внутри файла. В БД ничего не пишет.
 */
export function planImport(fileValue: unknown, map: TopicMap): ImportPlan {
  const parsed = parseFormsWriterFile(fileValue);
  if (parsed.issues.length > 0) {
    return { items: [], issues: parsed.issues };
  }

  if (parsed.questions.length === 0) {
    return {
      items: [],
      issues: [issue("empty_file", "В файле нет вопросов.")],
    };
  }

  const items: ImportItem[] = [];
  const issues: ImportIssue[] = [...parsed.issues];
  const seenHashes = new Map<string, number>();
  const seenTexts = new Map<string, number>();
  // Предупреждения по вопросу копим отдельно: дубль может вытеснить вопрос из
  // плана, и тогда его предупреждения не должны попадать в отчёт.
  const itemWarnings: ImportIssue[][] = [];

  for (const [index, raw] of parsed.questions.entries()) {
    const result = validateQuestion(raw, index, map);
    issues.push(...result.issues);
    if (!result.item) continue;

    const item = result.item;
    const duplicatePosition = seenHashes.get(item.contentHash);
    if (duplicatePosition !== undefined) {
      const existing = items[duplicatePosition];
      if (existing && existing.status === "DRAFT" && item.status === "PUBLISHED") {
        // Дубль без объяснения не должен вытеснять полноценный вопрос.
        items[duplicatePosition] = item;
        itemWarnings[duplicatePosition] = result.warnings ?? [];
        issues.push(
          issue(
            "duplicate_in_file",
            `Вопрос #${item.index} повторяет вопрос #${existing.index}, но содержит объяснение; использован вариант #${item.index}.`,
            {
              index: item.index,
              sourceTopic: item.sourceTopic,
              severity: "warning",
            },
          ),
        );
      } else {
        issues.push(
          issue(
            "duplicate_in_file",
            `Вопрос #${item.index} повторяет вопрос #${existing?.index ?? "?"} («${item.sourceTopic}»), пропущен.`,
            {
              index: item.index,
              sourceTopic: item.sourceTopic,
              severity: "warning",
            },
          ),
        );
      }
      continue;
    }

    const textKey = `${item.topicSlug}\u001f${normalizeForHash(item.text)}`;
    const sameTextPosition = seenTexts.get(textKey);
    if (sameTextPosition !== undefined) {
      const sameTextIndex = items[sameTextPosition]?.index ?? "?";
      issues.push(
        issue(
          "conflicting_duplicate",
          `Вопрос #${item.index}: тот же текст, что у вопроса #${sameTextIndex}, но другие варианты или правильный ответ. Вопрос пропущен — проверьте содержание.`,
          {
            index: item.index,
            sourceTopic: item.sourceTopic,
            severity: "warning",
          },
        ),
      );
      continue;
    }

    seenHashes.set(item.contentHash, items.length);
    seenTexts.set(textKey, items.length);
    itemWarnings.push(result.warnings ?? []);
    items.push(item);
  }

  issues.push(...itemWarnings.flat());

  return { items, issues };
}

/** Есть ли в отчёте ошибки, из-за которых импорт нельзя считать успешным. */
export function hasErrors(issues: ImportIssue[]): boolean {
  return issues.some((item) => item.severity === "error");
}
