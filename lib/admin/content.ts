import type { Prisma } from "@/lib/generated/prisma/client";
import { ContentStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  buildContentHash,
  hasErrors,
  parseFormsWriterFile,
  planImport,
  type ImportIssue,
  type ImportItem,
  type ImportPlan,
  type TopicTarget,
} from "@/lib/content/import";
import { computeTopicAggregate } from "@/lib/progress/topicAggregate";
import { AdminContentError } from "@/lib/admin/errors";
import {
  planAdminImport,
  type AdminImportCounts,
  type AdminImportPlan,
  type ExistingImportQuestion,
} from "@/lib/admin/importPlan";
import { questionContentChanged } from "@/lib/admin/contentRules";
import type { ImportInput, QuestionInput, TopicInput } from "@/lib/admin/schemas";
import { isTopicThemeKey, type TopicThemeKey } from "@/lib/ui/topicThemes";

/**
 * Сервис контентной админки (CNT-04).
 *
 * Все чтения и записи — на сервере. Опубликованные вопросы не редактируются
 * «на лету»: при изменении текста или вариантов старая версия уходит в архив,
 * создаётся новая. Импорт сначала считает действия, потом применяет их в одной
 * транзакции.
 */

const MAX_IMPORT_QUESTIONS = 500;
const DEFAULT_DIFFICULTY = 2;
const TRANSACTION_TIMEOUT_MS = 20_000;

type Tx = Prisma.TransactionClient;

export type AdminCategoryOption = {
  id: string;
  slug: string;
  title: string;
};

export type AdminTopicListItem = {
  id: string;
  slug: string;
  title: string;
  status: ContentStatus;
  order: number;
  categoryId: string;
  categoryTitle: string;
  questionCount: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  demoCount: number;
};

export type AdminQuestionListItem = {
  id: string;
  text: string;
  status: ContentStatus;
  difficulty: number;
  version: number;
  isDemo: boolean;
  updatedAt: Date;
  optionsCount: number;
};

export type AdminTopicDetail = Omit<AdminTopicListItem, "questionCount" | "publishedCount" | "draftCount" | "archivedCount" | "demoCount"> & {
  description: string | null;
  coverUrl: string | null;
  /** Тема оформления: только известный ключ, иначе нейтрально. */
  themeKey: TopicThemeKey | null;
  questions: AdminQuestionListItem[];
};

export type AdminQuestionDetail = {
  id: string;
  topicId: string;
  topicSlug: string;
  topicTitle: string;
  text: string;
  explanation: string;
  imageUrl: string | null;
  imageLicense: string | null;
  imageSource: string | null;
  imageAlt: string | null;
  difficulty: number;
  status: ContentStatus;
  version: number;
  isDemo: boolean;
  options: { id: string; text: string; isCorrect: boolean; order: number }[];
};

export type AdminImportPreviewAction = {
  index: number;
  text: string;
  status: ImportItem["status"];
  kind: "create" | "update" | "replace" | "skip";
  warnings: { code: string; message: string }[];
};

export type AdminImportPreview = {
  topic: { id: string; title: string; slug: string; status: ContentStatus };
  counts: AdminImportCounts;
  issues: ImportIssue[];
  actions: AdminImportPreviewAction[];
};

export async function listAdminCategories(): Promise<AdminCategoryOption[]> {
  return prisma.category.findMany({
    orderBy: { order: "asc" },
    select: { id: true, slug: true, title: true },
  });
}

export async function listAdminTopics(): Promise<AdminTopicListItem[]> {
  const topics = await prisma.topic.findMany({
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      order: true,
      categoryId: true,
      category: { select: { title: true } },
      questions: { select: { status: true, isDemo: true } },
    },
  });

  return topics.map((topic) => ({
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    status: topic.status,
    order: topic.order,
    categoryId: topic.categoryId,
    categoryTitle: topic.category.title,
    questionCount: topic.questions.length,
    publishedCount: topic.questions.filter((question) => question.status === ContentStatus.PUBLISHED)
      .length,
    draftCount: topic.questions.filter((question) => question.status === ContentStatus.DRAFT).length,
    archivedCount: topic.questions.filter((question) => question.status === ContentStatus.ARCHIVED)
      .length,
    demoCount: topic.questions.filter((question) => question.isDemo).length,
  }));
}

