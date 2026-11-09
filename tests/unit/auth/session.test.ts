import { describe, expect, it } from "vitest";

import { parseSession, SESSION_COOKIE, signSession, verifySession } from "@/lib/auth/session";

const SECRET = "unit-test-secret-0123456789-abcdefghijklmnop";

describe("parseSession", () => {
  it("разбирает формат <userId>:<epoch>.<signature>", () => {
    expect(parseSession("ckk1abc:3.signature")).toEqual({
      userId: "ckk1abc",
      epoch: 3,
      signature: "signature",
    });
    expect(parseSession("ckk1abc:0.sig")).toEqual({
      userId: "ckk1abc",
      epoch: 0,
      signature: "sig",
    });
  });

  it("берёт последнее двоеточие, поэтому id с двоеточием не ломает разбор", () => {
    expect(parseSession("odd:id:42:7.sig")).toEqual({
      userId: "odd:id:42",
      epoch: 7,
      signature: "sig",
    });
  });

  it("мусор и cookie старого формата без подписи — null", () => {
    for (const raw of [
      null,
      undefined,
      "",
      "ckk1abc",
      ":5",
      "ckk1abc:",
      "ckk1abc:abc",
      "ckk1abc:-1",
      "ckk1abc:1",
      "ckk1abc:1.",
      ".signature",
    ]) {
      expect(parseSession(raw)).toBeNull();
    }
  });

  it("имя cookie фиксировано контрактом §8.9", () => {
    expect(SESSION_COOKIE).toBe("quiz_user_id");
  });
});

describe("signSession / verifySession", () => {
  it("подписывает и проверяет cookie", () => {
    const raw = signSession("user-1", 2, SECRET);

    expect(raw).toMatch(/^user-1:2\.[A-Za-z0-9_-]+$/);
    expect(verifySession(raw, SECRET)).toEqual({ userId: "user-1", epoch: 2 });
  });

  it("не принимает cookie с другим секретом", () => {
    const raw = signSession("user-1", 2, SECRET);

    expect(verifySession(raw, "another-secret-0123456789-abcdefghijkl")).toBeNull();
  });

  it("не принимает подделанную подпись", () => {
    const raw = signSession("user-1", 2, SECRET);
    const [payload, signature] = raw.split(".");
    const tampered = `${payload}.${signature?.slice(0, -1)}x`;

    expect(verifySession(tampered, SECRET)).toBeNull();
    // parseSession формат принимает, но verifySession отбрасывает: подпись не сходится.
    expect(verifySession("ckk1abc:1.5", SECRET)).toBeNull();
  });

  it("не принимает подменённый userId или epoch (подпись не совпадёт)", () => {
    const raw = signSession("user-1", 2, SECRET);
    const signature = raw.slice(raw.lastIndexOf(".") + 1);

    expect(verifySession(`user-2:2.${signature}`, SECRET)).toBeNull();
    expect(verifySession(`user-1:3.${signature}`, SECRET)).toBeNull();
  });

  it("cookie прежней сессии (старый epoch) не выдаёт себя за текущую", () => {
    const oldCookie = signSession("user-1", 1, SECRET);
    const currentCookie = signSession("user-1", 2, SECRET);

    expect(verifySession(oldCookie, SECRET)).toEqual({ userId: "user-1", epoch: 1 });
    expect(verifySession(currentCookie, SECRET)).toEqual({ userId: "user-1", epoch: 2 });
    // Само значение cookie подтверждает только подпись; актуальность epoch
    // сверяется с БД в currentUser.ts, поэтому значения epoch должны различаться.
    expect(oldCookie).not.toBe(currentCookie);
  });

  it("пустой секрет — сессия недействительна", () => {
    expect(verifySession(signSession("user-1", 0, SECRET), "")).toBeNull();
  });

  it("не подписывает пустой userId и отрицательный/дробный epoch", () => {
    expect(() => signSession("", 0, SECRET)).toThrow();
    expect(() => signSession("user-1", -1, SECRET)).toThrow();
    expect(() => signSession("user-1", 1.5, SECRET)).toThrow();
  });
});
