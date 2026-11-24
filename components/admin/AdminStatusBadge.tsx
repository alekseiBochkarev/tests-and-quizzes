import { contentStatusLabel } from "@/lib/admin/contentLabels";
import { cn } from "@/lib/utils/cn";

const statusClasses: Record<string, string> = {
  PUBLISHED: "border-success bg-success-soft text-ink",
  DRAFT: "border-line-strong bg-paper text-ink",
  ARCHIVED: "border-line-strong bg-paper text-muted",
};

/** Статус контента: цвет и подпись, а не только цвет — важно для 55+. */
export function AdminStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control border px-3 py-1 text-base font-semibold",
        statusClasses[status] ?? statusClasses.DRAFT,
        className,
      )}
    >
      {contentStatusLabel(status)}
    </span>
  );
}
