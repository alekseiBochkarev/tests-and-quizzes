/**
 * Управление отдельной тестовой БД quiz_test.
 *
 * Запуск: node scripts/db-test.mjs <up|deploy|reset>
 *   up      — создаёт базу quiz_test, если её нет (dev-БД quiz не трогает);
 *   deploy  — применяет миграции Prisma к quiz_test;
 *   reset   — очищает quiz_test (drop + все миграции), только тестовая БД.
 *
 * Используется DATABASE_URL_TEST. В CI эти шаги делает job с сервисом
 * PostgreSQL: там достаточно `npm run db:deploy` с DATABASE_URL=quiz_test,
 * но локально скрипт избавляет от ручных `docker exec psql`.
 */
import "dotenv/config";

import { spawnSync } from "node:child_process";
import path from "node:path";

const mode = process.argv[2];
const allowedModes = new Set(["up", "deploy", "reset"]);

if (!mode || !allowedModes.has(mode)) {
  console.error("Использование: node scripts/db-test.mjs <up|deploy|reset>");
  process.exit(1);
}

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  console.error(
    "DATABASE_URL_TEST не задан. Укажите строку подключения к quiz_test в .env " +
      "(см. .env.example).",
  );
  process.exit(1);
}

const databaseName = decodeURIComponent(new URL(testUrl).pathname.replace(/^\//, ""));
if (!databaseName) {
  console.error("DATABASE_URL_TEST должен содержать имя базы, например /quiz_test.");
  process.exit(1);
}

if (databaseName === "quiz") {
  console.error("DATABASE_URL_TEST указывает на dev-БД quiz. Откажитесь: тестовая БД — quiz_test.");
  process.exit(1);
}

function adminUrl() {
  const url = new URL(testUrl);
  url.pathname = "/postgres";
  // Схема Prisma не является параметром libpq и может смущать драйвер.
  url.search = "";
  return url.toString();
}

async function ensureDatabase() {
  // Импорт pg ленивый: unit-тестам и CI-шагам без БД этот скрипт не нужен.
  const { Client } = await import("pg");
  const client = new Client({ connectionString: adminUrl() });

  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);
    if (rowCount === 0) {
      const quoted = `"${databaseName.replace(/"/g, '""')}"`;
      await client.query(`CREATE DATABASE ${quoted}`);
      console.log(`Создана тестовая БД ${databaseName}.`);
    } else {
      console.log(`Тестовая БД ${databaseName} уже существует.`);
    }
  } finally {
    await client.end();
  }
}

function runPrisma(args) {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

await ensureDatabase();

if (mode === "deploy") {
  runPrisma(["migrate", "deploy"]);
} else if (mode === "reset") {
  console.log(`Очищаю только тестовую БД ${databaseName} (dev-БД не затрагивается).`);
  runPrisma(["migrate", "reset", "--force"]);
}
