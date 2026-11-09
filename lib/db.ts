import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Singleton PrismaClient через драйвер-адаптер pg.
 * Кэш в globalThis обязателен: в dev HMR перезагружает модули и без него
 * каждый раз создавался бы новый пул соединений.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    // Чтобы /api/health отвечал 503 быстро, а не висел при недоступной БД.
    connectionTimeoutMillis: 5_000,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
