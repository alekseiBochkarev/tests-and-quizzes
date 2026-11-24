import type { Metadata } from "next";
import Link from "next/link";

import { CookieSettingsButton } from "@/components/cookies/CookieSettingsButton";
import { Alert } from "@/components/ui/Alert";
import { COOKIE_CONSENT_MAX_AGE_DAYS } from "@/lib/cookies/consent";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Cookie-политика",
};

/**
 * Cookie-политика (ACC-03): категории, текущие cookie и отзыв согласия.
 * Кнопка настроек открывает общий баннер из layout через событие.
 */
export default function CookiesPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cookie-политика</h1>
        <p className="text-base text-muted">Версия: {env.LEGAL_COOKIES_VERSION}</p>
        <Alert variant="neutral" title="Черновик">
          Это черновик документа. Юридическая редакция появится до открытой регистрации.
          Версия политики сохраняется вместе с вашим выбором, поэтому при её изменении мы
          спросим согласие заново.
        </Alert>
      </header>

      <section className="space-y-4 text-base leading-relaxed text-ink-soft">
        <h2 className="text-xl font-bold text-ink">1. Что такое cookie</h2>
        <p>
          Cookie — небольшие файлы, которые сайт сохраняет в вашем браузере. Они помогают не
          вводить пароль при каждом переходе, помнить выбранный размер текста и понимать, какие
          разделы полезны. Мы не используем cookie, чтобы следить за вами на других сайтах.
        </p>

        <h2 className="text-xl font-bold text-ink">2. Категории cookie</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-base">
            <caption className="sr-only">Категории cookie и их назначение</caption>
            <thead>
              <tr className="border-b border-line-strong">
                <th scope="col" className="py-2 pr-4 font-bold text-ink">
                  Категория
                </th>
                <th scope="col" className="py-2 pr-4 font-bold text-ink">
                  Зачем
                </th>
                <th scope="col" className="py-2 font-bold text-ink">
                  Когда включается
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line align-top">
                <th scope="row" className="py-3 pr-4 font-semibold text-ink">
                  Необходимые
                </th>
                <td className="py-3 pr-4">
                  Вход в аккаунт, безопасность, выбранный размер текста и сам выбор настроек
                  cookie.
                </td>
                <td className="py-3">Всегда: без них сайт не работает.</td>
              </tr>
              <tr className="border-b border-line align-top">
                <th scope="row" className="py-3 pr-4 font-semibold text-ink">
                  Аналитика
                </th>
                <td className="py-3 pr-4">
                  Обезличенная статистика: какие тесты открывают, где возникают ошибки. Без
                  вашего имени и адреса почты.
                </td>
                <td className="py-3">Только после вашего согласия.</td>
              </tr>
              <tr className="align-top">
                <th scope="row" className="py-3 pr-4 font-semibold text-ink">
                  Реклама и партнёры
                </th>
                <td className="py-3 pr-4">
                  Персональные предложения и партнёрские материалы. Мы не продаём ваши данные.
                </td>
                <td className="py-3">Только после вашего согласия.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold text-ink">3. Какие cookie мы используем сейчас</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-ink">quiz_user_id</strong> — вход в аккаунт и защита
            сессии. Хранится {env.AUTH_SESSION_TTL_DAYS} дней, доступен только серверу.
          </li>
          <li>
            <strong className="text-ink">text_size</strong> — выбранный размер текста.
            Хранится 12 месяцев.
          </li>
          <li>
            <strong className="text-ink">quiz_cookie_consent</strong> — ваш выбор настроек
            cookie. Хранится {COOKIE_CONSENT_MAX_AGE_DAYS} дней.
          </li>
        </ul>
        <p>
          Аналитические и рекламные cookie сейчас не устанавливаются: этих сервисов на сайте
          пока нет. Когда появятся, они будут включаться только после вашего согласия.
        </p>

        <h2 className="text-xl font-bold text-ink">4. Как изменить или отозвать согласие</h2>
        <p>
          Нажмите кнопку — откроются текущие настройки. Можно выключить аналитику и рекламу,
          оставив только необходимые cookie. Отзыв согласия не мешает пользоваться сайтом.
        </p>
        <CookieSettingsButton />
        <p>
          Также можно удалить cookie в настройках браузера. После этого баннер появится снова, и
          мы спросим согласие заново. Инструкции есть в разделах «Помощь» у{" "}
          <a
            className="underline underline-offset-4 hover:text-accent"
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noreferrer"
          >
            Chrome
          </a>
          ,{" "}
          <a
            className="underline underline-offset-4 hover:text-accent"
            href="https://support.mozilla.org/ru/kb/udalenie-kukov-v-firefox"
            target="_blank"
            rel="noreferrer"
          >
            Firefox
          </a>{" "}
          и{" "}
          <a
            className="underline underline-offset-4 hover:text-accent"
            href="https://support.microsoft.com/ru-ru/microsoft-edge"
            target="_blank"
            rel="noreferrer"
          >
            Edge
          </a>
          .
        </p>
      </section>

      <section
        id="contact"
        className="scroll-mt-24 space-y-4 text-base leading-relaxed text-ink-soft"
      >
        <h2 className="text-xl font-bold text-ink">5. Как связаться</h2>
        <p>
          По вопросам cookie и обработки персональных данных напишите на{" "}
          <a
            className="underline underline-offset-4 hover:text-accent"
            href="mailto:support@example.com"
          >
            support@example.com
          </a>
          . Это тестовый адрес; до открытой регистрации он будет заменён на рабочий. Подробнее
          об обработке данных — в{" "}
          <Link
            href="/legal/privacy"
            className="font-semibold text-accent underline underline-offset-4"
          >
            Политике конфиденциальности
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
