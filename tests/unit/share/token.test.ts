import { describe, expect, it } from "vitest";

import {
  createShareToken,
  sharePath,
  shareUrl,
  verifyShareToken,
} from "@/lib/share/token";

const SECRET = "unit-test-secret-0123456789-abcdefghijklmnop";
const ATTEMPT = "cm5share0test0attempt0id";

describe("createShareToken", () => {
  it("выдаёт url-safe токен фиксированной длины", () => {
    const token = createShareToken(ATTEMPT, SECRET);

    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("стабилен: один результат — один адрес", () => {
    expect(createShareToken(ATTEMPT, SECRET)).toBe(createShareToken(ATTEMPT, SECRET));
  });

  it("у разных попыток разные токены", () => {
    expect(createShareToken(ATTEMPT, SECRET)).not.toBe(
      createShareToken(`${ATTEMPT}-2`, SECRET),
    );
  });

  it("не подписывает пустые значения", () => {
    expect(() => createShareToken("", SECRET)).toThrow();
    expect(() => createShareToken(ATTEMPT, "")).toThrow();
  });
});

describe("verifyShareToken", () => {
  it("принимает свой токен", () => {
    const token = createShareToken(ATTEMPT, SECRET);

    expect(verifyShareToken(ATTEMPT, token, SECRET)).toBe(true);
  });

  it("не принимает токен от другой попытки", () => {
    const token = createShareToken(`${ATTEMPT}-2`, SECRET);

    expect(verifyShareToken(ATTEMPT, token, SECRET)).toBe(false);
  });

  it("не принимает чужой секрет", () => {
    const token = createShareToken(ATTEMPT, SECRET);

    expect(verifyShareToken(ATTEMPT, token, "another-secret-0123456789-abcdefghijk")).toBe(
      false,
    );
  });

  it("не принимает испорченный токен", () => {
    const token = createShareToken(ATTEMPT, SECRET);
    const last = token.at(-1) === "A" ? "B" : "A";
    const tampered = `${token.slice(0, -1)}${last}`;

    expect(verifyShareToken(ATTEMPT, tampered, SECRET)).toBe(false);
    expect(verifyShareToken(ATTEMPT, token.slice(0, -1), SECRET)).toBe(false);
    expect(verifyShareToken(ATTEMPT, `${token}A`, SECRET)).toBe(false);
  });

  it("отбрасывает мусор без исключений", () => {
    for (const token of [null, undefined, "", "short", "../etc/passwd", "x".repeat(32)]) {
      expect(verifyShareToken(ATTEMPT, token, SECRET)).toBe(false);
    }
    expect(verifyShareToken("", createShareToken(ATTEMPT, SECRET), SECRET)).toBe(false);
    expect(verifyShareToken(ATTEMPT, createShareToken(ATTEMPT, SECRET), "")).toBe(false);
  });
});

describe("sharePath / shareUrl", () => {
  it("собирает путь публичной страницы", () => {
    expect(sharePath("abc", "token")).toBe("/share/abc/token");
    expect(sharePath("a/b", "token")).toBe("/share/a%2Fb/token");
  });

  it("собирает абсолютную ссылку и не дублирует слэш", () => {
    expect(shareUrl("abc", "token", "http://localhost:3000")).toBe(
      "http://localhost:3000/share/abc/token",
    );
    expect(shareUrl("abc", "token", "https://example.org/")).toBe(
      "https://example.org/share/abc/token",
    );
  });
});
