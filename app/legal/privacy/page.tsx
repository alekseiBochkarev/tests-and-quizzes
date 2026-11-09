import type { Metadata } from "next";

import { Alert } from "@/components/ui/Alert";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Политика конфиденциальности
        </h1>
        <p className="text-base text-muted">Версия: {env.LEGAL_PRIVACY_VERSION}</p>
        <Alert variant="neutral" title="Черновик">
          Это черновик документа для Sprint 1. Юридическая редакция появится до открытой
          регистрации. Текст уже фиксирует версию, которая сохраняется при согласии.
        </Alert>
      </header>

      <section className="space-y-4 text-base leading-relaxed text-ink-soft">
        <h2 className="text-xl font-bold text-ink">1. Какие данные мы собираем</h2>
        <p>
          Адрес почты, хеш пароля (сам пароль мы не храним), дату согласий и технические данные
          запроса: IP-адрес и браузер — для защиты аккаунта и разбора инцидентов.
        </p>

        <h2 className="text-xl font-bold text-ink">2. Зачем</h2>
        <p>
          Чтобы вы могли войти, подтвердить почту, восстановить пароль и сохранять результаты
          тестов. Мы не звоним, не присылаем СМС и не продаём данные третьим лицам.
        </p>

        <h2 className="text-xl font-bold text-ink">3. Правовые основания</h2>
        <p>
          Обработка персональных данных выполняется с вашего согласия и для исполнения
          соглашения об использовании сайта — в соответствии с Федеральным законом № 152-ФЗ
          «О персональных данных».
        </p>

        <h2 className="text-xl font-bold text-ink">4. Сколько храним</h2>
        <p>
          Данные аккаунта — пока аккаунт существует. Одноразовые ссылки подтверждения и смены
          пароля — не дольше срока действия. Технические логи — ограниченное время и без паролей,
          токенов и полных адресов почты.
        </p>

        <h2 className="text-xl font-bold text-ink">5. Ваши права</h2>
        <p>
          Вы можете запросить сведения об обработке, исправление или удаление данных. Для этого
          напишите нам на адрес из раздела 6. Удаление аккаунта и полная анонимизация появятся в
          следующем обновлении.
        </p>
      </section>

      <section
        id="contact"
        className="scroll-mt-24 space-y-4 text-base leading-relaxed text-ink-soft"
      >
        <h2 className="text-xl font-bold text-ink">6. Как связаться</h2>
        <p>
          По вопросам обработки персональных данных и работы сайта напишите на{" "}
          <a
            className="underline underline-offset-4 hover:text-accent"
            href="mailto:support@example.com"
          >
            support@example.com
          </a>
          . Это тестовый адрес для Sprint 1; до открытой регистрации он будет заменён на рабочий.
        </p>
      </section>
    </article>
  );
}
