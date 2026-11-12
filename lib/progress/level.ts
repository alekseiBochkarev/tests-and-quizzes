/**
 * Уровни знатока и пороги баллов.
 *
 * В интерфейсе это «баллы» и «уровень», внутри — XP.
 * Таблица из docs/03-progress-model.md §5.2: уровни 1–15, дальше +5 000 за уровень.
 */

export const LEVEL_THRESHOLDS: readonly number[] = [
  0, // 1
  100, // 2
  250, // 3
  500, // 4
  900, // 5
  1_400, // 6
  2_000, // 7
  2_800, // 8
  3_800, // 9
  5_000, // 10
  6_500, // 11
  8_500, // 12
  11_000, // 13
  14_000, // 14
  18_000, // 15
];

const LEVEL_STEP_AFTER_15 = 5_000;

/** Минимальный XP для уровня (1-based). */
export function xpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.trunc(level));
  if (safeLevel <= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[safeLevel - 1] ?? 0;
  }
  const base = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 0;
  return base + (safeLevel - LEVEL_THRESHOLDS.length) * LEVEL_STEP_AFTER_15;
}

/** Уровень по накопленным баллам. */
export function levelForXp(xp: number): number {
  const safeXp = Math.max(0, Math.trunc(xp));
  let level = 1;

  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (safeXp >= (LEVEL_THRESHOLDS[index] ?? 0)) {
      level = index + 1;
    } else {
      break;
    }
  }

  if (safeXp >= (LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 0)) {
    const base = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 0;
    level = LEVEL_THRESHOLDS.length + Math.floor((safeXp - base) / LEVEL_STEP_AFTER_15);
  }

  return level;
}

export type LevelProgress = {
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  pointsToNext: number;
};

/** Сколько баллов осталось до следующего уровня. */
export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.trunc(xp));
  const level = levelForXp(safeXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);

  return {
    level,
    xp: safeXp,
    currentLevelXp,
    nextLevelXp,
    pointsToNext: Math.max(0, nextLevelXp - safeXp),
  };
}
