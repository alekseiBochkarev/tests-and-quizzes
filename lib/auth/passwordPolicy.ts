import { WEAK_PASSWORDS } from "@/lib/auth/passwordStopList";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_MESSAGES = {
  tooShort: `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов.`,
  tooLong: `Пароль должен быть не длиннее ${PASSWORD_MAX_LENGTH} символов.`,
  weak: "Этот пароль слишком часто используется. Придумайте другой — например, фразу из двух-трёх слов.",
} as const;

export type PasswordValidation =
  | { ok: true }
  | { ok: false; reason: "too_short" | "too_long" | "weak"; message: string };

/**
 * Политика пароля (§4.5): длина 8–128 символов и стоп-лист частых паролей.
 *
 * Требований к регистру и спецсимволам сознательно нет: для аудитории 55+
 * важнее понятность и возможность использовать длинную фразу.
 */
export function validatePassword(password: string): PasswordValidation {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, reason: "too_short", message: PASSWORD_MESSAGES.tooShort };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, reason: "too_long", message: PASSWORD_MESSAGES.tooLong };
  }

  const normalized = password.trim().toLowerCase();
  if (WEAK_PASSWORDS.has(normalized)) {
    return { ok: false, reason: "weak", message: PASSWORD_MESSAGES.weak };
  }

  return { ok: true };
}
