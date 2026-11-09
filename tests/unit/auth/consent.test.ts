import { describe, expect, it } from "vitest";

import { authConfig } from "@/lib/auth/authConfig";
import {
  buildConsentRecords,
  CONSENT_MARKETING,
  CONSENT_PRIVACY,
  CONSENT_TERMS,
  consentVersions,
} from "@/lib/auth/consent";

const BASE = { ip: "203.0.113.10", userAgent: "unit-test" };

describe("buildConsentRecords", () => {
  it("всегда пишет TERMS и PRIVACY как принятые", () => {
    const records = buildConsentRecords({ ...BASE, marketingOptIn: false });

    const terms = records.find((record) => record.type === CONSENT_TERMS);
    const privacy = records.find((record) => record.type === CONSENT_PRIVACY);

    expect(terms).toMatchObject({ accepted: true, version: consentVersions.terms });
    expect(privacy).toMatchObject({ accepted: true, version: consentVersions.privacy });
    expect(records).toHaveLength(3);
  });

  it("opt-in сохраняет маркетинговое согласие с accepted: true", () => {
    const records = buildConsentRecords({ ...BASE, marketingOptIn: true });

    const marketing = records.find((record) => record.type === CONSENT_MARKETING);
    expect(marketing).toEqual({
      type: CONSENT_MARKETING,
      version: authConfig.legalPrivacyVersion,
      accepted: true,
      ip: BASE.ip,
      userAgent: BASE.userAgent,
    });
  });

  it("opt-out тоже фиксируется, но с accepted: false", () => {
    const records = buildConsentRecords({ ...BASE, marketingOptIn: false });

    const marketing = records.find((record) => record.type === CONSENT_MARKETING);
    expect(marketing).toEqual({
      type: CONSENT_MARKETING,
      version: authConfig.legalPrivacyVersion,
      accepted: false,
      ip: BASE.ip,
      userAgent: BASE.userAgent,
    });
  });
});
