import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
