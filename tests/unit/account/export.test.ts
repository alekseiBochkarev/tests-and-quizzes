import { describe, expect, it } from "vitest";

import {
  attemptsToCsv,
  buildAccountExport,
  csvCell,
  type AccountExportSource,
} from "@/lib/account/export";
import {
  DELETED_EMAIL_DOMAIN,
  deletedEmailFor,
  isDeletionConfirmation,
} from "@/lib/account/rules";

const AT = new Date("2026-11-25T10:00:00.000Z");

function source(): AccountExportSource {
  return {
    profile: {
      id: "user_1",
      email: "maria@example.com",
      name: "Мария",
      role: "USER",
      timezone: "Europe/Moscow",
      createdAt: new Date("2026-01-10T09:00:00.000Z"),
      emailVerifiedAt: new Date("2026-01-10T09:05:00.000Z"),
      interestsSetAt: new Date("2026-01-11T09:00:00.000Z"),
    },
    consents: [
      {
        type: "PRIVACY",
        version: "2026-11-09-draft",
        accepted: true,
        ip: "203.0.113.10",
        userAgent: "unit-test",
        createdAt: new Date("2026-01-10T08:59:00.000Z"),
      },
    ],
    interests: [
      {
        weight: 2,
        source: "MANUAL",
        createdAt: new Date("2026-01-11T09:00:00.000Z"),
        topic: { slug: "history", title: "История", category: { title: "Гуманитарные" } },
      },
    ],
    attempts: [
      {
        id: "attempt_1",
        mode: "TRAINING",
        status: "COMPLETED",
        questionCount: 10,
        answeredCount: 10,
        correctCount: 8,
        score: 80,
        maxScore: 100,
        xpEarned: 40,
        startedAt: new Date("2026-02-01T12:00:00.000Z"),
        finishedAt: new Date("2026-02-01T12:07:00.000Z"),
        durationSec: 420,
        topic: { slug: "history", title: "История" },
        quiz: null,
        answers: [
          {
            order: 1,
            isCorrect: true,
            answeredAt: new Date("2026-02-01T12:01:00.000Z"),
            questionVersion: 1,
            question: { text: "В каком году?" },
            selectedOption: { text: "1961" },
          },
        ],
      },
    ],
    questionProgress: [
      {
        seenCount: 3,
        correctCount: 2,
        wrongCount: 1,
        masteryLevel: 3,
        lastSeenAt: new Date("2026-02-01T12:01:00.000Z"),
        nextReviewAt: new Date("2026-02-09T12:01:00.000Z"),
        question: { text: "В каком году?", topic: { slug: "history", title: "История" } },
      },
    ],
    topicProgress: [
      {
        totalQuestions: 10,
        seenQuestions: 10,
        masteredQuestions: 5,
        answeredCount: 10,
        correctCount: 8,
        progress: 55.5,
        level: 3,
        lastActivityAt: new Date("2026-02-01T12:07:00.000Z"),
        topic: { slug: "history", title: "История" },
      },
    ],
    stats: {
      xp: 120,
      level: 2,
      totalAttempts: 1,
      completedAttempts: 1,
      totalAnswered: 10,
      totalCorrect: 8,
      bestAccuracy: 80,
      dailyStreak: 2,
      longestStreak: 4,
      lastActiveDate: new Date("2026-02-01T00:00:00.000Z"),
      timezone: "Europe/Moscow",
    },
    dailyActivity: [
      {
        date: new Date("2026-02-01T00:00:00.000Z"),
        xp: 40,
        attempts: 1,
        answered: 10,
        correct: 8,
      },
    ],
  };
}