export async function getAdminTopic(id: string): Promise<AdminTopicDetail | null> {
  const topic = await prisma.topic.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      coverUrl: true,
      themeKey: true,
      status: true,
      order: true,
      categoryId: true,
      category: { select: { title: true } },
      questions: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          text: true,
          status: true,
          difficulty: true,
          version: true,
          isDemo: true,
          updatedAt: true,
          options: { select: { id: true } },
        },
      },
    },
  });

  if (!topic) return null;

  return {
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    description: topic.description,
    coverUrl: topic.coverUrl,
    themeKey: isTopicThemeKey(topic.themeKey) ? topic.themeKey : null,
    status: topic.status,
    order: topic.order,
    categoryId: topic.categoryId,
    categoryTitle: topic.category.title,
    questions: topic.questions.map((question) => ({
      id: question.id,
      text: question.text,
      status: question.status,
      difficulty: question.difficulty,
      version: question.version,
      isDemo: question.isDemo,
      updatedAt: question.updatedAt,
      optionsCount: question.options.length,
    })),
  };
}

export async function getAdminQuestion(id: string): Promise<AdminQuestionDetail | null> {
  const question = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true,
      topicId: true,
      text: true,
      explanation: true,
      imageUrl: true,
      imageLicense: true,
      imageSource: true,
      imageAlt: true,
      difficulty: true,
      status: true,
      version: true,
      isDemo: true,
      topic: { select: { slug: true, title: true } },
      options: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, isCorrect: true, order: true },
      },
    },
  });

  if (!question) return null;

  return {
    id: question.id,
    topicId: question.topicId,
    topicSlug: question.topic.slug,
    topicTitle: question.topic.title,
    text: question.text,
    explanation: question.explanation,
    imageUrl: question.imageUrl,
    imageLicense: question.imageLicense,
    imageSource: question.imageSource,
    imageAlt: question.imageAlt,
    difficulty: question.difficulty,
    status: question.status,
    version: question.version,
    isDemo: question.isDemo,
    options: question.options,
  };
}

export async function createTopic(input: TopicInput): Promise<{ id: string; slug: string }> {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new AdminContentError("unknown_category", "Раздел не найден.", { status: 400 });
  }

  const existing = await prisma.topic.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (existing) {
    throw new AdminContentError("slug_taken", "Такой адрес темы уже занят.", {
      status: 409,
      details: { fields: { slug: "Этот адрес уже используется другой темой." } },
    });
  }

  let order = input.order;
  if (order === undefined) {
    const aggregate = await prisma.topic.aggregate({
      where: { categoryId: input.categoryId },
      _max: { order: true },
    });
    order = (aggregate._max.order ?? -1) + 1;
  }

  const topic = await prisma.topic.create({
    data: {
      categoryId: input.categoryId,
      slug: input.slug,
      title: input.title,
      description: input.description,
      coverUrl: input.coverUrl,
      themeKey: input.themeKey,
      order,
      status: input.status,
    },
    select: { id: true, slug: true },
  });

  return topic;
}

export async function updateTopic(id: string, input: TopicInput): Promise<{ id: string; slug: string }> {
  const existing = await prisma.topic.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) {
    throw new AdminContentError("unknown_topic", "Тема не найдена.", { status: 404 });
  }

  if (input.slug !== existing.slug) {
    const slugOwner = await prisma.topic.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (slugOwner) {
      throw new AdminContentError("slug_taken", "Такой адрес темы уже занят.", {
        status: 409,
        details: { fields: { slug: "Этот адрес уже используется другой темой." } },
      });
    }
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new AdminContentError("unknown_category", "Раздел не найден.", { status: 400 });
  }

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      slug: input.slug,
      title: input.title,
      description: input.description,
      coverUrl: input.coverUrl,
      themeKey: input.themeKey,
      order: input.order,
      status: input.status,
    },
    select: { id: true, slug: true },
  });

  return topic;
}

export async function archiveTopic(id: string): Promise<{ id: string }> {
  const existing = await prisma.topic.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new AdminContentError("unknown_topic", "Тема не найдена.", { status: 404 });
  }

  return prisma.topic.update({
    where: { id },
    data: { status: ContentStatus.ARCHIVED },
    select: { id: true },
  });
}

function questionCreateData(
  topicId: string,
  input: QuestionInput,
  contentHash: string,
  version: number,
) {
  return {
    topicId,
    type: "SINGLE_CHOICE" as const,
    text: input.text,
    explanation: input.explanation,
    imageUrl: input.imageUrl,
    imageLicense: input.imageLicense,
    imageSource: input.imageSource,
    imageAlt: input.imageAlt,
    difficulty: input.difficulty,
    status: input.status,
    isDemo: false,
    contentHash,
    version,
    options: {
      create: input.options.map((text, index) => ({
        text,
        isCorrect: index === input.correctIndex,
        order: index,
      })),
    },
  };
}

