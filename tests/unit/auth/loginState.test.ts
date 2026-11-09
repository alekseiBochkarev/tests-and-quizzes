import { describe, expect, it } from "vitest";

import { nextFailedLoginState } from "@/lib/auth/loginState";

const MAX = 5;
const LOCKOUT_MINUTES = 15;
const NOW = new Date("2026-11-09T10:00:00Z");

function call(params: { failedLoginCount: number; lockedUntil: Date | null; now?: Date }) {
  return nextFailedLoginState({
    failedLoginCount: params.failedLoginCount,
    lockedUntil: params.lockedUntil,
    now: params.now ?? NOW,
    maxFailedAttempts: MAX,
    lockoutMinutes: LOCKOUT_MINUTES,
  });
}

describe("nextFailedLoginState", () => {
  it("активная блокировка не продлевается и не увеличивает счётчик", () => {
    const lockedUntil = new Date(NOW.getTime() + 5 * 60 * 1000);

    const state = call({ failedLoginCount: 5, lockedUntil });

    expect(state).toEqual({
      failedLoginCount: 5,
      lockedUntil,
      shouldUpdate: false,
    });
  });

  it("истёкшая блокировка со старым счётчиком сбрасывается перед неудачей", () => {
    const lockedUntil = new Date(NOW.getTime() - 1000);

    const state = call({ failedLoginCount: 5, lockedUntil });

    expect(state).toEqual({
      failedLoginCount: 1,
      lockedUntil: null,
      shouldUpdate: true,
    });
  });

  it("достижение порога выставляет lockedUntil на 15 минут", () => {
    const state = call({ failedLoginCount: MAX - 1, lockedUntil: null });

    expect(state.failedLoginCount).toBe(MAX);
    expect(state.lockedUntil).toEqual(new Date(NOW.getTime() + LOCKOUT_MINUTES * 60 * 1000));
    expect(state.shouldUpdate).toBe(true);
  });

  it("обычная неудача инкрементирует счётчик без блокировки", () => {
    const state = call({ failedLoginCount: 0, lockedUntil: null });

    expect(state).toEqual({
      failedLoginCount: 1,
      lockedUntil: null,
      shouldUpdate: true,
    });
  });

  it("AC-AUTH-13: 5 неверных запирают, 6-я неудача не продлевает блокировку", () => {
    let state = { failedLoginCount: 0, lockedUntil: null as Date | null };

    for (let attempt = 1; attempt <= MAX; attempt += 1) {
      const next = call(state);
      state = { failedLoginCount: next.failedLoginCount, lockedUntil: next.lockedUntil };
    }

    expect(state.failedLoginCount).toBe(5);
    expect(state.lockedUntil).not.toBeNull();
    const lockedUntil = state.lockedUntil;
    if (!lockedUntil) throw new Error("блокировка не выставлена");

    // 6-я неверная попытка при активной блокировке: 401, но состояние не меняется.
    const sixth = call(state);
    expect(sixth.shouldUpdate).toBe(false);
    expect(sixth.failedLoginCount).toBe(5);
    expect(sixth.lockedUntil).toEqual(lockedUntil);

    // После истечения 15 минут одна опечатка даёт счётчик 1, а не новую блокировку.
    const afterUnlock = call({
      failedLoginCount: state.failedLoginCount,
      lockedUntil,
      now: new Date(lockedUntil.getTime() + 1),
    });
    expect(afterUnlock.failedLoginCount).toBe(1);
    expect(afterUnlock.lockedUntil).toBeNull();
  });
});
