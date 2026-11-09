import { describe, expect, it } from "vitest";

import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword", () => {
  it("возвращает self-describing scrypt-строку нужного формата", () => {
    const stored = hashPassword("Correct-Horse-9");

    expect(stored).toMatch(/^scrypt\$1\$16384\$8\$1\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/);
    expect(stored.split("$")).toHaveLength(7);
  });

  it("не хранит пароль в открытом виде", () => {
    const password = "Visible-Password-42";
    const stored = hashPassword(password);

    expect(stored).not.toContain(password);
  });

  it("использует случайную соль: одинаковые пароли дают разные хеши", () => {
    expect(hashPassword("same-password")).not.toBe(hashPassword("same-password"));
  });
});

describe("verifyPassword", () => {
  it("принимает верный пароль и отклоняет неверный", () => {
    const stored = hashPassword("Sup3r-Secret!");

    expect(verifyPassword("Sup3r-Secret!", stored)).toBe(true);
    expect(verifyPassword("sup3r-secret!", stored)).toBe(false);
    expect(verifyPassword("Sup3r-Secret", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("пустой или отсутствующий хеш — false, без исключения", () => {
    expect(verifyPassword("whatever", null)).toBe(false);
    expect(verifyPassword("whatever", undefined)).toBe(false);
    expect(verifyPassword("whatever", "")).toBe(false);
  });

  it("повреждённая запись — false, а не падение", () => {
    const junk = [
      "abc",
      "scrypt$1$2$3$4",
      "scrypt$1$16384$8$1",
      "bcrypt$1$16384$8$1$c2FsdA==$aGFzaA==",
      "scrypt$x$16384$8$1$c2FsdA==$aGFzaA==",
      "scrypt$2$16384$8$1$c2FsdA==$aGFzaA==",
      "scrypt$1$999999999$8$1$c2FsdA==$aGFzaA==",
      "scrypt$1$16384$99$1$c2FsdA==$aGFzaA==",
      "scrypt$1$16384$8$1$$",
    ];

    for (const stored of junk) {
      expect(() => verifyPassword("whatever", stored)).not.toThrow();
      expect(verifyPassword("whatever", stored)).toBe(false);
    }
  });

  it("DUMMY_HASH валиден и не совпадает с обычными паролями", () => {
    expect(DUMMY_HASH).toMatch(/^scrypt\$1\$16384\$8\$1\$/);
    expect(verifyPassword("password", DUMMY_HASH)).toBe(false);
    expect(verifyPassword("12345678", DUMMY_HASH)).toBe(false);
  });
});
