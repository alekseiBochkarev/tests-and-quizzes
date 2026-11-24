/**
 * Cookie-согласие (ACC-03).
 *
 * Модуль намеренно без Node-зависимостей: его используют серверный layout,
 * API-роут и unit-тесты. Выбор хранится в first-party cookie, а для вошедших
 * пользователей дополнительно пишется в `Consent` как аудит.
 *
 * Категории:
 * - необходимые — вход, безопасность, размер текста; работают всегда;
 * - аналитика — обезличенная статистика; по умолчанию выключена;
 * - реклама — персонализация и партнёрские материалы; по умолчанию выключена.
 */

export const COOKIE_CONSENT_COOKIE = "quiz_cookie_consent";

/** Сколько помним выбор, прежде чем спросить снова. */
export const COOKIE_CONSENT_MAX_AGE_DAYS = 180;

/** Событие для повторного открытия настроек со страницы Cookie-политики. */
export const COOKIE_SETTINGS_EVENT = "open-cookie-settings";

export type CookieConsentChoice = {
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsent = CookieConsentChoice & {
  /** Версия Cookie-политики: при смене версии спрашиваем заново. */
  version: string;
  /** Момент выбора в формате ISO. */
  updatedAt: string;
};

/** Безопасный выбор по умолчанию: только необходимое. */
export const DEFAULT_COOKIE_CONSENT_CHOICE: CookieConsentChoice = {
  analytics: false,
  marketing: false,
};

export function createCookieConsent(params: {
  analytics: boolean;
  marketing: boolean;
  version: string;
  updatedAt?: Date;
}): CookieConsent {
  return {
    analytics: params.analytics,
    marketing: params.marketing,
    version: params.version,
    updatedAt: (params.updatedAt ?? new Date()).toISOString(),
  };
}

/**
 * Значение cookie — обычный JSON. Кодированием занимается Next.js:
 * `cookies().set()` сам применяет `encodeURIComponent`, а `cookies().get()`
 * возвращает уже раскодированное значение. Если кодировать здесь ещё раз,
 * получится двойное кодирование и `JSON.parse` на клиенте/в тестах упадёт.
 */
export function serializeCookieConsent(consent: CookieConsent): string {
  return JSON.stringify(consent);
}

/**
 * Читает выбор из cookie. Любое сомнительное значение — `null`, то есть
 * «согласия нет»: битую cookie нельзя трактовать как разрешение аналитики.
 *
 * Принимает и сырой JSON (значение из `cookies().get()`), и percent-encoded
 * строку (значение из браузера) — на случай разных источников.
 */
export function parseCookieConsent(
  raw: string | undefined | null,
  currentVersion: string,
): CookieConsent | null {
  if (!raw || raw.length > 2048) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return null;
    }

    try {
      value = JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  if (record.version !== currentVersion) return null;
  if (typeof record.analytics !== "boolean") return null;
  if (typeof record.marketing !== "boolean") return null;
  if (typeof record.updatedAt !== "string") return null;

  return {
    analytics: record.analytics,
    marketing: record.marketing,
    version: record.version,
    updatedAt: record.updatedAt,
  };
}
