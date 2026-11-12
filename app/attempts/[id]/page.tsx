import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AttemptPlayer } from "@/components/attempts/AttemptPlayer";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getAttemptState } from "@/lib/attempts/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Тренировка",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AttemptPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    const { id } = await params;
    redirect(`/login?next=${encodeURIComponent(`/attempts/${id}`)}`);
  }

  const { id } = await params;
  const attempt = await getAttemptState(id, user.id);
  if (!attempt) notFound();

  if (attempt.status === "COMPLETED" || attempt.status === "ABANDONED") {
    redirect(`/attempts/${id}/result`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <AttemptPlayer attempt={attempt} />
    </div>
  );
}
