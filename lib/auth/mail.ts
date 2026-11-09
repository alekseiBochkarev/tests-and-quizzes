import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { authConfig } from "@/lib/auth/authConfig";
import { maskEmail } from "@/lib/auth/identity";

/**
 * Транспорты писем (§4.6).
 *
 * `log` — dev-почтовый ящик: полное письмо с токеном и адресом получателя
 * пишется в gitignored `logs/dev-mail.log`. Это единственное разрешённое
 * исключение из правила «ПДн не логируются»; при APP_ENV=production запись
 * запрещена и приложение не стартует (проверка в lib/env.ts).
 *
 * `smtp` — интерфейс готов, реальная доставка настраивается отдельно.
 */

export const DEV_MAIL_LOG_PATH = path.join(process.cwd(), "logs", "dev-mail.log");

export type MailType = "verify_email" | "reset_password";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  type: MailType;
};

export type DevMailEntry = {
  sentAt: string;
  to: string;
  subject: string;
  type: string;
  text: string;
};

export type SendMailResult = { ok: boolean; transport: "log" | "smtp"; sent: boolean };

const BLOCK_RE =
  /^===== MAIL ([^\r\n]+) =====\r?\n([\s\S]*?)\r?\n===== END MAIL =====\r?$/gm;

function headerValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function formatLogEntry(message: MailMessage, sentAt: Date): string {
  return [
    `===== MAIL ${sentAt.toISOString()} =====`,
    `To: ${headerValue(message.to)}`,
    `Subject: ${headerValue(message.subject)}`,
    `Type: ${message.type}`,
    "-----",
    message.text.trim(),
    "===== END MAIL =====",
    "",
    "",
  ].join("\n");
}

let writeQueue: Promise<void> = Promise.resolve();

async function appendDevMail(message: MailMessage): Promise<void> {
  const entry = formatLogEntry(message, new Date());

  const write = writeQueue.then(async () => {
    // Каталог создаётся при первой записи, поэтому коммитить пустую папку не нужно.
    await mkdir(path.dirname(DEV_MAIL_LOG_PATH), { recursive: true });
    await appendFile(DEV_MAIL_LOG_PATH, entry, "utf8");
  });

  // Ошибка одного письма не должна «замораживать» очередь для следующих.
  writeQueue = write.catch(() => undefined);
  return write;
}

function parseLog(content: string): DevMailEntry[] {
  const entries: DevMailEntry[] = [];

  for (const match of content.matchAll(BLOCK_RE)) {
    const sentAt = match[1]?.trim() ?? "";
    const rawBody = match[2] ?? "";
    const separatorIndex = rawBody.indexOf("\n-----");

    const headerPart = separatorIndex >= 0 ? rawBody.slice(0, separatorIndex) : rawBody;
    const textPart = separatorIndex >= 0 ? rawBody.slice(separatorIndex + "\n-----".length) : "";

    const headers = new Map<string, string>();
    for (const line of headerPart.split(/\r?\n/)) {
      const colon = line.indexOf(":");
      if (colon <= 0) continue;
      headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
    }

    entries.push({
      sentAt,
      to: headers.get("to") ?? "",
      subject: headers.get("subject") ?? "",
      type: headers.get("type") ?? "",
      text: textPart.replace(/^\r?\n/, "").trim(),
    });
  }

  return entries.reverse();
}

