import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkLoginRateLimit,
  checkRegisterRateLimit,
  clientIp,
  resetRateLimits,
} from "@/lib/auth/rateLimit";

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  resetRateLimits();
  vi.useRealTimers();
  delete process.env.TRUST_PROXY;
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.TRUST_PROXY;
});

describe("checkLoginRateLimit", () => {
  it("пропускает лимит попыток на email, затем отвечает limited с Retry-After", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T10:00:00Z"));

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      expect(checkLoginRateLimit("user@example.com", null)).toEqual({
        limited: false,
        retryAfterSeconds: 0,
      });
    }

    const limited = checkLoginRateLimit("user@example.com", null);
    expect(limited.limited).toBe(true);
    expect(limited.retryAfterSeconds).toBeGreaterThan(0);
    expect(limited.retryAfterSeconds).toBeLessThanOrEqual(FIFTEEN_MIN_MS / 1000);
  });

  it("окно сбрасывается через 15 минут", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T10:00:00Z"));

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      checkLoginRateLimit("user@example.com", null);
    }
    expect(checkLoginRateLimit("user@example.com", null).limited).toBe(true);

    vi.setSystemTime(new Date("2026-11-09T10:15:01Z"));

    expect(checkLoginRateLimit("user@example.com", null).limited).toBe(false);
  });

  it("бакеты email и IP раздельные", () => {
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      checkLoginRateLimit("one@example.com", null);
    }
    expect(checkLoginRateLimit("one@example.com", null).limited).toBe(true);

    // Другой email в том же окне не затронут.
    expect(checkLoginRateLimit("two@example.com", null).limited).toBe(false);

    // IP-бакет исчерпывается независимо от email.
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      expect(checkLoginRateLimit(`ip-${attempt}@example.com`, "203.0.113.10").limited).toBe(false);
    }
    expect(checkLoginRateLimit("ip-11@example.com", "203.0.113.10").limited).toBe(true);
    expect(checkLoginRateLimit("fresh@example.com", "203.0.113.11").limited).toBe(false);
  });

  it("операции не делят бакеты: исчерпанный login не трогает register", () => {
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      checkLoginRateLimit("user@example.com", null);
    }
    expect(checkLoginRateLimit("user@example.com", null).limited).toBe(true);

    expect(checkRegisterRateLimit("user@example.com", null).limited).toBe(false);
  });

  it("resetRateLimits очищает бакеты (только для тестов)", () => {
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      checkLoginRateLimit("user@example.com", null);
    }
    expect(checkLoginRateLimit("user@example.com", null).limited).toBe(true);

    resetRateLimits();

    expect(checkLoginRateLimit("user@example.com", null).limited).toBe(false);
  });
});

describe("checkRegisterRateLimit", () => {
  it("для одного email действует лимит 3 попытки в час", () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(checkRegisterRateLimit("user@example.com", null).limited).toBe(false);
    }
    expect(checkRegisterRateLimit("user@example.com", null).limited).toBe(true);
  });
});

describe("clientIp", () => {
  it("в local/test не доверяет заголовкам прокси", () => {
    const request = makeRequest({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "203.0.113.11",
    });

    expect(clientIp(request, "local")).toBeNull();
    expect(clientIp(request, "test")).toBeNull();
  });

  it("в production берёт первый валидный IP из x-forwarded-for", () => {
    const request = makeRequest({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });

    expect(clientIp(request, "production")).toBe("203.0.113.10");
  });

  it("в production при мусорном x-forwarded-for падает на x-real-ip", () => {
    const request = makeRequest({
      "x-forwarded-for": "not-an-ip",
      "x-real-ip": "203.0.113.12",
    });

    expect(clientIp(request, "production")).toBe("203.0.113.12");
  });

  it("TRUST_PROXY=true включает доверие заголовкам вне production", () => {
    process.env.TRUST_PROXY = "true";
    const request = makeRequest({ "x-forwarded-for": "203.0.113.13" });

    expect(clientIp(request, "local")).toBe("203.0.113.13");
  });

  it("без заголовков возвращает null", () => {
    expect(clientIp(makeRequest(), "production")).toBeNull();
  });
});
