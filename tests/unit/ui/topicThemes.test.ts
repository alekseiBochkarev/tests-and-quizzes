import { describe, expect, it } from "vitest";

import { getTopicTheme, TOPIC_THEME_KEYS } from "@/lib/ui/topicThemes";

describe("getTopicTheme", () => {
  it("включает оформление для тем пилота", () => {
    expect(getTopicTheme("soviet-cinema")).toBe("cinema");
    expect(getTopicTheme("music")).toBe("music");
  });

  it("не зависит от регистра и лишних пробелов", () => {
    expect(getTopicTheme("  Music ")).toBe("music");
  });

  it("оставляет нейтральными темы без оформления", () => {
    expect(getTopicTheme("history")).toBeNull();
    expect(getTopicTheme("")).toBeNull();
    expect(getTopicTheme(null)).toBeNull();
    expect(getTopicTheme(undefined)).toBeNull();
  });

  it("каждый ключ из списка достижим хотя бы одним slug", () => {
    const reachable = new Set(
      ["soviet-cinema", "music"].map((slug) => getTopicTheme(slug)).filter(Boolean),
    );
    for (const key of TOPIC_THEME_KEYS) {
      expect(reachable.has(key)).toBe(true);
    }
  });
});
