import { describe, expect, it } from "vitest";

import {
  isTopicThemeKey,
  resolveTopicTheme,
  THEME_BY_SLUG,
  TOPIC_THEME_HERO_KEYS,
  TOPIC_THEME_KEYS,
  TOPIC_THEME_LABELS,
  TOPIC_THEME_SERIF_KEYS,
  type TopicThemeKey,
} from "@/lib/ui/topicThemes";

const EXPECTED_KEYS = [
  "cinema",
  "music",
  "literature",
  "history",
  "geography",
  "animals",
  "cooking",
  "nostalgia",
  "magic",
] as const;

describe("реестр тем", () => {
  it("содержит девять ключей в порядке ТЗ", () => {
    expect(TOPIC_THEME_KEYS).toEqual(EXPECTED_KEYS);
  });

  it("каждый ключ достижим через карту slug → ключ", () => {
    const reachable = new Set<TopicThemeKey>(Object.values(THEME_BY_SLUG));
    for (const key of TOPIC_THEME_KEYS) {
      expect(reachable.has(key), `ключ ${key} недостижим по slug`).toBe(true);
    }
  });

  it("у каждого ключа есть русская подпись", () => {
    for (const key of TOPIC_THEME_KEYS) {
      expect(TOPIC_THEME_LABELS[key].trim().length, `подпись ${key}`).toBeGreaterThan(0);
    }
  });

  it("подписи совпадают с названиями из ТЗ", () => {
    expect(TOPIC_THEME_LABELS).toEqual({
      cinema: "Советское кино",
      music: "Песни и музыка",
      literature: "Литература",
      history: "История",
      geography: "География",
      animals: "Животные",
      cooking: "Кулинария и традиции",
      nostalgia: "Быт и ностальгия",
      magic: "Гарри Поттер",
    });
  });

  it("уровень B и антиква — подмножества реестра", () => {
    for (const key of TOPIC_THEME_HERO_KEYS) {
      expect(TOPIC_THEME_KEYS).toContain(key);
    }
    for (const key of TOPIC_THEME_SERIF_KEYS) {
      expect(TOPIC_THEME_KEYS).toContain(key);
    }
  });
});

describe("isTopicThemeKey", () => {
  it("принимает известные ключи", () => {
    for (const key of TOPIC_THEME_KEYS) {
      expect(isTopicThemeKey(key)).toBe(true);
    }
  });

  it("отклоняет неизвестные значения", () => {
    expect(isTopicThemeKey("neon")).toBe(false);
    expect(isTopicThemeKey("Cinema")).toBe(false);
    expect(isTopicThemeKey("")).toBe(false);
    expect(isTopicThemeKey(null)).toBe(false);
    expect(isTopicThemeKey(undefined)).toBe(false);
    expect(isTopicThemeKey(42)).toBe(false);
  });
});

describe("resolveTopicTheme", () => {
  it("без slug и ключа оставляет тему нейтральной", () => {
    expect(resolveTopicTheme(null, null)).toBeNull();
    expect(resolveTopicTheme(undefined, undefined)).toBeNull();
    expect(resolveTopicTheme("", "")).toBeNull();
    expect(resolveTopicTheme(null, undefined)).toBeNull();
  });

  it("подставляет ключ по slug, если поле пустое", () => {
    expect(resolveTopicTheme("soviet-cinema", null)).toBe("cinema");
    expect(resolveTopicTheme("music", undefined)).toBe("music");
    expect(resolveTopicTheme("harry-potter", "")).toBe("magic");
  });

  it("ставит ключ из базы выше фолбэка по slug", () => {
    expect(resolveTopicTheme("music", "history")).toBe("history");
    expect(resolveTopicTheme("paintings", "magic")).toBe("magic");
  });

  it("незнакомый ключ из базы даёт нейтральную тему даже при известном slug", () => {
    expect(resolveTopicTheme("soviet-cinema", "neon")).toBeNull();
    expect(resolveTopicTheme("music", "cinema-vhs")).toBeNull();
  });

  it("не зависит от регистра и лишних пробелов", () => {
    expect(resolveTopicTheme("  Soviet-Cinema ", null)).toBe("cinema");
    expect(resolveTopicTheme(null, "  Cinema  ")).toBe("cinema");
    expect(resolveTopicTheme("literature", " MAGIC ")).toBe("magic");
  });

  it("оставляет нейтральными темы без ключа", () => {
    expect(resolveTopicTheme("paintings", null)).toBeNull();
    expect(resolveTopicTheme("exact-sciences", undefined)).toBeNull();
    expect(resolveTopicTheme("unknown-topic", null)).toBeNull();
  });
});