async function hideDemoIfRealPublished(tx: Tx, topicId: string): Promise<number> {
  const publishedReal = await tx.question.count({
    where: { topicId, status: ContentStatus.PUBLISHED, isDemo: false },
  });
  if (publishedReal === 0) return 0;

  const result = await tx.question.updateMany({
    where: { topicId, status: ContentStatus.PUBLISHED, isDemo: true },
    data: { status: ContentStatus.ARCHIVED },
  });

  return result.count;
}

async function recalculateTopicProgress(tx: Tx, topicId: string): Promise<number> {
  const users = await tx.topicProgress.findMany({
    where: { topicId },
    select: { id: true, userId: true },
  });
  if (users.length === 0) return 0;

  const totalQuestions = await tx.question.count({
    where: { topicId, status: ContentStatus.PUBLISHED },
  });

  const progressRows = await tx.questionProgress.findMany({
    where: { question: { topicId, status: ContentStatus.PUBLISHED } },
    select: { userId: true, masteryLevel: true, seenCount: true, correctCount: true },
  });

  const byUser = new Map<
    string,
    { masteryLevel: number; seenCount: number; correctCount: number }[]
  >();
  for (const row of progressRows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  for (const user of users) {
    const aggregate = computeTopicAggregate(totalQuestions, byUser.get(user.userId) ?? []);
    await tx.topicProgress.update({
      where: { id: user.id },
      data: {
        totalQuestions: aggregate.totalQuestions,
        seenQuestions: aggregate.seenQuestions,
        masteredQuestions: aggregate.masteredQuestions,
        answeredCount: aggregate.answeredCount,
        correctCount: aggregate.correctCount,
        masteryPoints: aggregate.masteryPoints,
        progress: aggregate.progress,
        coverage: aggregate.coverage,
        quality: aggregate.quality,
        accuracy: aggregate.accuracy,
        level: aggregate.level,
      },
    });
  }

  return users.length;
}

export async function createQuestion(
  topicId: string,
  input: QuestionInput,
): Promise<{ id: string }> {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { id: true, slug: true },
  });
  if (!topic) {
    throw new AdminContentError("unknown_topic", "Тема не найдена.", { status: 404 });
  }

  const contentHash = buildContentHash({
    topic: topic.slug,
    text: input.text,
    options: input.options,
    correctIndex: input.correctIndex,
  });

  const duplicate = await prisma.question.findFirst({
    where: {
      topicId,
      contentHash,
      isDemo: false,
      status: { not: ContentStatus.ARCHIVED },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new AdminContentError(
      "duplicate_question",
      "Такой вопрос уже есть в теме. Откройте его и отредактируйте.",
      { status: 409 },
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const question = await tx.question.create({
        data: questionCreateData(topicId, input, contentHash, 1),
        select: { id: true },
      });
      await hideDemoIfRealPublished(tx, topicId);
      await recalculateTopicProgress(tx, topicId);
      return { id: question.id };
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
}

export async function updateQuestion(
  id: string,
  input: QuestionInput,
): Promise<{ id: string; versioned: boolean }> {
  const existing = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true,
      topicId: true,
      text: true,
      explanation: true,
      imageUrl: true,
      imageLicense: true,
      imageSource: true,
      imageAlt: true,
      difficulty: true,
      status: true,
      version: true,
      isDemo: true,
      contentHash: true,
      topic: { select: { slug: true } },
      options: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, isCorrect: true, order: true },
      },
    },
  });
  if (!existing) {
    throw new AdminContentError("unknown_question", "Вопрос не найден.", { status: 404 });
  }

  const contentHash = buildContentHash({
    topic: existing.topic.slug,
    text: input.text,
    options: input.options,
    correctIndex: input.correctIndex,
  });

  const duplicate = await prisma.question.findFirst({
    where: {
      topicId: existing.topicId,
      contentHash,
      isDemo: false,
      id: { not: id },
      status: { not: ContentStatus.ARCHIVED },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new AdminContentError(
      "duplicate_question",
      "Такой вопрос уже есть в теме. Откройте его и отредактируйте.",
      { status: 409 },
    );
  }

  const contentChanged = questionContentChanged(existing, input);
  const shouldVersion = existing.status === ContentStatus.PUBLISHED && contentChanged;

  if (shouldVersion) {
    return prisma.$transaction(
      async (tx) => {
        await tx.question.update({
          where: { id },
          data: { status: ContentStatus.ARCHIVED },
        });

        const created = await tx.question.create({
          data: questionCreateData(existing.topicId, input, contentHash, existing.version + 1),
          select: { id: true },
        });

        await hideDemoIfRealPublished(tx, existing.topicId);
        await recalculateTopicProgress(tx, existing.topicId);

        return { id: created.id, versioned: true };
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }

  const metadataChanged =
    existing.explanation !== input.explanation ||
    existing.imageUrl !== input.imageUrl ||
    existing.imageLicense !== input.imageLicense ||
    existing.imageSource !== input.imageSource ||
    existing.imageAlt !== input.imageAlt ||
    existing.difficulty !== input.difficulty ||
    existing.status !== input.status;

  return prisma.$transaction(
    async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          text: input.text,
          explanation: input.explanation,
          imageUrl: input.imageUrl,
          imageLicense: input.imageLicense,
          imageSource: input.imageSource,
          imageAlt: input.imageAlt,
          difficulty: input.difficulty,
          status: input.status,
          contentHash,
          ...(contentChanged || metadataChanged ? { version: { increment: 1 } } : {}),
        },
      });

      for (const [index, optionText] of input.options.entries()) {
        const existingOption = existing.options[index];
        if (existingOption) {
          await tx.questionOption.update({
            where: { id: existingOption.id },
            data: { text: optionText, isCorrect: index === input.correctIndex, order: index },
          });
        } else {
          await tx.questionOption.create({
            data: {
              questionId: id,
              text: optionText,
              isCorrect: index === input.correctIndex,
              order: index,
            },
          });
        }
      }

      await hideDemoIfRealPublished(tx, existing.topicId);
      await recalculateTopicProgress(tx, existing.topicId);

      return { id, versioned: false };
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
}

export async function archiveQuestion(id: string): Promise<{ id: string }> {
  const existing = await prisma.question.findUnique({
    where: { id },
    select: { id: true, topicId: true },
  });
  if (!existing) {
    throw new AdminContentError("unknown_question", "Вопрос не найден.", { status: 404 });
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.question.update({
        where: { id },
        data: { status: ContentStatus.ARCHIVED },
      });
      await recalculateTopicProgress(tx, existing.topicId);
      return { id };
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );
}

type ImportBuild = {
  topic: {
    id: string;
    slug: string;
    title: string;
    status: ContentStatus;
    category: { slug: string };
  };
  plan: ImportPlan;
  adminPlan: AdminImportPlan;
};

/**
 * Импорт в админке всегда идёт в выбранную тему, поэтому пустое поле `topic`
 * заполняем slug-ом темы. Иначе файл без `topic` не прошёл бы валидацию, хотя
 * для редактора это лишний шаг: тему он уже выбрал в интерфейсе.
 */
function fillMissingTopic(value: unknown, fallbackTopic: string): unknown {
  const fill = (item: unknown): unknown => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return item;
    const record = item as Record<string, unknown>;
    const topic = typeof record.topic === "string" ? record.topic.trim() : "";
    return topic ? record : { ...record, topic: fallbackTopic };
  };

  if (Array.isArray(value)) return value.map(fill);

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.questions)) {
      return { ...record, questions: record.questions.map(fill) };
    }
  }

  return value;
}

