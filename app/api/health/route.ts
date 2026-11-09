import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/**
 * Служебная проверка доступности приложения и БД.
 * Единственный роут вне конверта {data}/{error}: тело — {status, db}.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, private" };

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: "ok", db: "up" },
      { status: 200, headers: noStore },
    );
  } catch {
    // Не логируем детали ошибки: в них может быть строка подключения.
    return NextResponse.json(
      { status: "degraded", db: "down" },
      { status: 503, headers: noStore },
    );
  }
}
