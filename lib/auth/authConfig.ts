import { env } from "@/lib/env";

/**
 * Серверный конфиг auth-контура (§4.5).
 *
 * Единственный источник значений — lib/env.ts: переменные уже провалидированы
 * на старте приложения. Никаких секретов наружу этот модуль не отдаёт.
 */
export const authConfig = {
  appEnv: env.APP_ENV,
  appUrl: env.APP_URL,
  sessionTtlDays: env.AUTH_SESSION_TTL_DAYS,
  verifyTokenTtlHours: env.AUTH_VERIFY_TOKEN_TTL_HOURS,
  resetTokenTtlHours: env.AUTH_RESET_TOKEN_TTL_HOURS,
  maxFailedAttempts: env.AUTH_MAX_FAILED_ATTEMPTS,
  lockoutMinutes: env.AUTH_LOCKOUT_MINUTES,
  loginAfterVerify: env.AUTH_LOGIN_AFTER_VERIFY,
  trustProxy: env.TRUST_PROXY,
  cookieSecure: env.APP_ENV === "production",
  legalTermsVersion: env.LEGAL_TERMS_VERSION,
  legalPrivacyVersion: env.LEGAL_PRIVACY_VERSION,
  mail: {
    transport: env.MAIL_TRANSPORT,
    from: env.MAIL_FROM,
    smtp: {
      host: env.SMTP_HOST ?? null,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER ?? null,
      password: env.SMTP_PASSWORD ?? null,
    },
  },
  rateLimit: {
    registerPerEmailH: env.AUTH_RL_REGISTER_PER_EMAIL_H,
    registerPerIpH: env.AUTH_RL_REGISTER_PER_IP_H,
    loginPerEmail15m: env.AUTH_RL_LOGIN_PER_EMAIL_15M,
    loginPerIp15m: env.AUTH_RL_LOGIN_PER_IP_15M,
    resendPerEmailH: env.AUTH_RL_RESEND_PER_EMAIL_H,
    resendPerIpH: env.AUTH_RL_RESEND_PER_IP_H,
    forgotPerEmailH: env.AUTH_RL_FORGOT_PER_EMAIL_H,
    forgotPerIpH: env.AUTH_RL_FORGOT_PER_IP_H,
    resetPerIpH: env.AUTH_RL_RESET_PER_IP_H,
    changePasswordPerUserH: env.AUTH_RL_CHANGE_PASSWORD_PER_USER_H,
  },
} as const;
