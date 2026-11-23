/**
 * Импорт вопросов из `forms_writer` в базу (CNT-01).
 *
 * Запуск:
 *   npm run db:import -- --file ../forms_writer/samples/questions.json --dry-run
 *
 * Идемпотентность: вопрос определяется по `contentHash`, который не зависит от
 * порядка вариантов. Повторный импорт того же файла ничего не создаёт.
 *
 * Опубликованные вопросы не снимаются с публикации автоматически: если в новом
 * файле у вопроса нет объяснения, уже опубликованная версия остаётся как есть.
 *
 * Изменение текста или вариантов считается новой версией: старая версия
 * переводится в `ARCHIVED`, новая создаётся. Так прогресс не привязывается к
 * устаревшей формулировке, а в теме не появляются два «правильных» вопроса.
 *
 * Демо-контент: после импорта вопросы с `isDemo = true` в затронутых темах
 * скрываются (`ARCHIVED`), но только если в теме есть опубликованный реальный
 * вопрос. Флаг `--keep-demo` это поведение отключает.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

import { hasErrors, normalizeForHash, parseTopicMap, planImport } from "../lib/content/import.ts";
import { computeTopicAggregate } from "../lib/progress/topicAggregate.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MAP = path.join(scriptDir, "import", "topic-map.json");

/** В forms_writer сложности нет; 2 — середина шкалы. */
const DEFAULT_DIFFICULTY = 2;

/** Нужен, чтобы фатальные ошибки в режиме --json тоже печатались как JSON. */
let jsonMode = false;

/**
 * @typedef {Object} Args
 * @property {string | null} file
 * @property {string} map
 * @property {boolean} dryRun
 * @property {boolean} createTopics
 * @property {boolean} keepDemo
 * @property {boolean} strict
 * @property {boolean} json
 * @property {string | null} report
 * @property {boolean} help
 */

function printUsage() {
  console.log(`Импорт вопросов из forms_writer.

Использование:
  npm run db:import -- --file <path> [опции]

Опции:
  --file <path>      JSON-файл forms_writer ({ "questions": [...] })
  --map <path>       маппинг тем (по умолчанию scripts/import/topic-map.json)
  --dry-run          показать план без записи в БД
  --create-topics    создавать отсутствующие темы из маппинга
  --keep-demo        не скрывать демо-вопросы в темах с реальным контентом
  --strict           откатить всё, если есть ошибки валидации
  --json             вывести только JSON-отчёт (для CI)
  --report <path>    сохранить JSON-отчёт в файл
  --help             эта справка`);
}

/**
 * @param {string[]} argv
 * @returns {Args}
 */
function parseArgs(argv) {
  /** @type {Args} */
  const args = {
    file: null,
    map: DEFAULT_MAP,
    dryRun: false,
    createTopics: false,
    keepDemo: false,
    strict: false,
    json: false,
    report: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (raw === undefined) continue;

    const hasInline = raw.startsWith("--") && raw.includes("=");
    const flag = hasInline ? raw.slice(0, raw.indexOf("=")) : raw;
    const inlineValue = hasInline ? raw.slice(raw.indexOf("=") + 1) : null;

    const takeValue = (name) => {
      if (inlineValue !== null && inlineValue !== "") return inlineValue;
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error(`Для ${name} нужно значение.`);
      }
      index += 1;
      return next;
    };

    const takeBoolean = (defaultValue) => {
      if (inlineValue === null) return defaultValue;
      return !["false", "0", "no", "off"].includes(inlineValue.toLowerCase());
    };

    switch (flag) {
      case "--file":
        args.file = takeValue("--file");
        break;
      case "--map":
        args.map = takeValue("--map");
        break;
      case "--report":
        args.report = takeValue("--report");
        break;
      case "--dry-run":
        args.dryRun = takeBoolean(true);
        break;
      case "--create-topics":
        args.createTopics = takeBoolean(true);
        break;
      case "--keep-demo":
        args.keepDemo = takeBoolean(true);
        break;
      case "--strict":
        args.strict = takeBoolean(true);
        break;
      case "--json":
        args.json = takeBoolean(true);
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        if (raw.startsWith("-")) {
          throw new Error(`Неизвестная опция: ${raw}`);
        }
        if (args.file) {
          throw new Error(`Лишний аргумент: ${raw}`);
        }
        args.file = raw;
    }
  }

  return args;
}

