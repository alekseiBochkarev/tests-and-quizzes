import { z } from "zod";

/**
 * Валидация переменных окружения.
 *
 * Модуль используется только на сервере (instrumentation, lib/db, API-роуты).
 * Значения читаются один раз при импорте: если обязательная переменная
 * отсутствует или некорректна, приложение падает на старте с понятным
 * сообщением, а не на первом запросе пользователя.
 */

const APP_ENVS = ["local", "test", "production"] as const;
const MAIL_TRANSPORTS = ["log", "smtp"] as const;

function postgresUrl(variable: string) {
  return z
    .string()
    .min(1, `${variable} обязателен`)
    .refine(
      (value) => /^postgres(ql)?:\/\//.test(value),
      `${variable}: ожидается строка подключения postgresql://…`,
    );
}

function positiveInt(defaultValue: number, max?: number) {
  const base = z.coerce.number().int().min(1);
  return (max === undefined ? base : base.max(max)).default(defaultValue);
}

function envBoolean(defaultValue: boolean) {
  return z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");
}

const envSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS).default("local"),
    // NODE_ENV выставляется Next.js/Node и не должен путаться с APP_ENV.
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),

    DATABASE_URL: postgresUrl("DATABASE_URL"),
    DATABASE_URL_TEST: z.string().optional(),

    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET должен содержать не менее 32 символов (32+ байта в base64)"),

    APP_URL: z
      .string()
      .min(1, "APP_URL обязателен")
      .refine((value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      }, "APP_URL: ожидается абсолютный URL, например http://localhost:3000"),

    AUTH_SESSION_TTL_DAYS: positiveInt(30),
    AUTH_VERIFY_TOKEN_TTL_HOURS: positiveInt(24),
    AUTH_RESET_TOKEN_TTL_HOURS: positiveInt(1),
    AUTH_MAX_FAILED_ATTEMPTS: positiveInt(5),
    AUTH_LOCKOUT_MINUTES: positiveInt(15),
    AUTH_LOGIN_AFTER_VERIFY: envBoolean(false),

    AUTH_RL_REGISTER_PER_EMAIL_H: positiveInt(3),
    AUTH_RL_REGISTER_PER_IP_H: positiveInt(5),
    AUTH_RL_LOGIN_PER_EMAIL_15M: positiveInt(10),
    AUTH_RL_LOGIN_PER_IP_15M: positiveInt(10),
    AUTH_RL_RESEND_PER_EMAIL_H: positiveInt(3),
    AUTH_RL_RESEND_PER_IP_H: positiveInt(10),
    AUTH_RL_FORGOT_PER_EMAIL_H: positiveInt(3),
    AUTH_RL_FORGOT_PER_IP_H: positiveInt(10),
    AUTH_RL_RESET_PER_IP_H: positiveInt(5),
    AUTH_RL_CHANGE_PASSWORD_PER_USER_H: positiveInt(5),

    LEGAL_TERMS_VERSION: z.string().min(1).default("2026-11-09-draft"),
    LEGAL_PRIVACY_VERSION: z.string().min(1).default("2026-11-09-draft"),

    MAIL_TRANSPORT: z.enum(MAIL_TRANSPORTS).default("log"),
    MAIL_FROM: z.string().min(1).default("Тесты и квизы <no-reply@localhost>"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: positiveInt(587, 65_535),
    SMTP_SECURE: envBoolean(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // §4.6: dev-транспорт писем запрещён в production — иначе письма
    // с токенами подтверждения попадут в файл на боевом сервере.
    if (value.APP_ENV === "production" && value.MAIL_TRANSPORT === "log") {
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_TRANSPORT"],
        message: "MAIL_TRANSPORT=log запрещён при APP_ENV=production; укажите smtp",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(env)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Некорректные переменные окружения:\n${details}\n` +
        "Проверьте .env по образцу .env.example.",
    );
  }

  return parsed.data;
}

/** Типизированный env. Падение при невалидных значениях происходит уже здесь. */
export const env = validateEnv();
