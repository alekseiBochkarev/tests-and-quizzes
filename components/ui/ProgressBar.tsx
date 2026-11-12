import { cn } from "@/lib/utils/cn";

/**
 * Спокойная полоса прогресса с текстовой альтернативой для скринридеров.
 * Без анимации: для аудитории 55+ важнее предсказуемость.
 */
export function ProgressBar({
  value,
  label,
  className,
  tone = "accent",
}: {
  value: number;
  label: string;
  className?: string;
  tone?: "accent" | "success";
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-3 w-full overflow-hidden rounded-full bg-accent-soft"
      >
        <div
          className={cn("h-full rounded-full", tone === "success" ? "bg-success" : "bg-accent")}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-base text-muted">{label}</p>
    </div>
  );
}