/**
 * @param {string} filePath
 * @param {string} label
 * @returns {Promise<unknown>}
 */
async function loadJson(filePath, label) {
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`${label} не найден: ${filePath}`);
  }

  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} — некорректный JSON (${filePath}): ${reason}`);
  }
}

/**
 * @typedef {Object} TopicRow
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} status
 * @property {string} category_slug
 */

/**
 * @typedef {Object} TopicStats
 * @property {string} sourceTopic
 * @property {string} topicSlug
 * @property {string} categorySlug
 * @property {number} created
 * @property {number} updated
 * @property {number} replaced
 * @property {number} skipped
 * @property {number} draft
 * @property {boolean} topicCreated
 */

/**
 * @typedef {Object} CacheQuestion
 * @property {string} id
 * @property {string} text
 * @property {string} status
 * @property {boolean} isDemo
 * @property {string | null} contentHash
 * @property {string} explanation
 */

/**
 * @typedef {Object} TopicCache
 * @property {CacheQuestion[]} rows
 * @property {Map<string, CacheQuestion[]>} byText
 */

/**
 * @typedef {Object} ResolvedTarget
 * @property {string} slug
 * @property {string | null} id id = null только в dry-run при создании новой темы
 * @property {string} title
 * @property {string} categorySlug
 * @property {string} status
 * @property {boolean} created
 * @property {Object} target
 * @property {string} target.category
 * @property {string} target.topic
 * @property {string} [target.title]
 * @property {string} sourceTopic
 */

/**
 * @param {Client} client
 * @param {Object} target
 * @param {string} sourceTopic
 * @param {Map<string, string>} categories
 * @param {Map<string, TopicRow>} topics
 * @param {boolean} createTopics
 * @param {boolean} dryRun
 * @param {Date} now
 * @returns {Promise<ResolvedTarget | null>}
 */
async function ensureTopic(
  client,
  target,
  sourceTopic,
  categories,
  topics,
  createTopics,
  dryRun,
  now,
) {
  const existing = topics.get(target.topic);
  if (existing) {
    return {
      slug: existing.slug,
      id: existing.id,
      title: existing.title,
      categorySlug: existing.category_slug,
      status: existing.status,
      created: false,
      target,
      sourceTopic,
    };
  }

  const categoryId = categories.get(target.category);
  if (!categoryId) {
    return null;
  }

  const title = target.title ?? sourceTopic;

  if (!createTopics) {
    return null;
  }

  if (dryRun) {
    return {
      slug: target.topic,
      id: null,
      title,
      categorySlug: target.category,
      status: "PUBLISHED",
      created: true,
      target,
      sourceTopic,
    };
  }

  const orderResult = await client.query(
    `SELECT COALESCE(MAX("order"), -1) + 1 AS next_order FROM "Topic" WHERE "categoryId" = $1`,
    [categoryId],
  );
  const nextOrder = orderResult.rows[0]?.next_order ?? 0;
  const id = randomUUID();

  await client.query(
    `INSERT INTO "Topic" (id, "categoryId", slug, title, description, "order", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NULL, $5, 'PUBLISHED', $6, $6)`,
    [id, categoryId, target.topic, title, nextOrder, now],
  );

  topics.set(target.topic, {
    id,
    slug: target.topic,
    title,
    status: "PUBLISHED",
    category_slug: target.category,
  });

  return {
    slug: target.topic,
    id,
    title,
    categorySlug: target.category,
    status: "PUBLISHED",
    created: true,
    target,
    sourceTopic,
  };
}

/**
 * @param {Client} client
 * @param {string} topicId
 * @returns {Promise<TopicCache>}
 */
async function loadTopicCache(client, topicId) {
  const result = await client.query(
    `SELECT id, text, status, "isDemo", "contentHash", explanation
       FROM "Question"
      WHERE "topicId" = $1`,
    [topicId],
  );

  /** @type {TopicCache} */
  const cache = { rows: result.rows, byText: new Map() };

  for (const row of cache.rows) {
    const key = normalizeForHash(row.text);
    const group = cache.byText.get(key);
    if (group) {
      group.push(row);
    } else {
      cache.byText.set(key, [row]);
    }
  }

  return cache;
}

/**
 * @param {Client} client
 * @param {Object} item элемент ImportItem
 * @param {string} topicId
 * @param {Date} now
 * @returns {Promise<void>}
 */
async function insertQuestion(client, item, topicId, now) {
  const questionId = randomUUID();

  await client.query(
    `INSERT INTO "Question"
       (id, "topicId", type, text, explanation, difficulty, status, "isDemo", "contentHash", version, "createdAt", "updatedAt")
     VALUES ($1, $2, 'SINGLE_CHOICE', $3, $4, $5, $6, false, $7, 1, $8, $8)`,
    [
      questionId,
      topicId,
      item.text,
      item.explanation,
      DEFAULT_DIFFICULTY,
      item.status,
      item.contentHash,
      now,
    ],
  );

  /** @type {unknown[]} */
  const params = [];
  const tuples = item.options.map((optionText, optionIndex) => {
    const base = params.length;
    params.push(
      randomUUID(),
      questionId,
      optionText,
      optionIndex === item.correctIndex,
      optionIndex,
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  });

  await client.query(
    `INSERT INTO "QuestionOption" (id, "questionId", text, "isCorrect", "order")
     VALUES ${tuples.join(", ")}`,
    params,
  );
}

/**
 * @typedef {Object} ImportOutcome
 * @property {"created" | "updated" | "replaced" | "skipped"} outcome
 * @property {string | null} warning
 */

/**
 * Импортирует один вопрос и обновляет кэш темы, чтобы последующие проверки
 * внутри того же запуска видели уже принятые решения.
 *
 * @param {Client} client
 * @param {Object} item элемент ImportItem
 * @param {string} topicId
 * @param {TopicCache} cache
 * @param {boolean} dryRun
 * @param {Date} now
 * @returns {Promise<ImportOutcome>}
 */
async function importItem(client, item, topicId, cache, dryRun, now) {
  // Демо-вопросы не участвуют в дедупликации: иначе реальный вопрос, совпавший
  // с демо по тексту, «растворился» бы в демо-строке и остался скрытым.
  const hashMatches = cache.rows.filter(
    (row) => !row.isDemo && row.contentHash === item.contentHash,
  );

  if (hashMatches.length > 1) {
    // Уникального индекса на contentHash нет: чинить дубли — отдельная задача.
    // Здесь важно хотя бы не молчать.
    const warning = `в теме несколько вопросов с одинаковым contentHash (${hashMatches.length}); обновлён первый.`;
    const row = hashMatches[0];
    if (!row) return { outcome: "skipped", warning };

    if (row.status === "ARCHIVED") {
      return {
        outcome: "skipped",
        warning: `${warning} вопрос в архиве и не будет опубликован.`,
      };
    }

    if (item.status === "DRAFT" && row.status === "PUBLISHED") {
      return {
        outcome: "skipped",
        warning: `${warning} вопрос уже опубликован, черновик из файла не применяется.`,
      };
    }

    if (row.explanation !== item.explanation || row.status !== item.status) {
      if (!dryRun) {
        await client.query(
          `UPDATE "Question"
              SET explanation = $2, status = $3, version = version + 1, "updatedAt" = $4
            WHERE id = $1`,
          [row.id, item.explanation, item.status, now],
        );
      }
      row.explanation = item.explanation;
      row.status = item.status;
      return { outcome: "updated", warning };
    }

    return { outcome: "skipped", warning };
  }

  const row = hashMatches[0];

  if (row) {
    if (row.status === "ARCHIVED") {
      return {
        outcome: "skipped",
        warning:
          "вопрос в архиве; повторная публикация из файла не выполняется, чтобы не отменять решение редактора.",
      };
    }

    if (item.status === "DRAFT" && row.status === "PUBLISHED") {
      return {
        outcome: "skipped",
        warning:
          "в файле нет объяснения, но вопрос уже опубликован — оставлен как есть. Черновик не применяется.",
      };
    }

    if (row.explanation === item.explanation && row.status === item.status) {
      return { outcome: "skipped", warning: null };
    }

    if (!dryRun) {
      await client.query(
        `UPDATE "Question"
            SET explanation = $2, status = $3, version = version + 1, "updatedAt" = $4
          WHERE id = $1`,
        [row.id, item.explanation, item.status, now],
      );
    }
    row.explanation = item.explanation;
    row.status = item.status;
    return { outcome: "updated", warning: null };
  }

  // Хеша нет, но текст совпадает: это исправленная версия вопроса.
  // Демо-вопросы не считаем версией: это заглушка, её скрывает отдельный шаг.
  const textKey = normalizeForHash(item.text);
  const previousVersions = (cache.byText.get(textKey) ?? []).filter((row) => !row.isDemo);
  const hasLivePrevious = previousVersions.some((row) => row.status !== "ARCHIVED");

  // Нельзя архивировать живой вопрос ради черновика без объяснения: пользователь
  // потеряет вопрос из каталога и тренировок.
  if (item.status === "DRAFT" && hasLivePrevious) {
    return {
      outcome: "skipped",
      warning:
        "в файле нет объяснения, но вопрос с таким текстом уже есть в теме — оставлен как есть. Черновик не применяется.",
    };
  }

  for (const previous of previousVersions) {
    if (previous.status !== "ARCHIVED") {
      if (!dryRun) {
        await client.query(
          `UPDATE "Question" SET status = 'ARCHIVED', "updatedAt" = $2 WHERE id = $1`,
          [previous.id, now],
        );
      }
      previous.status = "ARCHIVED";
    }
  }

  if (!dryRun) {
    await insertQuestion(client, item, topicId, now);
  }

  const inserted = {
    id: randomUUID(),
    text: item.text,
    status: item.status,
    isDemo: false,
    contentHash: item.contentHash,
    explanation: item.explanation,
  };
  cache.rows.push(inserted);
  const group = cache.byText.get(textKey);
  if (group) {
    group.push(inserted);
  } else {
    cache.byText.set(textKey, [inserted]);
  }

  if (previousVersions.length > 0) {
    return {
      outcome: "replaced",
      warning: "новая версия вопроса: предыдущая формулировка переведена в архив.",
    };
  }

  return { outcome: "created", warning: null };
}

/**
 * Пересчитывает агрегаты темы для всех пользователей, у которых уже есть
 * `TopicProgress`. После импорта меняется `totalQuestions`, а после архивации
 * демо — ещё и состав вопросов; иначе каталог и «Мои результаты» расходятся.
 *
 * @param {Client} client
 * @param {string} topicId
 * @param {Date} now
 * @returns {Promise<number>} сколько записей пересчитано
 */
async function recalculateTopicProgress(client, topicId, now) {
  const users = await client.query(
    `SELECT id, "userId" FROM "TopicProgress" WHERE "topicId" = $1`,
    [topicId],
  );
  if (users.rows.length === 0) return 0;

  const totalResult = await client.query(
    `SELECT COUNT(*)::int AS total
       FROM "Question"
      WHERE "topicId" = $1 AND status = 'PUBLISHED'`,
    [topicId],
  );
  const totalQuestions = totalResult.rows[0]?.total ?? 0;

  for (const user of users.rows) {
    const progressResult = await client.query(
      `SELECT qp."masteryLevel", qp."seenCount", qp."correctCount"
         FROM "QuestionProgress" qp
         JOIN "Question" q ON q.id = qp."questionId"
        WHERE qp."userId" = $1
          AND q."topicId" = $2
          AND q.status = 'PUBLISHED'`,
      [user.userId, topicId],
    );

    const aggregate = computeTopicAggregate(totalQuestions, progressResult.rows);

    await client.query(
      `UPDATE "TopicProgress"
          SET "totalQuestions" = $3,
              "seenQuestions" = $4,
              "masteredQuestions" = $5,
              "answeredCount" = $6,
              "correctCount" = $7,
              "masteryPoints" = $8,
              progress = $9,
              coverage = $10,
              quality = $11,
              accuracy = $12,
              level = $13,
              "updatedAt" = $14
        WHERE id = $1 AND "topicId" = $2`,
      [
        user.id,
        topicId,
        aggregate.totalQuestions,
        aggregate.seenQuestions,
        aggregate.masteredQuestions,
        aggregate.answeredCount,
        aggregate.correctCount,
        aggregate.masteryPoints,
        aggregate.progress,
        aggregate.coverage,
        aggregate.quality,
        aggregate.accuracy,
        aggregate.level,
        now,
      ],
    );
  }

  return users.rows.length;
}

/**
 * @param {Array<{severity: string}>} issues
 * @returns {{errors: number, warnings: number}}
 */
function countBySeverity(issues) {
  return {
    errors: issues.filter((item) => item.severity === "error").length,
    warnings: issues.filter((item) => item.severity === "warning").length,
  };
}

/**
 * @param {Array<{severity: string, index: number | null, sourceTopic: string | null, message: string}>} issues
 */
function printIssues(issues) {
  for (const item of issues) {
    const prefix = item.severity === "error" ? "Ошибка" : "Предупреждение";
    const position = item.index === null ? "" : `#${item.index} `;
    const topic = item.sourceTopic ? `[${item.sourceTopic}] ` : "";
    console.log(`${prefix}: ${topic}${position}${item.message}`);
  }
}

