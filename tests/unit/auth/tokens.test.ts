import { beforeEach, describe, expect, it, vi } from "vitest";

type TokenRow = {
  id: string;
  userId: string;
  type: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

// Хранилище-заглушка вместо настоящей БД: тестируем чистую логику lookupToken.
const dbState = vi.hoisted(() => ({ rows: [] as TokenRow[] }));

vi.mock("@/lib/db", () => ({
  prisma: {
    emailToken: {
      findUnique: async ({ where }: { where: { tokenHash: string } }) =>
        dbState.rows.find((row) => row.tokenHash === where.tokenHash) ?? null,
    },
  },
}));

import {
  createToken,
  hashToken,
  lookupToken,
  tokenTtlMs,
  TOKEN_BYTES,
  TOKEN_RESET,
  TOKEN_VERIFY,
} from "@/lib/auth/tokens";

const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  dbState.rows = [];
});

describe("createToken", () => {
  it("даёт 32 случайных байта в base64url без padding", () => {
    const token = createToken();

    expect(TOKEN_BYTES).toBe(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("не повторяется", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => createToken()));

    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("считает sha256 в hex по известному вектору", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("не равен сырому токену и детерминирован", () => {
    const raw = createToken();
    const hashed = hashToken(raw);

    expect(hashed).not.toBe(raw);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(raw)).toBe(hashed);
  });
});

describe("tokenTtlMs", () => {
  it("verify живёт 24 часа, reset — 1 час", () => {
    expect(tokenTtlMs(TOKEN_VERIFY)).toBe(24 * HOUR_MS);
    expect(tokenTtlMs(TOKEN_RESET)).toBe(1 * HOUR_MS);
  });
});

describe("lookupToken", () => {
  function insert(overrides: Partial<TokenRow> = {}): TokenRow {
    const row: TokenRow = {
      id: "token-1",
      userId: "user-1",
      type: TOKEN_VERIFY,
      tokenHash: hashToken("raw-token"),
      expiresAt: new Date(Date.now() + HOUR_MS),
      usedAt: null,
      ...overrides,
    };
    dbState.rows.push(row);
    return row;
  }

  it("находит валидный токен по сырому значению", async () => {
    insert();

    await expect(lookupToken("raw-token", TOKEN_VERIFY)).resolves.toEqual({
      status: "valid",
      tokenId: "token-1",
      userId: "user-1",
      expiresAt: expect.any(Date),
    });
  });

  it("использованный токен одноразовый — повторный lookup невалиден", async () => {
    insert({ usedAt: new Date() });

    await expect(lookupToken("raw-token", TOKEN_VERIFY)).resolves.toEqual({ status: "invalid" });
  });

  it("истёкший токен возвращает expired и id для повторной отправки", async () => {
    insert({ expiresAt: new Date(Date.now() - 1000) });

    await expect(lookupToken("raw-token", TOKEN_VERIFY)).resolves.toEqual({
      status: "expired",
      tokenId: "token-1",
      userId: "user-1",
    });
  });

  it("токен другого типа не подходит", async () => {
    insert({ type: TOKEN_RESET });

    await expect(lookupToken("raw-token", TOKEN_VERIFY)).resolves.toEqual({ status: "invalid" });
  });

  it("неизвестный и пустой токен — invalid", async () => {
    await expect(lookupToken("unknown", TOKEN_VERIFY)).resolves.toEqual({ status: "invalid" });
    await expect(lookupToken("", TOKEN_VERIFY)).resolves.toEqual({ status: "invalid" });
  });
});
