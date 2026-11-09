import { describe, expect, it } from "vitest";

import { validateEnv } from "@/lib/env";

const MINIMAL = {
  DATABASE_URL: "postgresql://quiz:quiz@localhost:5432/quiz_test?schema=public",
  AUTH_SECRET: "unit-test-secret-0123456789-abcdefghijklmnop",
  APP_URL: "http://localhost:3000",
};

describe("validateEnv", () => {
  it("применяет безопасные значения по умолчанию", () => {
    const env = validateEnv(MINIMAL);

    expect(env.APP_ENV).toBe("local");
    expect(env.AUTH_SESSION_TTL_DAYS).toBe(30);
    expect(env.AUTH_VERIFY_TOKEN_TTL_HOURS).toBe(24);
    expect(env.AUTH_RESET_TOKEN_TTL_HOURS).toBe(1);
    expect(env.AUTH_MAX_FAILED_ATTEMPTS).toBe(5);
    expect(env.AUTH_LOGIN_AFTER_VERIFY).toBe(false);
    expect(env.MAIL_TRANSPORT).toBe("log");
    expect(env.DATABASE_URL_TEST).toBeUndefined();
  });

  it("падает при отсутствии AUTH_SECRET и называет переменную", () => {
    expect(() =>
      validateEnv({ DATABASE_URL: MINIMAL.DATABASE_URL, APP_URL: MINIMAL.APP_URL }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("падает при отсутствии DATABASE_URL и называет переменную", () => {
    expect(() =>
      validateEnv({ AUTH_SECRET: MINIMAL.AUTH_SECRET, APP_URL: MINIMAL.APP_URL }),
    ).toThrow(/DATABASE_URL/);
  });

  it("требует AUTH_SECRET не короче 32 символов", () => {
    expect(() => validateEnv({ ...MINIMAL, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("проверяет формат DATABASE_URL", () => {
    expect(() => validateEnv({ ...MINIMAL, DATABASE_URL: "mysql://..." })).toThrow(/postgresql/);
  });

  it("проверяет APP_URL", () => {
    expect(() => validateEnv({ ...MINIMAL, APP_URL: "localhost" })).toThrow(/APP_URL/);
  });

  it("принимает DATABASE_URL_TEST для отдельной тестовой БД", () => {
    const env = validateEnv({
      ...MINIMAL,
      DATABASE_URL_TEST: "postgresql://quiz:quiz@localhost:5433/quiz_test?schema=public",
    });

    expect(env.DATABASE_URL_TEST).toContain("quiz_test");
  });

  it("запрещает MAIL_TRANSPORT=log при APP_ENV=production", () => {
    expect(() => validateEnv({ ...MINIMAL, APP_ENV: "production", MAIL_TRANSPORT: "log" })).toThrow(
      /MAIL_TRANSPORT=log/,
    );
  });

  it("разрешает smtp в production", () => {
    const env = validateEnv({
      ...MINIMAL,
      APP_ENV: "production",
      MAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.example.com",
    });

    expect(env.APP_ENV).toBe("production");
    expect(env.MAIL_TRANSPORT).toBe("smtp");
  });

  it("неизвестный APP_ENV — ошибка", () => {
    expect(() => validateEnv({ ...MINIMAL, APP_ENV: "staging" })).toThrow(/APP_ENV/);
  });

  it("парсит булевы флаги из строк", () => {
    const env = validateEnv({
      ...MINIMAL,
      AUTH_LOGIN_AFTER_VERIFY: "true",
      SMTP_SECURE: "true",
    });

    expect(env.AUTH_LOGIN_AFTER_VERIFY).toBe(true);
    expect(env.SMTP_SECURE).toBe(true);
  });
});
