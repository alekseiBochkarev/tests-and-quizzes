/**
 * Экспорт данных пользователя (ACC-01, LEG-5, PROF-9).
 *
 * Модуль чистый: принимает уже загруженные данные и превращает их в JSON
 * или CSV. Загрузка из БД — в `lib/account/data.ts`. Так формат экспорта
 * проверяется unit-тестами без базы.
 *
 * Пароль и его хеш в экспорт не попадают никогда.
 */

export type AccountExportProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  timezone: string;
  createdAt: Date;
  emailVerifiedAt: Date | null;
  interestsSetAt: Date | null;
};

export type AccountExportConsent = {
  type: string;
  version: string;
  accepted: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export type AccountExportInterest = {
  weight: number;
  source: string;
  createdAt: Date;
  topic: { slug: string; title: string; category: { title: string } };
};

export type AccountExportAnswer = {
  order: number;
  isCorrect: boolean | null;
  answeredAt: Date | null;
  questionVersion: number;
  question: { text: string };
  selectedOption: { text: string } | null;
};

export type AccountExportAttempt = {
  id: string;
  mode: string;
  status: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  score: number;
  maxScore: number;
  xpEarned: number;
  startedAt: Date;
  finishedAt: Date | null;
  durationSec: number | null;
  topic: { slug: string; title: string } | null;
  quiz: { title: string } | null;
  answers: AccountExportAnswer[];
};

export type AccountExportQuestionProgress = {
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  masteryLevel: number;
  lastSeenAt: Date | null;
  nextReviewAt: Date | null;
  question: { text: string; topic: { slug: string; title: string } };
};

export type AccountExportTopicProgress = {
  totalQuestions: number;
  seenQuestions: number;
  masteredQuestions: number;
  answeredCount: number;
  correctCount: number;
  progress: number;
  level: number;
  lastActivityAt: Date | null;
  topic: { slug: string; title: string };
};

export type AccountExportStats = {
  xp: number;
  level: number;
  totalAttempts: number;
  completedAttempts: number;
  totalAnswered: number;
  totalCorrect: number;
  bestAccuracy: number;
  dailyStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  timezone: string;
};

export type AccountExportDailyActivity = {
  date: Date;
  xp: number;
  attempts: number;
  answered: number;
  correct: number;
};

export type AccountExportSource = {
  profile: AccountExportProfile;
  consents: AccountExportConsent[];
  interests: AccountExportInterest[];
  attempts: AccountExportAttempt[];
  questionProgress: AccountExportQuestionProgress[];
  topicProgress: AccountExportTopicProgress[];
  stats: AccountExportStats | null;
  dailyActivity: AccountExportDailyActivity[];
};

export type AccountExportPayload = {
  format: "testy-account-export";
  version: 1;
  exportedAt: string;
  profile: Omit<AccountExportProfile, "createdAt" | "emailVerifiedAt" | "interestsSetAt"> & {
    createdAt: string;
    emailVerifiedAt: string | null;
    interestsSetAt: string | null;
  };
  consents: Array<Omit<AccountExportConsent, "createdAt"> & { createdAt: string }>;
  interests: Array<Omit<AccountExportInterest, "createdAt"> & { createdAt: string }>;
  attempts: Array<
    Omit<AccountExportAttempt, "startedAt" | "finishedAt" | "answers"> & {
      startedAt: string;
      finishedAt: string | null;
      answers: Array<Omit<AccountExportAnswer, "answeredAt"> & { answeredAt: string | null }>;
    }
  >;
  questionProgress: Array<
    Omit<AccountExportQuestionProgress, "lastSeenAt" | "nextReviewAt"> & {
      lastSeenAt: string | null;
      nextReviewAt: string | null;
    }
  >;
  topicProgress: Array<
    Omit<AccountExportTopicProgress, "lastActivityAt"> & { lastActivityAt: string | null }
  >;
  stats: (Omit<AccountExportStats, "lastActiveDate"> & { lastActiveDate: string | null }) | null;
  dailyActivity: Array<Omit<AccountExportDailyActivity, "date"> & { date: string }>;
};

function iso(value: Date): string {
  return value.toISOString();
}

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/** Собирает полный машиночитаемый экспорт. */
export function buildAccountExport(
  source: AccountExportSource,
  exportedAt: Date = new Date(),
): AccountExportPayload {
  return {
    format: "testy-account-export",
    version: 1,
    exportedAt: iso(exportedAt),
    profile: {
      ...source.profile,
      createdAt: iso(source.profile.createdAt),
      emailVerifiedAt: isoOrNull(source.profile.emailVerifiedAt),
      interestsSetAt: isoOrNull(source.profile.interestsSetAt),
    },
    consents: source.consents.map((consent) => ({
      ...consent,
      createdAt: iso(consent.createdAt),
    })),
    interests: source.interests.map((interest) => ({
      ...interest,
      createdAt: iso(interest.createdAt),
    })),
    attempts: source.attempts.map((attempt) => ({
      ...attempt,
      startedAt: iso(attempt.startedAt),
      finishedAt: isoOrNull(attempt.finishedAt),
      answers: attempt.answers.map((answer) => ({
        ...answer,
        answeredAt: isoOrNull(answer.answeredAt),
      })),
    })),
    questionProgress: source.questionProgress.map((item) => ({
      ...item,
      lastSeenAt: isoOrNull(item.lastSeenAt),
      nextReviewAt: isoOrNull(item.nextReviewAt),
    })),
    topicProgress: source.topicProgress.map((item) => ({
      ...item,
      lastActivityAt: isoOrNull(item.lastActivityAt),
    })),
    stats: source.stats
      ? { ...source.stats, lastActiveDate: isoOrNull(source.stats.lastActiveDate) }
      : null,
    dailyActivity: source.dailyActivity.map((item) => ({
      ...item,
      date: iso(item.date),
    })),
  };
}

const ATTEMPT_MODE_LABELS: Record<string, string> = {
  TRAINING: "Тренировка",
  REVIEW: "Повторение",
  DAILY: "Тест дня",
};

const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Завершена",
  ABANDONED: "Прервана",
  IN_PROGRESS: "Не завершена",
};

