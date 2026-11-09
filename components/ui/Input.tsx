import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "min-h-14 w-full rounded-control border-2 border-line-strong bg-surface px-4 py-3 text-lg text-ink",
        "placeholder:text-muted focus-visible:border-accent disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