/** @returns {Promise<number>} код завершения процесса */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  jsonMode = args.json;

  if (args.help) {
    printUsage();
    return 0;
  }

  if (!args.file) {
    printUsage();
    return 1;
  }

  const mapValue = await loadJson(args.map, "Маппинг тем");
  const parsedMap = parseTopicMap(mapValue);
  const map = parsedMap.map;
  const fileValue = await loadJson(args.file, "Файл вопросов");
  const plan = planImport(fileValue, map);

  const issues = [...parsedMap.issues, ...plan.issues];

  if (hasErrors(parsedMap.issues) || plan.items.length === 0) {
    if (args.json) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            file: path.resolve(args.file),
            map: path.resolve(args.map),
            dryRun: args.dryRun,
            counts: {
              total: 0,
              created: 0,
              updated: 0,
              replaced: 0,
              skipped: 0,
              notImported: plan.items.length,
              draft: 0,
              demoArchived: 0,
              withContext: 0,
              ...countBySeverity(issues),
            },
            topics: [],
            issues,
          },
          null,
          2,
        ),
      );
    } else {
      printIssues(issues);
      console.log("Импорт не выполнен: нет вопросов, готовых к загрузке.");
    }
    return 1;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL не задан. Проверьте .env или переменные окружения.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  const now = new Date();
  const useTransaction = !args.dryRun;

  const counts = {
    total: plan.items.length,
    created: 0,
    updated: 0,
    replaced: 0,
    skipped: 0,
    notImported: 0,
    draft: 0,
    demoArchived: 0,
    withContext: plan.items.filter((item) => item.context !== null).length,
  };

  /** @type {Map<string, TopicStats>} */
  const topicStats = new Map();
  /** @type {Map<string, ResolvedTarget>} */
  const resolved = new Map();
  /** @type {Map<string, TopicCache>} */
  const caches = new Map();
  let progressRecalculated = 0;

  try {
    if (useTransaction) {
      await client.query("BEGIN");
    }

    const categoryResult = await client.query(`SELECT id, slug FROM "Category"`);
    const categories = new Map(categoryResult.rows.map((row) => [row.slug, row.id]));

    const topicResult = await client.query(
      `SELECT t.id, t.slug, t.title, t.status, c.slug AS category_slug
         FROM "Topic" t
         JOIN "Category" c ON c.id = t."categoryId"`,
    );
    /** @type {Map<string, TopicRow>} */
    const topics = new Map(topicResult.rows.map((row) => [row.slug, row]));

    // Один и тот же slug темы может встречаться у нескольких исходных тем.
    for (const item of plan.items) {
      if (resolved.has(item.topicSlug)) continue;

      const target = map.get(item.sourceTopic);
      if (!target) continue;

      const ensured = await ensureTopic(
        client,
        target,
        item.sourceTopic,
        categories,
        topics,
        args.createTopics,
        args.dryRun,
        now,
      );

      if (ensured) {
        resolved.set(item.topicSlug, ensured);

        if (ensured.status !== "PUBLISHED") {
          issues.push({
            index: item.index,
            sourceTopic: item.sourceTopic,
            code: "topic_archived",
            severity: "warning",
            message: `Тема «${ensured.title}» (${ensured.categorySlug}/${ensured.slug}) не опубликована: вопросы загрузятся, но пользователи их не увидят.`,
          });
        }
        continue;
      }

      const categoryMissing = !categories.has(target.category);
      issues.push({
        index: item.index,
        sourceTopic: item.sourceTopic,
        code: categoryMissing ? "unknown_category" : "topic_not_found",
        severity: "error",
        message: categoryMissing
          ? `Раздел «${target.category}» из маппинга не найден в каталоге; вопрос #${item.index} и остальные вопросы темы не импортированы.`
          : `Тема «${target.topic}» (${target.category}) не найдена в каталоге; вопрос #${item.index} и остальные вопросы темы не импортированы. Создайте её вручную или запустите с --create-topics.`,
      });
      resolved.set(item.topicSlug, {
        slug: item.topicSlug,
        id: "__missing__",
        title: "",
        categorySlug: item.categorySlug,
        status: "MISSING",
        created: false,
        target,
        sourceTopic: item.sourceTopic,
      });
    }

    for (const item of plan.items) {
      const target = resolved.get(item.topicSlug);
      if (!target || target.id === "__missing__") {
        counts.notImported += 1;
        continue;
      }

      const slug = target.slug;
      const stats = topicStats.get(slug) ?? {
        sourceTopic: item.sourceTopic,
        topicSlug: slug,
        categorySlug: target.categorySlug,
        created: 0,
        updated: 0,
        replaced: 0,
        skipped: 0,
        draft: 0,
        topicCreated: target.created,
      };

      let outcome = "created";
      let warning = null;

      if (target.id === null) {
        // dry-run + --create-topics: темы ещё нет, значит вопрос точно новый.
        counts.created += 1;
        stats.created += 1;
      } else {
        let cache = caches.get(target.id);
        if (!cache) {
          cache = await loadTopicCache(client, target.id);
          caches.set(target.id, cache);
        }

        const result = await importItem(client, item, target.id, cache, args.dryRun, now);
        outcome = result.outcome;
        warning = result.warning;
        counts[outcome] += 1;
        stats[outcome] += 1;

        if (warning) {
          issues.push({
            index: item.index,
            sourceTopic: item.sourceTopic,
            code: outcome === "skipped" ? "existing_question" : "new_version",
            severity: "warning",
            message: `Вопрос #${item.index}: ${warning}`,
          });
        }
      }

      if (item.status === "DRAFT" && outcome !== "skipped") {
        counts.draft += 1;
        stats.draft += 1;
      }

      topicStats.set(slug, stats);
    }

    if (!args.keepDemo) {
      for (const stats of topicStats.values()) {
        const target = resolved.get(stats.topicSlug);
        if (!target || target.id === null || target.id === "__missing__") continue;

        const cache = caches.get(target.id);
        if (!cache) continue;

        const publishedReal = cache.rows.filter(
          (row) => !row.isDemo && row.status === "PUBLISHED",
        ).length;
        if (publishedReal === 0) continue;

        const demoRows = cache.rows.filter((row) => row.isDemo && row.status === "PUBLISHED");
        if (demoRows.length === 0) continue;

        if (!args.dryRun) {
          await client.query(
            `UPDATE "Question"
                SET status = 'ARCHIVED', "updatedAt" = $2
              WHERE "topicId" = $1
                AND "isDemo" = true
                AND status = 'PUBLISHED'`,
            [target.id, now],
          );
        }

        for (const row of demoRows) {
          row.status = "ARCHIVED";
        }
        counts.demoArchived += demoRows.length;
      }
    }

    if (!args.dryRun) {
      for (const stats of topicStats.values()) {
        const target = resolved.get(stats.topicSlug);
        if (!target || target.id === null || target.id === "__missing__") continue;
        progressRecalculated += await recalculateTopicProgress(client, target.id, now);
      }
    }

    const severityBeforeCommit = countBySeverity(issues);
    if (args.strict && severityBeforeCommit.errors > 0) {
      throw new Error(
        `--strict: найдено ошибок ${severityBeforeCommit.errors}, изменения отменены.`,
      );
    }

    if (useTransaction) {
      await client.query("COMMIT");
    }
  } catch (error) {
    if (useTransaction) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  } finally {
    await client.end();
  }

  const severity = countBySeverity(issues);
  const report = {
    ok: severity.errors === 0,
    file: path.resolve(args.file),
    map: path.resolve(args.map),
    dryRun: args.dryRun,
    createTopics: args.createTopics,
    keepDemo: args.keepDemo,
    strict: args.strict,
    counts: { ...counts, progressRecalculated, ...severity },
    topics: [...topicStats.values()],
    issues,
  };

  if (args.report) {
    await mkdir(path.dirname(path.resolve(args.report)), { recursive: true });
    await writeFile(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Импорт вопросов${args.dryRun ? " (dry-run, без записи)" : ""}`);
    console.log(`Файл: ${report.file}`);
    console.log(
      `Всего: ${counts.total}, создано: ${counts.created}, обновлено: ${counts.updated}, новых версий: ${counts.replaced}, пропущено: ${counts.skipped}, черновиков: ${counts.draft}`,
    );
    if (counts.notImported > 0) {
      console.log(`Не импортировано из-за отсутствия темы: ${counts.notImported}`);
    }
    if (!args.keepDemo) {
      console.log(
        `${args.dryRun ? "Будет скрыто" : "Скрыто"} демо-вопросов в темах с реальным контентом: ${counts.demoArchived}`,
      );
    }
    if (!args.dryRun) {
      console.log(`Пересчитано записей прогресса по темам: ${progressRecalculated}`);
    }
    console.log(
      `С «завязкой» (context): ${counts.withContext} из ${counts.total} — в БД пока не сохраняется.`,
    );
    for (const stats of topicStats.values()) {
      const title = resolved.get(stats.topicSlug)?.title ?? stats.topicSlug;
      const createdMark = stats.topicCreated ? " [тема создана]" : "";
      console.log(
        `- ${title} (${stats.categorySlug}/${stats.topicSlug})${createdMark}: создано ${stats.created}, обновлено ${stats.updated}, новых версий ${stats.replaced}, пропущено ${stats.skipped}, черновиков ${stats.draft}`,
      );
    }
    printIssues(issues);
    console.log(`Ошибок: ${severity.errors}, предупреждений: ${severity.warnings}`);
  }

  return severity.errors > 0 ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    } else {
      console.error("Импорт не выполнен:", message);
    }
    process.exitCode = 1;
  });
