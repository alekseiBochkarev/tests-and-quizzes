import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // В каталоге пользователя выше есть посторонний package-lock.json;
  // фиксируем корень Turbopack, чтобы сборка не предупреждала о нём.
  // Не создаём автоматически AGENTS.md/CLAUDE.md: служебные файлы
  // инструментов не являются частью продукта.
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      // Next.js не роутит папки с префиксом "_" (private folders), поэтому
      // реальный роут живёт в app/dev/mailbox, а публичный URL — /_dev/mailbox.
      // Страница сама отдаёт 404 при APP_ENV=production.
      { source: "/_dev/mailbox", destination: "/dev/mailbox" },
    ];
  },
};

export default nextConfig;
