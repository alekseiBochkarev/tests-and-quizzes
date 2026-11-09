import { cookies } from "next/headers";

import { authConfig } from "@/lib/auth/authConfig";
import { SESSION_COOKIE, signSession, verifySession } from "@/lib/auth/session";
import { env } from "@/lib/env";

/**
 * Тонкий адаптер над next/headers — единственное место в lib/auth/*,
 * которое пишет/удаляет сессионную cookie. Чистая логика — в session.ts.
 */

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: authConfig.cookieSecure,
    path: "/",
    maxAge: authConfig.sessionTtlDays * 24 * 60 * 60,
  };
}

/** Выставляет cookie `<userId>:<epoch>.<hmac>`. */
export async function setSession(userId: string, epoch: number): Promise<void> {
  const cookieStore = await cookies();
  const value = signSession(userId, epoch, env.AUTH_SECRET);
  cookieStore.set(SESSION_COOKIE, value, cookieOptions());
}

/** Удаляет cookie. Идемпотентно. */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

/** Читает и проверяет подпись cookie. Возвращает userId/epoch или null. */
export async function readSession(): Promise<{ userId: string; epoch: number } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySession(raw, env.AUTH_SECRET);
}
