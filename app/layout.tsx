import type { Metadata, Viewport } from "next";
import { Golos_Text } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { TEXT_SIZE_COOKIE, parseTextSize } from "@/lib/textSize";

import "./globals.css";

const golos = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-golos",
});

export const metadata: Metadata = {
  title: {
    default: "Тесты — проверьте себя",
    template: "%s — Тесты",
  },
  description:
    "Короткие тесты по истории, кино, литературе и географии. Крупный текст, спокойный темп и понятные объяснения.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f5b5b",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const textSize = parseTextSize(cookieStore.get(TEXT_SIZE_COOKIE)?.value);

  return (
    <html lang="ru" data-text-size={textSize} className={golos.variable}>
      <body className="flex min-h-screen flex-col">
        <SkipLink />
        <SiteHeader textSize={textSize} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
