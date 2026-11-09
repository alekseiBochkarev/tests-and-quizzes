import { describe, expect, it } from "vitest";

import { PASSWORD_MESSAGES, validatePassword } from "@/lib/auth/passwordPolicy";

describe("validatePassword", () => {
  it("принимает длинную фразу с пробелами внутри", () => {
    expect(validatePassword("моя тихая фраза 2026")).toEqual({ ok: true });
  });

  it("отклоняет ведущий пробел с понятным текстом", () => {
    expect(validatePassword(" Correct-Horse-9")).toEqual({
      ok: false,
      reason: "outer_spaces",
      message: PASSWORD_MESSAGES.outerSpaces,
    });
  });

  it("отклоняет замыкающий пробел", () => {
    expect(validatePassword("Correct-Horse-9 ")).toEqual({
      ok: false,
      reason: "outer_spaces",
      message: PASSWORD_MESSAGES.outerSpaces,
    });
  });

  it("по-прежнему отклоняет короткий пароль", () => {
    const result = validatePassword("short");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("ожидалась ошибка длины");
    expect(result.reason).toBe("too_short");
  });
});
