import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "quiet";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  name?: string;
  value?: string;
  form?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

const baseClasses =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-control px-6 py-3 text-center text-lg font-semibold leading-snug transition-colors";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border-2 border-accent bg-surface text-accent hover:bg-accent-soft",
  quiet: "bg-transparent px-3 text-accent underline underline-offset-4 hover:text-accent-hover",
};

export function buttonClassName({
  variant = "primary",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    baseClasses,
    variantClasses[variant],
    fullWidth && "w-full",
    variant === "quiet" && "min-h-12",
    "disabled:pointer-events-none disabled:opacity-50",
    className,
  );
}

/**
 * Кнопка ≥ 56 px по высоте. С `href` рендерится ссылкой с тем же внешним видом,
 * чтобы основное действие в интерфейсе всегда было крупным и однозначным.
 */
export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className,
  href,
  type = "button",
  disabled,
  name,
  value,
  form,
  onClick,
  ...aria
}: ButtonProps) {
  const classes = buttonClassName({ variant, fullWidth, className });

  if (href !== undefined) {
    return (
      <Link href={href} className={classes} aria-label={aria["aria-label"]}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      name={name}
      value={value}
      form={form}
      onClick={onClick}
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
    >
      {children}
    </button>
  );
}
