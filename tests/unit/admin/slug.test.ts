import { describe, expect, it } from "vitest";

import { SLUG_PATTERN, normalizeSlug, slugify } from "@/lib/admin/slug";

describe("slugify", () => {
  it("переводит русское название в латинский адрес", () => {
    expect(slugify("Советское кино")).toBe("sovetskoe-kino");
    expect(slugify("Ёлки и ёжики")).toBe("elki-i-ezhiki");
  });

  it("убирает лишние дефисы и знаки препинания", () => {
    expect(slugify("  Кино: драма, комедия!  ")).toBe("kino-drama-komediya");
    expect(slugify("---Тест---")).toBe("test");
  });

  it("сохраняет латиницу и цифры", () => {
    expect(slugify("Harry Potter 2")).toBe("harry-potter-2");
  });

  it("возвращает пустую строку, если не осталось допустимых символов", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("ограничивает длину и не оставляет дефис в конце", () => {
    const result = slugify("а".repeat(200));
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith("-")).toBe(false);
    expect(SLUG_PATTERN.test(result)).toBe(true);
  });

  it("результат всегда проходит проверку адреса", () => {
    for (const value of ["Советское кино", "Наука и техника", "Кино 90-х", "Ёж"]) {
      expect(SLUG_PATTERN.test(slugify(value))).toBe(true);
    }
  });
});

describe("normalizeSlug", () => {
  it("обрезает пробелы и приводит к нижнему регистру", () => {
    expect(normalizeSlug("  Soviet-Cinema  ")).toBe("soviet-cinema");
  });
});
