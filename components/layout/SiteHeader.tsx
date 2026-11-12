import Link from "next/link";

import { TextSizeSwitch } from "@/components/ui/TextSizeSwitch";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/currentUser";
import type { TextSize } from "@/lib/textSize";

const navLinkClasses =
  "inline-flex min-h-12 items-center rounded-control px-2 text-lg font-semibold text-ink hover:text-accent hover:underline";

export async function SiteHeader({ textSize }: { textSize: TextSize }) {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center text-2xl font-bold tracking-tight text-accent"
        >
          Тесты
        </Link>

        <nav aria-label="Основная навигация" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/tests" className={navLinkClasses}>
            Тесты
          </Link>
          {user ? (
            <Link href="/interests" className={navLinkClasses}>
              Интересы
            </Link>
          ) : null}
          <Link href="/account" className={navLinkClasses}>
            Мои результаты
          </Link>
          <TextSizeSwitch current={textSize} />

          {user ? (
            <form action="/api/v1/auth/logout" method="post">
              <Button type="submit" variant="secondary" className="px-4">
                Выйти
              </Button>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-control border-2 border-accent px-4 text-lg font-semibold text-accent hover:bg-accent-soft"
            >
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
