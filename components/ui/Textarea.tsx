import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-control border-2 border-line-strong bg-surface px-4 py-3 text-lg text-ink",
        "placeholder:text-muted focus-visible:border-accent disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
