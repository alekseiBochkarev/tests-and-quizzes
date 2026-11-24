import { authConfig } from "@/lib/auth/authConfig";
import type { ConsentType } from "@/lib/generated/prisma/enums";

export const CONSENT_TERMS: ConsentType = "TERMS";
export const CONSENT_PRIVACY: ConsentType = "PRIVACY";
export const CONSENT_MARKETING: ConsentType = "MARKETING";
export const CONSENT_COOKIE_ANALYTICS: ConsentType = "COOKIE_ANALYTICS";
export const CONSENT_COOKIE_MARKETING: ConsentType = "COOKIE_MARKETING";

export const consentVersions = {
  terms: authConfig.legalTermsVersion,
  privacy: authConfig.legalPrivacyVersion,
  cookies: authConfig.legalCookiesVersion,
} as const;

export type ConsentRecordInput = {
  type: ConsentType;
  version: string;
  accepted: boolean;
  ip: string | null;
  userAgent: string | null;
};

/**
 * Записи Consent для регистрации (§7.3, C7).
 *
 * Обязательные согласия пишутся всегда как `accepted: true` — роут не
 * доходит до создания пользователя, если хотя бы одно не отмечено.
 * Маркетинговое согласие записывается всегда: и opt-in, и opt-out —
 * это нужно для аудита и выполнения 152-ФЗ. Версия — версия политики
 * конфиденциальности (маркетинговые условия описаны в ней).
 */
export function buildConsentRecords(params: {
  marketingOptIn: boolean;
  ip: string | null;
  userAgent: string | null;
}): ConsentRecordInput[] {  const records: ConsentRecordInput[] = [
    {
      type: CONSENT_TERMS,
      version: consentVersions.terms,
      accepted: true,
      ip: params.ip,
      userAgent: params.userAgent,
    },
    {
      type: CONSENT_PRIVACY,
      version: consentVersions.privacy,
      accepted: true,
      ip: params.ip,
      userAgent: params.userAgent,
    },
    {
      type: CONSENT_MARKETING,
      version: consentVersions.privacy,
      accepted: params.marketingOptIn,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  ];

  return records;
}

/**
 * Аудит cookie-согласия (ACC-03).
 *
 * Пишем обе категории при каждом изменении: и включение, и отказ. Так видно
 * не только текущее решение, но и историю — этого требует 152-ФЗ. Записи
 * создаются только для вошедшего пользователя; выбор гостя живёт в cookie.
 */
export function buildCookieConsentRecords(params: {
  analytics: boolean;
  marketing: boolean;
  ip: string | null;
  userAgent: string | null;
}): ConsentRecordInput[] {
  return [
    {
      type: CONSENT_COOKIE_ANALYTICS,
      version: consentVersions.cookies,
      accepted: params.analytics,
      ip: params.ip,
      userAgent: params.userAgent,
    },
    {
      type: CONSENT_COOKIE_MARKETING,
      version: consentVersions.cookies,
      accepted: params.marketing,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  ];
}
