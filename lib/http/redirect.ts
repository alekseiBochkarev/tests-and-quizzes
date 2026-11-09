const DEFAULT_APP_URL = "http://localhost:3000";

const CONTROL_OR_BACKSLASH = /[\\\u0000-\u001f\u007f]/;
const ENCODED_BACKSLASH = /%5c/i;
const ENCODED_SLASH_SLASH = /^\/%2f/i;

/**
 * Безопасный `next` для возврата после входа (§4.5, AC-SEC-08).
 *
 * Принимается только внутренний путь текущего приложения. Отбрасываются:
 * внешние URL, protocol-relative (`//evil.com`), `/\evil.com`, `javascript:`,
 * управляющие символы и закодированные варианты обхода.
 *
 * `appUrl` параметризован для unit-тестов; по умолчанию берётся APP_URL,
 * который уже провалидирован в lib/env.ts на старте приложения.
 */
export function safeNext(
  value: string | null | undefined,
  appUrl: string = process.env.APP_URL ?? DEFAULT_APP_URL,
  fallback = "/account",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.startsWith("/\\")) return fallback;
  if (CONTROL_OR_BACKSLASH.test(value)) return fallback;
  if (ENCODED_BACKSLASH.test(value) || ENCODED_SLASH_SLASH.test(value)) return fallback;

  let base: URL;
  try {
    base = new URL(appUrl);
  } catch {
    return fallback;
  }

  try {
    const target = new URL(value, base);
    if (target.origin !== base.origin) return fallback;
    if (!target.pathname.startsWith("/")) return fallback;
    return value;
  } catch {
    return fallback;
  }
}
