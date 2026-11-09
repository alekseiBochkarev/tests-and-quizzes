import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Забыли пароль",
  description: "Отправим ссылку для смены пароля на вашу почту.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Забыли пароль?</h1>
        <p className="text-lg text-ink-soft">
          Укажите почту, на которую регистрировались. Мы отправим ссылку для смены пароля.
        </p>
      </div>

      <Card>
        <ForgotPasswordForm />
      </Card>

      <p className="text-base text-ink-soft">
        Вспомнили пароль?{" "}
        <Link href="/login" className="font-semibold text-accent underline">
          Вернуться ко входу
        </Link>
      </p>
    </div>
  );
}
