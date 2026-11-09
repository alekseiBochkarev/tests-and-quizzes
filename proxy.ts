import { NextResponse } from "next/server";

/**
 * security-заголовки для всех страниц и API.
 *
 * Сессия здесь намеренно не проверяется: прокси не ходит в БД.
 * Авторизация — в server components через getCurrentUser() (Sprint 1, шаг 6).
 *
 * CSP с 'unsafe-inline' для скриптов нужен из-за inline RSC-payload Next.js,
 * иначе ломается гидратация. 'unsafe-eval' и ws: добавляются только вне
 * production — их требует dev-режим (HMR, source maps).
 */
export function proxy() {
  const isProduction = process.env.APP_ENV === "production";

  const scriptSrc = isProduction
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  const connectSrc = isProduction ? "'self'" : "'self' ws: wss:";

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  // HSTS только в production: на localhost по http он бессмысленен и мешает.
  if (isProduction) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
