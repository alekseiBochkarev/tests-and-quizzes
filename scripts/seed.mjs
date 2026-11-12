/**
 * Идемпотентный сид демо-контента.
 *
 * Запуск: npm run db:seed
 * Повторный запуск обновляет тексты по стабильным id и не трогает
 * пользователей, попытки и прогресс.
 *
 * ВАЖНО: контент в scripts/seed/content — демонстрационный.
 * Перед бетой его заменяет импорт из forms_writer с факт-чеком.
 */
import "dotenv/config";
import { Client } from "pg";

import { catalog } from "./seed/content/index.mjs";

const now = new Date();

function assertContent() {
  const seenTopicSlugs = new Set();

  for (const category of catalog) {
    if (!category.slug || !category.title) {
      throw new Error(`Раздел без slug/title: ${JSON.stringify(category)}`);
    }

    for (const topic of category.topics) {
      if (seenTopicSlugs.has(topic.slug)) {
        throw new Error(`Повторяющийся slug темы: ${topic.slug}`);
      }
      seenTopicSlugs.add(topic.slug);

      if (!Array.isArray(topic.questions) || topic.questions.length === 0) {
        throw new Error(`Тема ${topic.slug} без вопросов`);
      }

      for (const [index, question] of topic.questions.entries()) {
        if (!question.text || !question.explanation) {
          throw new Error(`Вопрос ${topic.slug}#${index + 1} без текста или объяснения`);
        }
        if (!Array.isArray(question.options) || question.options.length !== 4) {
          throw new Error(`Вопрос ${topic.slug}#${index + 1}: нужно ровно 4 варианта`);
        }
        if (
          !Number.isInteger(question.correctIndex) ||
          question.correctIndex < 0 ||
          question.correctIndex >= question.options.length
        ) {
          throw new Error(`Вопрос ${topic.slug}#${index + 1}: некорректный correctIndex`);
        }
        if (new Set(question.options).size !== question.options.length) {
          throw new Error(`Вопрос ${topic.slug}#${index + 1}: повторяющиеся варианты`);
        }
      }
    }
  }
}

async function upsertCategory(client, category, order) {
  const id = `seed-cat-${category.slug}`;
  await client.query(
    `INSERT INTO "Category" (id, slug, title, description, "order", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (id) DO UPDATE SET
       slug = EXCLUDED.slug,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       "order" = EXCLUDED."order",
       "updatedAt" = EXCLUDED."updatedAt"`,
    [id, category.slug, category.title, category.description ?? null, order, now],
  );
  return id;
}

async function upsertTopic(client, topic, categoryId, order) {
  const id = `seed-topic-${topic.slug}`;
  await client.query(
    `INSERT INTO "Topic" (id, "categoryId", slug, title, description, "order", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED', $7, $7)
     ON CONFLICT (id) DO UPDATE SET
       "categoryId" = EXCLUDED."categoryId",
       slug = EXCLUDED.slug,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       "order" = EXCLUDED."order",
       status = 'PUBLISHED',
       "updatedAt" = EXCLUDED."updatedAt"`,
    [id, categoryId, topic.slug, topic.title, topic.description ?? null, order, now],
  );
  return id;
}

async function upsertQuestion(client, topic, question, index, topicId) {
  const questionId = `seed-q-${topic.slug}-${index + 1}`;
  const version = 1;

  await client.query(
    `INSERT INTO "Question"
       (id, "topicId", type, text, explanation, difficulty, status, "isDemo", "contentHash", version, "createdAt", "updatedAt")
     VALUES ($1, $2, 'SINGLE_CHOICE', $3, $4, 2, 'PUBLISHED', true, $5, $6, $7, $7)
     ON CONFLICT (id) DO UPDATE SET
       "topicId" = EXCLUDED."topicId",
       type = 'SINGLE_CHOICE',
       text = EXCLUDED.text,
       explanation = EXCLUDED.explanation,
       status = 'PUBLISHED',
       "isDemo" = true,
       "contentHash" = EXCLUDED."contentHash",
       version = EXCLUDED.version,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [
      questionId,
      topicId,
      question.text,
      question.explanation,
      `${topic.slug}-${index + 1}`,
      version,
      now,
    ],
  );

  for (const [optionIndex, optionText] of question.options.entries()) {
    const optionId = `seed-o-${topic.slug}-${index + 1}-${optionIndex + 1}`;
    await client.query(
      `INSERT INTO "QuestionOption" (id, "questionId", text, "isCorrect", "order")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         "questionId" = EXCLUDED."questionId",
         text = EXCLUDED.text,
         "isCorrect" = EXCLUDED."isCorrect",
         "order" = EXCLUDED."order"`,
      [optionId, questionId, optionText, optionIndex === question.correctIndex, optionIndex],
    );
  }
}

async function main() {
  assertContent();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL не задан. Проверьте .env или переменные окружения.");
  }

  const client = new Client({ connectionString });
  await client.connect();

  let topicCount = 0;
  let questionCount = 0;

  try {
    await client.query("BEGIN");

    for (const [categoryIndex, category] of catalog.entries()) {
      const categoryId = await upsertCategory(client, category, categoryIndex);

      for (const [topicIndex, topic] of category.topics.entries()) {
        const topicId = await upsertTopic(
          client,
          topic,
          categoryId,
          categoryIndex * 100 + topicIndex,
        );
        topicCount += 1;

        for (const [questionIndex, question] of topic.questions.entries()) {
          await upsertQuestion(client, topic, question, questionIndex, topicId);
          questionCount += 1;
        }
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }

  console.log(
    `Сид завершён: ${catalog.length} разделов, ${topicCount} тем, ${questionCount} вопросов.`,
  );
}

main().catch((error) => {
  console.error("Сид не выполнен:", error);
  process.exitCode = 1;
});
