import type { Metadata } from "next";

import { Alert } from "@/components/ui/Alert";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Пользовательское соглашение",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Пользовательское соглашение
        </h1>
        <p className="text-base text-muted">Версия: {env.LEGAL_TERMS_VERSION}</p>
        <Alert variant="neutral" title="Черновик">
          Это черновик документа для Sprint 1. Юридическая редакция появится до открытой
          регистрации. Текст уже фиксирует версию, которая сохраняется при согласии.
        </Alert>
      </header>

      <section className="space-y-4 text-base leading-relaxed text-ink-soft">
        <h2 className="text-xl font-bold text-ink">1. Что такое «Тесты»</h2>
        <p>
          «Тесты» — сайт с короткими тестами для спокойной проверки знаний. Тесты не являются
          экзаменом, аттестацией или медицинской рекомендацией.
        </p>

        <h2 className="text-xl font-bold text-ink">2. Аккаунт</h2>
        <p>
          Для сохранения результатов нужен аккаунт с адресом почты и паролем. Пожалуйста,
          указывайте действующий адрес: на него приходит письмо для подтверждения и ссылки для
          восстановления пароля.
        </p>
        <p>
          Не передавайте пароль другим людям. Если вы заметили чужой вход, смените пароль и
          воспользуйтесь кнопкой «Выйти на всех устройствах».
        </p>

        <h2 className="text-xl font-bold text-ink">3. Результаты</h2>
        <p>
          Баллы и отметки «освоено» показывают, насколько уверенно вы отвечаете на вопросы. Это
          подсказка для повторения, а не оценка человека.
        </p>

        <h2 className="text-xl font-bold text-ink">4. Изменения</h2>
        <p>
          Мы можем обновлять тесты и текст соглашения. Новая версия документа получает новый
          номер; при существенных изменениях попросим согласие повторно.
        </p>
      </section>
    </article>
  );
}
