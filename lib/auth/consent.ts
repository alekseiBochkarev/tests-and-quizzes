import { authConfig } from "@/lib/auth/authConfig";
import type { ConsentType } from "@/lib/generated/prisma/enums";

export const CONSENT_TERMS: ConsentType = "TERMS";
export const CONSENT_PRIVACY: ConsentType = "PRIVACY";
export const CONSENT_MARKETING: ConsentType = "MARKETING";

export const consentVersions = {
  terms: authConfig.legalTermsVersion,
  privacy: authConfig.legalPrivacyVersion,
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
}): ConsentRecordInput[] {
  const records: ConsentRecordInput[] = [
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
