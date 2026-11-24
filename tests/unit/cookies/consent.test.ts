import { describe, expect, it } from "vitest";

import { buildCookieConsentRecords, consentVersions } from "@/lib/auth/consent";
import {
  COOKIE_CONSENT_MAX_AGE_DAYS,
  createCookieConsent,
  parseCookieConsent,
  serializeCookieConsent,
} from "@/lib/cookies/consent";

const VERSION = "2026-11-24-draft";

describe("createCookieConsent", () => {
  it("сохраняет выбор, версию и время", () => {
    const consent = createCookieConsent({
      analytics: true,
      marketing: false,
      version: VERSION,
      updatedAt: new Date("2026-11-24T12:00:00.000Z"),
    });

    expect(consent).toEqual({
      analytics: true,
      marketing: false,
      version: VERSION,
      updatedAt: "2026-11-24T12:00:00.000Z",
    });
  });

  it("по умолчанию ставит текущее время", () => {
    const consent = createCookieConsent({
      analytics: false,
      marketing: false,
      version: VERSION,
    });

    expect(Number.isNaN(Date.parse(consent.updatedAt))).toBe(false);
  });
});

describe("serializeCookieConsent / parseCookieConsent", () => {
  const cases = [
    { analytics: false, marketing: false },
    { analytics: true, marketing: false },
    { analytics: false, marketing: true },
    { analytics: true, marketing: true },
  ];

  it.each(cases)("читает обратно выбор %o", (choice) => {
    const consent = createCookieConsent({ ...choice, version: VERSION });
    const parsed = parseCookieConsent(serializeCookieConsent(consent), VERSION);

    expect(parsed).toEqual(consent);
  });

  it("считает отсутствие cookie отсутствием согласия", () => {
    expect(parseCookieConsent(undefined, VERSION)).toBeNull();
    expect(parseCookieConsent(null, VERSION)).toBeNull();
    expect(parseCookieConsent("", VERSION)).toBeNull();
  });

  it("принимает и сырой JSON, и percent-encoded значение из браузера", () => {
    const consent = createCookieConsent({ analytics: true, marketing: false, version: VERSION });

    expect(parseCookieConsent(JSON.stringify(consent), VERSION)).toEqual(consent);
    expect(
      parseCookieConsent(encodeURIComponent(JSON.stringify(consent)), VERSION),
    ).toEqual(consent);
  });

  it("сбрасывает выбор при смене версии политики", () => {
    const consent = createCookieConsent({ analytics: true, marketing: true, version: VERSION });
    expect(parseCookieConsent(serializeCookieConsent(consent), "2027-01-01")).toBeNull();
  });

  it("не доверяет битой cookie", () => {
    expect(parseCookieConsent("%%%", VERSION)).toBeNull();
    expect(parseCookieConsent("not-json", VERSION)).toBeNull();
    expect(parseCookieConsent(encodeURIComponent("[]"), VERSION)).toBeNull();
    expect(parseCookieConsent(encodeURIComponent('"text"'), VERSION)).toBeNull();
    expect(parseCookieConsent("x".repeat(1025), VERSION)).toBeNull();
  });

  it("отклоняет неполные и небулевы значения", () => {
    const base = { version: VERSION, updatedAt: new Date().toISOString() };
    const variants = [
      { ...base },
      { ...base, analytics: "true", marketing: false },
      { ...base, analytics: false, marketing: 1 },
      { ...base, analytics: true, marketing: false, updatedAt: undefined },
      { analytics: true, marketing: false, updatedAt: base.updatedAt },
    ];

    for (const value of variants) {
      expect(parseCookieConsent(encodeURIComponent(JSON.stringify(value)), VERSION)).toBeNull();
    }
  });
});

describe("buildCookieConsentRecords", () => {
  it("пишет обе категории и фиксирует отказ", () => {
    const records = buildCookieConsentRecords({
      analytics: false,
      marketing: true,
      ip: "203.0.113.10",
      userAgent: "Test Agent",
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      type: "COOKIE_ANALYTICS",
      version: consentVersions.cookies,
      accepted: false,
      ip: "203.0.113.10",
      userAgent: "Test Agent",
    });
    expect(records[1]).toMatchObject({
      type: "COOKIE_MARKETING",
      version: consentVersions.cookies,
      accepted: true,
    });
  });
});

describe("COOKIE_CONSENT_MAX_AGE_DAYS", () => {
  it("задаёт разумный срок и не равен нулю", () => {
    expect(COOKIE_CONSENT_MAX_AGE_DAYS).toBeGreaterThanOrEqual(90);
  });
});
