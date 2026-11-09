import { describe, expect, it } from "vitest";

import { safeNext } from "@/lib/http/redirect";

const APP_URL = "http://localhost:3000";

describe("safeNext", () => {
  it("пропускает внутренние пути", () => {
    expect(safeNext("/account", APP_URL)).toBe("/account");
    expect(safeNext("/login?next=/account", APP_URL)).toBe("/login?next=/account");
    expect(safeNext("/", APP_URL)).toBe("/");
    expect(safeNext("/tests/history?page=2", APP_URL)).toBe("/tests/history?page=2");
  });

  it("без значения возвращает fallback (/account по умолчанию)", () => {
    expect(safeNext(null, APP_URL)).toBe("/account");
    expect(safeNext(undefined, APP_URL)).toBe("/account");
    expect(safeNext("", APP_URL)).toBe("/account");
    expect(safeNext(null, APP_URL, "/")).toBe("/");
  });

  it("отбрасывает внешние и protocol-relative URL", () => {
    expect(safeNext("//evil.com", APP_URL)).toBe("/account");
    expect(safeNext("https://evil.com", APP_URL)).toBe("/account");
    expect(safeNext("http://evil.com/account", APP_URL)).toBe("/account");
    expect(safeNext("evil.com", APP_URL)).toBe("/account");
  });

  it("отбрасывает обход через обратный слеш и кодирование", () => {
    expect(safeNext("/\\evil.com", APP_URL)).toBe("/account");
    expect(safeNext("/%5cevil.com", APP_URL)).toBe("/account");
    expect(safeNext("/%2f%2fevil.com", APP_URL)).toBe("/account");
    expect(safeNext("/%5Cevil.com", APP_URL)).toBe("/account");
  });

  it("отбрасывает javascript: и управляющие символы", () => {
    expect(safeNext("javascript:alert(1)", APP_URL)).toBe("/account");
    expect(safeNext("JavaScript:alert(1)", APP_URL)).toBe("/account");
    expect(safeNext("/account\nSet-Cookie: x=1", APP_URL)).toBe("/account");
    expect(safeNext("/account\u0000", APP_URL)).toBe("/account");
  });

  it("некорректный APP_URL — безопасный fallback", () => {
    expect(safeNext("/account", "not-a-url")).toBe("/account");
    expect(safeNext("/other", "not-a-url", "/")).toBe("/");
  });
});
