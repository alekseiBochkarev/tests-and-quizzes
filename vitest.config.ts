import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit-тесты чистого слоя `lib/*`.
 *
 * Окружение — node: тестируем функции без DOM и без Next.js.
 * Переменные окружения задаются здесь, чтобы `npm test` работал на чистой
 * машине без `.env`: тестам не нужна реальная БД, а `lib/env.ts` требует
 * валидный DATABASE_URL/AUTH_SECRET уже на импорте.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      APP_ENV: "test",
      DATABASE_URL: "postgresql://quiz:quiz@localhost:5432/quiz_test?schema=public",
      DATABASE_URL_TEST: "postgresql://quiz:quiz@localhost:5432/quiz_test?schema=public",
      AUTH_SECRET: "unit-test-secret-0123456789-abcdefghijklmnop",
      APP_URL: "http://localhost:3000",
      MAIL_TRANSPORT: "log",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
