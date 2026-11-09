import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)] sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