const CSV_HEADER = [
  "Дата",
  "Тема",
  "Формат",
  "Статус",
  "Вопросов",
  "Отвечено",
  "Верно",
  "Баллы",
  "Длительность, мин",
];

/** Экранирует значение для CSV с разделителем `;` (привычно Excel в РФ). */
export function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function formatCsvDate(value: string | null, timeZone: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function attemptTitle(attempt: AccountExportPayload["attempts"][number]): string {
  if (attempt.topic?.title) return attempt.topic.title;
  if (attempt.quiz?.title) return attempt.quiz.title;
  if (attempt.mode === "DAILY") return "Тест дня";
  return "Смешанная тренировка";
}

/**
 * CSV истории тренировок. BOM нужен, чтобы Excel открыл кириллицу без
 * ручной смены кодировки; CRLF — привычный формат для Windows.
 */
export function attemptsToCsv(
  attempts: AccountExportPayload["attempts"],
  timeZone = "Europe/Moscow",
): string {
  const rows = attempts.map((attempt) => {
    const durationMinutes =
      attempt.durationSec && attempt.durationSec > 0
        ? Math.max(1, Math.round(attempt.durationSec / 60))
        : "";

    return [
      formatCsvDate(attempt.finishedAt ?? attempt.startedAt, timeZone),
      attemptTitle(attempt),
      ATTEMPT_MODE_LABELS[attempt.mode] ?? attempt.mode,
      ATTEMPT_STATUS_LABELS[attempt.status] ?? attempt.status,
      attempt.questionCount,
      attempt.answeredCount,
      attempt.correctCount,
      attempt.score,
      durationMinutes,
    ]
      .map(csvCell)
      .join(";");
  });

  return `\uFEFF${[CSV_HEADER.map(csvCell).join(";"), ...rows].join("\r\n")}\r\n`;
}
