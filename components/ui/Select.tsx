import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Выпадающий список того же размера, что и поле ввода: удобно для 55+. */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "min-h-14 w-full rounded-control border-2 border-line-strong bg-surface px-4 py-3 text-lg text-ink",
        "focus-visible:border-accent disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
