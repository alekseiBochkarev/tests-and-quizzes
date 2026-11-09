import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Сохранить результаты",
  description: "Создайте аккаунт, чтобы сохранять результаты тестов и видеть освоенные темы.",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Сохранить результаты</h1>
        <p className="text-lg text-ink-soft">
          Аккаунт нужен, чтобы возвращаться к тестам и видеть, что уже освоено. Достаточно почты
          и пароля — без телефона и звонков.
        </p>
      </div>

      <Card>
        <RegisterForm />
      </Card>
    </div>
  );
}