describe("buildAccountExport", () => {
  it("помечает формат, версию и время выгрузки", () => {
    const payload = buildAccountExport(source(), AT);

    expect(payload.format).toBe("testy-account-export");
    expect(payload.version).toBe(1);
    expect(payload.exportedAt).toBe("2026-11-25T10:00:00.000Z");
  });

  it("не отдаёт пароль и его хеш", () => {
    const payload = buildAccountExport(source(), AT);

    expect(Object.keys(payload.profile)).not.toContain("passwordHash");
    expect(Object.keys(payload.profile)).not.toContain("password");
  });

  it("переводит все даты в ISO, включая вложенные ответы", () => {
    const payload = buildAccountExport(source(), AT);

    expect(payload.profile.createdAt).toBe("2026-01-10T09:00:00.000Z");
    expect(payload.consents[0]?.createdAt).toBe("2026-01-10T08:59:00.000Z");
    expect(payload.attempts[0]?.startedAt).toBe("2026-02-01T12:00:00.000Z");
    expect(payload.attempts[0]?.answers[0]?.answeredAt).toBe("2026-02-01T12:01:00.000Z");
    expect(payload.stats?.lastActiveDate).toBe("2026-02-01T00:00:00.000Z");
    expect(payload.dailyActivity[0]?.date).toBe("2026-02-01T00:00:00.000Z");
  });

  it("сохраняет пустые значения как null", () => {
    const empty = source();
    empty.profile.emailVerifiedAt = null;
    empty.profile.name = null;

    const payload = buildAccountExport(empty, AT);

    expect(payload.profile.emailVerifiedAt).toBeNull();
    expect(payload.profile.name).toBeNull();
  });

  it("допускает отсутствие статистики", () => {
    const noStats = source();
    noStats.stats = null;

    expect(buildAccountExport(noStats, AT).stats).toBeNull();
  });
});

describe("csvCell", () => {
  it("не трогает простые значения", () => {
    expect(csvCell("История")).toBe("История");
    expect(csvCell(42)).toBe("42");
  });

  it("экранирует разделитель, кавычки и переводы строк", () => {
    expect(csvCell("История; Кино")).toBe('"История; Кино"');
    expect(csvCell('Скажем "так"')).toBe('"Скажем ""так"""');
    expect(csvCell("строка\nвторая")).toBe('"строка\nвторая"');
  });

  it("превращает пустые значения в пустую строку", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("attemptsToCsv", () => {
  it("начинается с BOM и содержит русский заголовок", () => {
    const csv = attemptsToCsv(buildAccountExport(source(), AT).attempts);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Дата;Тема;Формат;Статус");
    expect(csv).toContain("Длительность, мин");
  });

  it("выводит тренировку с понятными подписями и минутами", () => {
    const csv = attemptsToCsv(buildAccountExport(source(), AT).attempts);

    expect(csv).toContain("История");
    expect(csv).toContain("Тренировка");
    expect(csv).toContain("Завершена");
    expect(csv).toMatch(/;80;7\r\n$/);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("для теста дня без темы подставляет название режима", () => {
    const payload = buildAccountExport(source(), AT);
    const daily = {
      ...payload.attempts[0]!,
      mode: "DAILY",
      topic: null,
      quiz: null,
    };

    const csv = attemptsToCsv([daily]);

    expect(csv).toContain("Тест дня");
  });
});

describe("deletedEmailFor", () => {
  it("строит детерминированный адрес-заглушку", () => {
    expect(deletedEmailFor("abc")).toBe(`deleted-abc@${DELETED_EMAIL_DOMAIN}`);
    expect(deletedEmailFor("abc")).toBe(deletedEmailFor("abc"));
  });

  it("не содержит исходную почту", () => {
    expect(deletedEmailFor("abc")).not.toContain("maria@example.com");
  });
});

describe("isDeletionConfirmation", () => {
  it("принимает слово в любом регистре и с пробелами", () => {
    expect(isDeletionConfirmation("УДАЛИТЬ")).toBe(true);
    expect(isDeletionConfirmation("удалить")).toBe(true);
    expect(isDeletionConfirmation("  Удалить  ")).toBe(true);
  });

  it("отклоняет пустое и неточное подтверждение", () => {
    expect(isDeletionConfirmation("")).toBe(false);
    expect(isDeletionConfirmation("удал")).toBe(false);
    expect(isDeletionConfirmation("удалить всё")).toBe(false);
    expect(isDeletionConfirmation(null)).toBe(false);
    expect(isDeletionConfirmation(undefined)).toBe(false);
  });
});
