import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type AlertVariant = "neutral" | "success" | "error";

const variantClasses: Record<AlertVariant, string> = {
  neutral: "border-line-strong bg-surface text-ink",
  success: "border-success bg-success-soft text-ink",
  error: "border-danger bg-danger-soft text-ink",
};

const variantLabels: Record<AlertVariant, string> = {
  neutral: "Важно",
  success: "Готово",
  error: "Ошибка",
};

export function Alert({
  children,
  variant = "neutral",
  title,
  className,
}: {
  children: ReactNode;
  variant?: AlertVariant;
  title?: string;
  className?: string;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-control border-l-4 px-4 py-4 text-base leading-relaxed",
        variantClasses[variant],
        className,
      )}
    >
      <p className="font-bold">{title ?? variantLabels[variant]}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
