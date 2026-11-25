import { describe, expect, it } from "vitest";

import {
  clampText,
  resultPraise,
  scoreLine,
  shareDescription,
  shareHeadline,
  shareMessage,
} from "@/lib/share/text";

const base = {
  title: "История",
  correctCount: 17,
  questionCount: 20,
  percent: 85,
};

describe("scoreLine", () => {
  it("не склоняет «вопрос» и не ломается на 1", () => {
    expect(scoreLine(17, 20)).toBe("17 из 20 верно");
    expect(scoreLine(1, 1)).toBe("1 из 1 верно");
    expect(scoreLine(0, 10)).toBe("0 из 10 верно");
  });
});

describe("resultPraise", () => {
  it("держит границы мягких оценок", () => {
    expect(resultPraise(100)).toBe("Отличный результат");
    expect(resultPraise(90)).toBe("Отличный результат");
    expect(resultPraise(89)).toBe("Хороший результат");
    expect(resultPraise(70)).toBe("Хороший результат");
    expect(resultPraise(69)).toBe("Неплохой результат");
    expect(resultPraise(50)).toBe("Неплохой результат");
    expect(resultPraise(49)).toBe("Есть что повторить");
    expect(resultPraise(0)).toBe("Есть что повторить");
  });
});

describe("тексты для соцсетей", () => {
  it("заголовок — процент и название теста", () => {
    expect(shareHeadline({ title: "История", percent: 85 })).toBe("85% — История");
  });

  it("описание содержит название и результат", () => {
    const description = shareDescription({
      title: "История",
      correctCount: 17,
      questionCount: 20,
    });

    expect(description).toContain("«История»");
    expect(description).toContain("17 из 20 верно");
  });

  it("сообщение не содержит ссылку: её добавляет мессенджер", () => {
    const message = shareMessage(base);

    expect(message).toContain("«История»");
    expect(message).toContain("85%");
    expect(message).toContain("17 из 20 верно");
    expect(message).not.toContain("http");
  });

  it("для теста дня подставляется его название", () => {
    const message = shareMessage({
      ...base,
      title: "Тест дня",
      correctCount: 4,
      questionCount: 5,
      percent: 80,
    });

    expect(message).toContain("«Тест дня»");
    expect(message).toContain("4 из 5 верно");
  });
});

describe("clampText", () => {
  it("короткий текст не меняет", () => {
    expect(clampText("История", 20)).toBe("История");
    expect(clampText("  История  ", 20)).toBe("История");
  });

  it("длинный — обрезает по границе и ставит многоточие", () => {
    const result = clampText("а".repeat(100), 68);

    expect(result).toHaveLength(68);
    expect(result.endsWith("…")).toBe(true);
  });

  it("не оставляет пробел перед многоточием", () => {
    const result = clampText("История кино и театра", 10);

    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain(" …");
  });
});
