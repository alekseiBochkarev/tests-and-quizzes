import { describe, expect, it } from "vitest";

import { LEVEL_THRESHOLDS, levelForXp, levelProgress, xpForLevel } from "@/lib/progress/level";

describe("levelForXp", () => {
  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [249, 2],
    [250, 3],
    [899, 4],
    [900, 5],
    [4999, 9],
    [5000, 10],
    [17999, 14],
    [18000, 15],
    [22999, 15],
    [23000, 16],
    [28000, 17],
  ])("xp %i → уровень %i", (xp, level) => {
    expect(levelForXp(xp)).toBe(level);
  });

  it("отрицательный XP считается нулём", () => {
    expect(levelForXp(-100)).toBe(1);
  });
});

describe("xpForLevel", () => {
  it("совпадает с таблицей порогов", () => {
    LEVEL_THRESHOLDS.forEach((threshold, index) => {
      expect(xpForLevel(index + 1)).toBe(threshold);
    });
  });

  it("после 15 уровня прибавляет по 5 000", () => {
    expect(xpForLevel(16)).toBe(23_000);
    expect(xpForLevel(17)).toBe(28_000);
  });
});

describe("levelProgress", () => {
  it("считает остаток до следующего уровня", () => {
    expect(levelProgress(650)).toEqual({
      level: 4,
      xp: 650,
      currentLevelXp: 500,
      nextLevelXp: 900,
      pointsToNext: 250,
    });
  });

  it("на пороге показывает следующий уровень и полный интервал", () => {
    expect(levelProgress(500)).toMatchObject({
      level: 4,
      currentLevelXp: 500,
      nextLevelXp: 900,
      pointsToNext: 400,
    });
  });
});