async function buildImportPlan(input: ImportInput): Promise<ImportBuild> {
  const topic = await prisma.topic.findUnique({
    where: { id: input.topicId },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      category: { select: { slug: true } },
    },
  });
  if (!topic) {
    throw new AdminContentError("unknown_topic", "Тема не найдена.", { status: 404 });
  }

  const data = fillMissingTopic(input.data, topic.slug);
  const parsed = parseFormsWriterFile(data);
  if (parsed.questions.length > MAX_IMPORT_QUESTIONS) {
    throw new AdminContentError(
      "import_too_large",
      `За один раз можно загрузить не больше ${MAX_IMPORT_QUESTIONS} вопросов.`,
      { status: 400 },
    );
  }

  const target: TopicTarget = {
    category: topic.category.slug,
    topic: topic.slug,
    title: topic.title,
  };

  const map = new Map<string, TopicTarget>();
  map.set(topic.slug, target);
  for (const raw of parsed.questions) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    const sourceTopic = (raw as Record<string, unknown>).topic;
    if (typeof sourceTopic === "string" && sourceTopic.trim()) {
      map.set(sourceTopic.trim(), target);
    }
  }

  const plan = planImport(data, map);
  if (plan.items.length === 0 && !hasErrors(plan.issues)) {
    throw new AdminContentError("import_empty", "В файле нет вопросов для загрузки.", {
      status: 400,
    });
  }

  const existing = await prisma.question.findMany({
    where: { topicId: topic.id },
    select: {
      id: true,
      text: true,
      explanation: true,
      status: true,
      isDemo: true,
      contentHash: true,
      version: true,
    },
  });

  const adminPlan = planAdminImport(plan, existing as ExistingImportQuestion[]);

  const foreignTopics = [...new Set(plan.items.map((item) => item.sourceTopic))].filter(
    (sourceTopic) => sourceTopic !== topic.slug,
  );
  if (foreignTopics.length > 0) {
    adminPlan.issues.push({
      index: null,
      sourceTopic: null,
      code: "target_topic_ignored",
      severity: "warning",
      message: `Поле topic в файле не используется: все вопросы добавятся в тему «${topic.title}». В файле были темы: ${foreignTopics
        .slice(0, 3)
        .join(", ")}${foreignTopics.length > 3 ? "…" : ""}.`,
    });
    adminPlan.counts.warnings += 1;
  }

  if (topic.status !== ContentStatus.PUBLISHED) {
    adminPlan.issues.push({
      index: null,
      sourceTopic: null,
      code: "topic_archived",
      severity: "warning",
      message: "Тема не опубликована: вопросы загрузятся, но пользователи их не увидят.",
    });
    adminPlan.counts.warnings += 1;
  }

  return { topic, plan, adminPlan };
}

