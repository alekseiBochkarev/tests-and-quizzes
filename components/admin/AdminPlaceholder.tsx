import type { ReactNode } from "react";

import { Alert } from "@/components/ui/Alert";

/** Единый вид раздела-заглушки: что будет здесь и какая задача это делает. */
export function AdminPlaceholder({
  title,
  nextStep,
  children,
}: {
  title: string;
  nextStep: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <Alert variant="neutral" title="Раздел в разработке">
        {children}
      </Alert>
      <p className="text-base text-ink-soft">{nextStep}</p>
    </section>
  );
}
