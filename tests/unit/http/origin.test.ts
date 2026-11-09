import { describe, expect, it } from "vitest";

import { assertSameOrigin } from "@/lib/http/origin";

const APP_URL = "http://localhost:3000";

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers,
  });
}

describe("assertSameOrigin", () => {
  it("пропускает совпадающий Origin", () => {
    expect(assertSameOrigin(request({ origin: APP_URL }), APP_URL)).toBe(true);
    expect(
      assertSameOrigin(request({ origin: "http://localhost:3000" }), "http://localhost:3000/"),
    ).toBe(true);
  });

  it("отклоняет чужой Origin", () => {
    expect(assertSameOrigin(request({ origin: "https://evil.com" }), APP_URL)).toBe(false);
    expect(assertSameOrigin(request({ origin: "http://localhost:3001" }), APP_URL)).toBe(false);
    expect(assertSameOrigin(request({ origin: "null" }), APP_URL)).toBe(false);
  });

  it("без браузерных заголовков (curl, серверный клиент) разрешает запрос", () => {
    expect(assertSameOrigin(request(), APP_URL)).toBe(true);
  });

  it("без Origin, но с cross-site Sec-Fetch-Site — отклоняет", () => {
    expect(assertSameOrigin(request({ "sec-fetch-site": "cross-site" }), APP_URL)).toBe(false);
    expect(assertSameOrigin(request({ "sec-fetch-site": "same-site" }), APP_URL)).toBe(false);
    expect(assertSameOrigin(request({ "sec-fetch-site": "same-origin" }), APP_URL)).toBe(true);
    expect(assertSameOrigin(request({ "sec-fetch-site": "none" }), APP_URL)).toBe(true);
  });

  it("без Origin, но с чужим Referer — отклоняет; со своим — пропускает", () => {
    expect(assertSameOrigin(request({ referer: "https://evil.com/page" }), APP_URL)).toBe(false);
    expect(assertSameOrigin(request({ referer: "http://localhost:3000/login" }), APP_URL)).toBe(
      true,
    );
  });

  it("пустой или некорректный APP_URL — false", () => {
    expect(assertSameOrigin(request({ origin: APP_URL }), "")).toBe(false);
    expect(assertSameOrigin(request({ origin: APP_URL }), "not-a-url")).toBe(false);
  });

  it("Origin имеет приоритет над Sec-Fetch-Site и Referer", () => {
    expect(
      assertSameOrigin(
        request({
          origin: APP_URL,
          "sec-fetch-site": "cross-site",
          referer: "https://evil.com/",
        }),
        APP_URL,
      ),
    ).toBe(true);
  });
});
