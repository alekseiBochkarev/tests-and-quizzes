import { z } from "zod";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_MESSAGES } from "@/lib/auth/passwordPolicy";

/**
 * Zod-схемы API и форм (§4.5). Один набор сообщений для API и UI:
 * ошибки формулируются как инструкция, что именно исправить.
 */

const emailSchema = z
  .string({ message: "Введите адрес почты." })
  .trim()
  .min(1, "Введите адрес почты.")
  .max(254, "Адрес почты слишком длинный.")
  .pipe(z.email("Похоже, в адресе почты ошибка. Пример: name@example.com"));

const passwordSchema = z
  .string({ message: "Введите пароль." })
  .min(PASSWORD_MIN_LENGTH, PASSWORD_MESSAGES.tooShort)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_MESSAGES.tooLong);

const requiredConsent = (message: string) =>
  z.boolean({ message }).refine((value) => value === true, { message });

const tokenSchema = z
  .string({ message: "Ссылка не содержит токен." })
  .trim()
  .min(1, "Ссылка не содержит токен.")
  .max(1024, "Ссылка повреждена.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  acceptedTerms: requiredConsent("Отметьте согласие с пользовательским соглашением."),
  acceptedPrivacy: requiredConsent("Отметьте согласие на обработку персональных данных."),
  marketingOptIn: z.boolean().optional().default(false),
  timezone: z.string().trim().max(64).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ message: "Введите пароль." }).min(1, "Введите пароль.").max(1024),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const verifyEmailSchema = z.object({ token: tokenSchema });

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({ message: "Введите текущий пароль." }).min(1, "Введите текущий пароль."),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type FieldErrors = Record<string, string>;

export type ValidationFailure = {
  message: string;
  fields: FieldErrors;
};

/** Превращает ZodError в `details.fields` для ответа `validation_error`. */
export function formatValidationError(error: z.ZodError): ValidationFailure {
  const fields: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!fields[key]) fields[key] = issue.message;
  }

  return {
    message: "Проверьте заполнение формы.",
    fields,
  };
}
