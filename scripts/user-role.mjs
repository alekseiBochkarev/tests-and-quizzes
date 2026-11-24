/**
 * Выдаёт роль пользователю по email (CNT-03).
 *
 * Запуск:
 *   npm run user:role -- user@example.com EDITOR
 *   npm run user:role -- user@example.com ADMIN
 *   npm run user:role -- user@example.com USER
 *
 * Скрипт идемпотентен: повторный запуск с той же ролью ничего не ломает.
 * Пароли, токены и хеши не читаются и не печатаются. Публичного HTTP-эндпоинта
 * для смены роли нет — только доступ к базе.
 */
import "dotenv/config";

import { Client } from "pg";

const ROLES = ["USER", "EDITOR", "ADMIN"];

function usage() {
  console.error("Использование: npm run user:role -- <email> <USER|EDITOR|ADMIN>");
}

const [rawEmail, rawRole] = process.argv.slice(2);

if (!rawEmail || !rawRole) {
  usage();
  process.exit(1);
}

const emailNormalized = rawEmail.trim().toLowerCase();
if (!emailNormalized.includes("@") || emailNormalized.length > 254) {
  console.error("Укажите корректный email, например user@example.com.");
  process.exit(1);
}

const role = rawRole.trim().toUpperCase();
if (!ROLES.includes(role)) {
  console.error(`Неизвестная роль «${rawRole}». Допустимо: ${ROLES.join(", ")}.`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL не задан. Проверьте .env (см. .env.example).");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const result = await client.query(
    'UPDATE "User" SET role = $1::"UserRole", "updatedAt" = NOW() ' +
      'WHERE "emailNormalized" = $2 AND "deletedAt" IS NULL ' +
      'RETURNING "email", "role"',
    [role, emailNormalized],
  );

  if (result.rowCount === 0) {
    console.error(`Пользователь ${emailNormalized} не найден. Сначала зарегистрируйте аккаунт.`);
    process.exitCode = 1;
  } else {
    const user = result.rows[0];
    console.log(`Роль обновлена: ${user.email} — ${user.role}.`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Не удалось обновить роль: ${message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
