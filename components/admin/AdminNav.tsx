"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { visibleAdminNav } from "@/lib/admin/nav";
import { cn } from "@/lib/utils/cn";

/** Навигация по разделам админки. Активный пункт помечается для скринридера. */
export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = visibleAdminNav(role);

  return (
    <nav aria-label="Разделы админки" className="flex flex-wrap gap-3">
      {items.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-14 items-center rounded-control border-2 px-4 text-lg font-semibold transition-colors",
              active
                ? "border-accent bg-accent-soft text-ink"
                : "border-line-strong bg-surface text-ink hover:bg-accent-soft",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
