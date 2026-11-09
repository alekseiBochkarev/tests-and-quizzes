import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-конфигурация Sprint 1.
 *
 * Сервер поднимается Playwright'ом: в CI — собранное приложение (`npm run start`),
 * локально — `npm run dev`. Для e2e обязательно APP_ENV=test и отдельная БД
 * quiz_test (DATABASE_URL_TEST), чтобы не засорять dev-БД.
 *
 * Внимание: локально `reuseExistingServer` переиспользует уже запущенный сервер.
 * Перед `npm run test:e2e` остановите `npm run dev`, иначе тесты пойдут в dev-БД.
 */
const isCI = Boolean(process.env.CI);
const testDatabaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  testDir: "./tests/e2e",
  // Файлы и тесты идут последовательно: сценарии регистрируются в общей тестовой БД,
  // а in-memory rate-limit считает попытки на процесс сервера.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ru-RU",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      APP_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      DATABASE_URL_TEST: testDatabaseUrl,
      MAIL_TRANSPORT: "log",
      APP_URL: "http://localhost:3000",
    },
  },
});