export async function previewAdminImport(input: ImportInput): Promise<AdminImportPreview> {
  const { topic, adminPlan } = await buildImportPlan(input);

  return {
    topic: { id: topic.id, title: topic.title, slug: topic.slug, status: topic.status },
    counts: adminPlan.counts,
    issues: adminPlan.issues,
    actions: adminPlan.actions.map((action) => ({
      index: action.item.index,
      text: action.item.text,
      status: action.item.status,
      kind: action.kind,
      warnings: action.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
      })),
    })),
  };
}

function createImportQuestion(tx: Tx, topicId: string, item: ImportItem, version: number) {
  return tx.question.create({
    data: {
      topicId,
      type: "SINGLE_CHOICE",
      text: item.text,
      explanation: item.explanation,
      imageUrl: item.imageUrl,
      imageLicense: item.imageLicense,
      imageSource: item.imageSource,
      imageAlt: item.imageAlt,
      difficulty: DEFAULT_DIFFICULTY,
      status: item.status,
      isDemo: false,
      contentHash: item.contentHash,
      version,
      options: {
        create: item.options.map((text, index) => ({
          text,
          isCorrect: index === item.correctIndex,
          order: index,
        })),
      },
    },
    select: { id: true },
  });
}

export async function applyAdminImport(
  input: ImportInput,
): Promise<{ counts: AdminImportCounts; issues: ImportIssue[] }> {
  const { topic, adminPlan } = await buildImportPlan(input);

  if (hasErrors(adminPlan.issues)) {
    throw new AdminContentError(
      "import_has_errors",
      "Исправьте ошибки в файле и повторите предпросмотр.",
      { status: 400, details: { issues: adminPlan.issues } },
    );
  }

  const demoArchived = await prisma.$transaction(
    async (tx) => {
      for (const action of adminPlan.actions) {
        if (action.kind === "skip") continue;

        if (action.kind === "update") {
          if (!action.targetId) continue;
          await tx.question.update({
            where: { id: action.targetId },
            data: {
              explanation: action.item.explanation,
              imageUrl: action.item.imageUrl,
              imageLicense: action.item.imageLicense,
              imageSource: action.item.imageSource,
              imageAlt: action.item.imageAlt,
              status: action.item.status,
              version: { increment: 1 },
            },
          });
          continue;
        }

        if (action.kind === "replace") {
          if (action.archiveIds.length > 0) {
            await tx.question.updateMany({
              where: { id: { in: action.archiveIds } },
              data: { status: ContentStatus.ARCHIVED },
            });
          }
          await createImportQuestion(tx, topic.id, action.item, action.version);
          continue;
        }

        await createImportQuestion(tx, topic.id, action.item, action.version);
      }

      const archived = await hideDemoIfRealPublished(tx, topic.id);
      await recalculateTopicProgress(tx, topic.id);
      return archived;
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );

  return {
    counts: { ...adminPlan.counts, demoArchived },
    issues: adminPlan.issues,
  };
}