/** Последние письма для `/_dev/mailbox`. Отсутствие файла — не ошибка. */
export async function listDevMail(): Promise<DevMailEntry[]> {
  let content: string;
  try {
    content = await readFile(DEV_MAIL_LOG_PATH, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return parseLog(content);
}

async function sendViaSmtp(message: MailMessage): Promise<SendMailResult> {
  const smtp = authConfig.mail.smtp;
  if (!smtp.host) {
    console.warn({ event: "mail.smtp_not_configured", type: message.type });
    return { ok: false, transport: "smtp", sent: false };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth:
        smtp.user && smtp.password ? { user: smtp.user, pass: smtp.password } : undefined,
    });

    await transporter.sendMail({
      from: authConfig.mail.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    console.info({ event: "mail.sent", type: message.type, to: maskEmail(message.to) });
    return { ok: true, transport: "smtp", sent: true };
  } catch (error) {
    console.error({
      event: "mail.send_failed",
      type: message.type,
      to: maskEmail(message.to),
      reason: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, transport: "smtp", sent: false };
  }
}

/** Отправляет письмо. Никогда не бросает — роут не должен падать из-за почты. */
export async function sendMail(message: MailMessage): Promise<SendMailResult> {
  if (authConfig.mail.transport === "log") {
    if (authConfig.appEnv === "production") {
      throw new Error("MAIL_TRANSPORT=log запрещён при APP_ENV=production");
    }

    try {
      await appendDevMail(message);
      console.info({ event: "mail.sent", type: message.type, transport: "log" });
      return { ok: true, transport: "log", sent: true };
    } catch (error) {
      console.error({
        event: "mail.log_write_failed",
        type: message.type,
        reason: error instanceof Error ? error.name : "unknown",
      });
      return { ok: false, transport: "log", sent: false };
    }
  }

  return sendViaSmtp(message);
}

function actionButton(url: string, label: string): string {
  return [
    `<a href="${url}" style="display:inline-block;padding:16px 28px;border-radius:12px;`,
    "background-color:#0f5b5b;color:#ffffff;font-size:20px;font-weight:700;",
    `text-decoration:none;">${label}</a>`,
  ].join("");
}

function wrapHtml(params: { heading: string; intro: string; buttonLabel: string; url: string; footer: string }): string {
  return [
    '<!doctype html><html lang="ru"><body style="margin:0;padding:24px;background:#f6f4ef;',
    'font-family:Arial,sans-serif;color:#1b1f24;">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:28px;border-radius:16px;">',
    `<h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;">${params.heading}</h1>`,
    `<p style="font-size:18px;line-height:1.6;margin:0 0 24px;">${params.intro}</p>`,
    `<p style="margin:0 0 24px;">${actionButton(params.url, params.buttonLabel)}</p>`,
    `<p style="font-size:16px;line-height:1.6;margin:0 0 12px;">Если кнопка не открывается, скопируйте ссылку в браузер:</p>`,
    `<p style="font-size:16px;line-height:1.5;word-break:break-all;margin:0 0 24px;">${params.url}</p>`,
    `<p style="font-size:16px;line-height:1.6;color:#4a525c;margin:0;">${params.footer}</p>`,
    "</div></body></html>",
  ].join("");
}

export function buildVerifyEmail(params: { to: string; token: string }): MailMessage {
  const url = `${authConfig.appUrl}/verify-email?token=${encodeURIComponent(params.token)}`;
  const hours = authConfig.verifyTokenTtlHours;

  return {
    to: params.to,
    type: "verify_email",
    subject: "Подтвердите почту — Тесты",
    text: [
      "Здравствуйте!",
      "",
      "Вы указали этот адрес на сайте «Тесты», чтобы сохранять результаты.",
      "Чтобы подтвердить почту, откройте ссылку:",
      url,
      "",
      `Ссылка действует ${hours} ч. Если вы не регистрировались, просто удалите письмо.`,
    ].join("\n"),
    html: wrapHtml({
      heading: "Подтвердите почту",
      intro: "Чтобы сохранять результаты тестов, подтвердите этот адрес.",
      buttonLabel: "Подтвердить почту",
      url,
      footer: `Ссылка действует ${hours} ч. Если вы не регистрировались, просто удалите письмо.`,
    }),
  };
}

export function buildResetEmail(params: { to: string; token: string }): MailMessage {
  const url = `${authConfig.appUrl}/reset-password?token=${encodeURIComponent(params.token)}`;
  const hours = authConfig.resetTokenTtlHours;

  return {
    to: params.to,
    type: "reset_password",
    subject: "Восстановление пароля — Тесты",
    text: [
      "Здравствуйте!",
      "",
      "Вы запросили смену пароля на сайте «Тесты».",
      "Чтобы задать новый пароль, откройте ссылку:",
      url,
      "",
      `Ссылка действует ${hours} ч. Если вы не запрашивали смену пароля, просто удалите письмо — пароль останется прежним.`,
    ].join("\n"),
    html: wrapHtml({
      heading: "Смена пароля",
      intro: "Вы запросили смену пароля. Нажмите кнопку, чтобы задать новый пароль.",
      buttonLabel: "Задать новый пароль",
      url,
      footer: `Ссылка действует ${hours} ч. Если вы не запрашивали смену пароля, просто удалите письмо — пароль останется прежним.`,
    }),
  };
}
