# Sprint 1 «Фундамент» — журнал решений и ограничений

**Статус:** реализация Sprint 1 завершена (ноябрь 2026), все локальные проверки зелёные. Приёмка ожидает прогона CI и ревью PR — отдельная ветка и PR пока не созданы, работа закоммичена в `master`.
**Ветка:** `master`.
**Связанная задача:** [`docs/tasks/01-foundation.md`](tasks/01-foundation.md).

Документ фиксирует решения, которые расходятся с утверждённым ТЗ или уточняют его. Сами `docs/01-analogies.md`, `docs/02-tz.md`, `docs/03-progress-model.md`, `docs/04-audience-55plus.md` не переписывались.

## 1. Что вошло в Sprint 1

- Каркас Next.js 16 App Router + React 19 + TypeScript strict + Tailwind CSS 4.
- PostgreSQL 16 в Docker, Prisma 7 с `@prisma/adapter-pg`, первая миграция auth-контура (`User`, `AuthIdentity`, `EmailToken`, `Consent`).
- Auth-роуты `/api/v1/auth/*`: register, login, logout, logout-all, verify-email, resend-verification, forgot-password, reset-password, change-password (P1), me.
- Страницы `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/account`, `/legal/terms`, `/legal/privacy`, `/tests`.
- Dev-почтовый ящик: `logs/dev-mail.log` + `/_dev/mailbox` через rewrite.
- UI-оболочка 45+/55+: три шага размера текста, кнопки ≥ 56 px, skip-link, видимый фокус, отсутствие burger-меню.
- Unit-тесты (Vitest 3), e2e (Playwright + axe), GitHub Actions.

## 2. Ключевые инженерные решения

| Решение | Где | Почему |
|---|---|---|
| API под `/api/v1/auth/*` | `app/api/v1/auth/**` | Версионирование по §8.2 ТЗ; отличается от референса `autocard-pro`. |
| Cookie `quiz_user_id` = `<userId>:<sessionEpoch>.<hmac>` | `lib/auth/session.ts` | Подпись HMAC-SHA256 защищает от подмены userId/epoch; актуальность epoch сверяется с БД в `currentUser.ts`. |
| `AUTH_SECRET` обязателен, ≥ 32 символов | `lib/env.ts` | Приложение падает на старте, а не на первом запросе. |
| Регистрация не создаёт сессию | `app/api/v1/auth/register/route.ts` | Подтверждение email обязательно; авто-вход включается флагом `AUTH_LOGIN_AFTER_VERIFY` (см. C1). |
| Verify-email: GET показывает кнопку, POST подтверждает | `app/verify-email/page.tsx`, `app/api/v1/auth/verify-email/route.ts` | Почтовый prefetch не сжигает одноразовый токен. Форма работает без JS. |
| Одинаковый ответ register для занятого email | `register/route.ts` | Защита от перечисления пользователей (AC-AUTH-02). |
| `login`: rate-limit → scrypt → блокировка → verified | `app/api/v1/auth/login/route.ts` | `DUMMY_HASH` выравнивает время; состояние аккаунта раскрывается только после верного пароля (AC-AUTH-11…13). |
| Активная блокировка входа не продлевается | `lib/auth/loginState.ts` | Чистая функция `nextFailedLoginState`: при активной блокировке 401 без записи; истёкшая блокировка сбрасывает старый счётчик, чтобы одна опечатка не запирала снова (AC-AUTH-13). |
| `TRUST_PROXY` — явный флаг доверия заголовкам прокси | `lib/auth/rateLimit.ts`, `lib/env.ts` | `X-Forwarded-For` / `X-Real-IP` подделываются; в production доверие не включается автоматически. Без флага IP-бакеты не действуют. |
| `readForm` с лимитом 32 КБ и ответом 413 | `lib/auth/api.ts` | Форма verify-email защищена от раздутого тела так же, как JSON-роуты. |
| MARKETING-согласие пишется всегда | `lib/auth/consent.ts` | Opt-in и opt-out фиксируются с версией политики — аудит и 152-ФЗ. |
| In-memory rate-limit по operation:email / operation:ip | `lib/auth/rateLimit.ts` | Достаточно для одного инстанса; при масштабировании — Redis. |
| `assertSameOrigin` для всех state-changing роутов | `lib/http/origin.ts`, `lib/auth/api.ts` | SameSite=Lax + проверка Origin/Sec-Fetch-Site/Referer (AC-SEC-01). |
| `safeNext` пропускает только внутренний путь | `lib/http/redirect.ts` | Отсекает `//evil.com`, `https://evil.com`, `/\evil.com`, `javascript:` и кодированные обходы. |
| `APP_ENV` вместо `NODE_ENV` для dev-режима | `lib/env.ts` | `next build/start` всегда выставляют `NODE_ENV=production`; иначе локальный `start` и CI ломались бы (C22). |
| Письма в dev только в `logs/dev-mail.log` | `lib/auth/mail.ts` | Локальный почтовый ящик, а не лог приложения; файл gitignored, при `APP_ENV=production` запись запрещена (C8). |
| `User.timezone` — единственный источник часового пояса | `prisma/schema.prisma` | В Sprint 1 поле есть, логика серий появится в Sprint 4 (C3). |
| Размер текста применяется на сервере | `app/layout.tsx`, `components/ui/TextSizeSwitch.tsx` | Cookie `text_size` читается в layout, поэтому нет вспышки другого размера. |
| Только PostgreSQL, без SQLite | `docker-compose.yml`, Prisma | Одна СУБД во всех окружениях, меньше расхождений (C11). |
| Прогресс и игровые модели не создаются | `prisma/schema.prisma` | Границы Sprint 1; таблицы появятся отдельными миграциями. |
| Название продукта — «Тесты» | `app/layout.tsx`, `components/layout/SiteHeader.tsx` | Рабочее имя «Тесты и квизы» остаётся только для папки проекта и внутренних документов. В UI — «Тесты», слово «квиз» не используется (AC-UI-07). Полноценный бренд и домен — отдельное решение позже. |

## 3. Расхождения с ТЗ (Приложение A)

| ID | Суть | Как решено в Sprint 1 | Статус |
|---|---|---|---|
| C1 | ТЗ требует авто-вход после регистрации, но подтверждение email обязательно | Регистрация сессию не создаёт; после verify — `/login?verified=1` без email в URL. Авто-вход — `AUTH_LOGIN_AFTER_VERIFY=true`. | Требует подтверждения владельца (Q1) |
| C2 | Путь `/api/v1/auth/*` против `/api/auth/*` в референсе | Используем `/api/v1/auth/*`. | Решено |
| C3 | `timezone` в `UserStats` и `User` | Источник истины — `User.timezone`; в `UserStats` поля нет (таблица появится в Sprint 4). | Решено |
| C4 | `QuestionProgress.streak` против `correctStreak` + `attemptsWithCorrect` | Приняты `correctStreak` и `attemptsWithCorrect`; поля появятся в Sprint 4. | Решено |
| C5 | Индексы `Attempt` по `createdAt` | Добавлен обязательный `startedAt`, индексы по нему; появится в Sprint 3. | Решено |
| C6 | Роли не описаны | Введены `USER`, `EDITOR`, `ADMIN`; админки в Sprint 1 нет. | Решено |
| C7 | Перечень и версии согласий не зафиксированы | `TERMS`, `PRIVACY`, `MARKETING`; версии из `LEGAL_TERMS_VERSION` / `LEGAL_PRIVACY_VERSION`; сейчас `*-draft`. | Требует подтверждения (Q3) |
| C8 | «Письмо в лог» может нарушать запрет на логирование ПДн | Полное письмо пишется только в gitignored `logs/dev-mail.log` и показывается на `/_dev/mailbox` при `APP_ENV != production`; паролей и хешей там нет. | Решено |
| C9 | TTL токенов не заданы | verify — 24 ч, reset — 1 ч; константы в env. | Допущение |
| C10 | «Квиз» в названии проекта/документах | В UI — только «тест»; «квиз» остаётся в названии проекта и внутренних документах. | Решено |
| C11 | «SQLite — только локально» | SQLite не используется: PostgreSQL 16 везде. | Решено |
| C12 | Два варианта гостевого режима | Задел `User.isGuest`; cookie/merge — Sprint 2–3. | Решено |
| C13 | «Запомнить меня» не описано | Чекбокса нет; сессия всегда 30 дней по умолчанию. | Решено |
| C14 | Смена пароля/email — Must, экран настроек позже | `change-password` реализован (P1); смена email и удаление — Sprint 2. | Требует подтверждения (Q4, Q7) |
| C15 | Четыре шрифта без выбора | Golos Text через `next/font/google` при сборке. Self-host fallback (woff2) не реализован; при недоступности Google Fonts используется системный стек из `globals.css`. | Решено с ограничением |
| C16 | Формат ошибок может отличаться в референсе | Используется конверт ТЗ: `{ error: { code, message, details? }, requestId }`. | Решено |
| C17 | `quiz_user_id` против `autocard_user_id` | `quiz_user_id` + HMAC-подпись. | Решено |
| C18 | Prisma 7 + PostgreSQL adapter | `@prisma/adapter-pg`, `pg`, `prisma.config.ts`; синтаксис проверен по документации Prisma 7. | Проверено на практике |
| C19 | Блокировка и rate-limit — одна механика или две | Реализованы обе: `failedLoginCount`/`lockedUntil` в `User` + in-memory бакеты. | Решено |
| C20 | Оферта упоминается вместе с юридическими документами | Для MVP без платежей достаточно «Пользовательского соглашения» и «Политики конфиденциальности». | Решено |
| C21 | `/auth/*` и `/profile` против `/login`, `/register`, `/account` | Приняты короткие пути `/login`, `/register`, `/account`; `/profile` не используется. | Решено |
| C22 | `NODE_ENV` не подходит для dev-фолбэка | Введён `APP_ENV` (`local`/`test`/`production`); `MAIL_TRANSPORT=log` запрещён только при `production`. | Решено |
| C23 | Требуются CSP и HSTS | Базовая CSP с `'unsafe-inline'` для RSC-гидратации, `X-Frame-Options`, HSTS только при `APP_ENV=production`; ужесточение CSP — после стабилизации. | Решено |

## 4. Тестовая БД и изоляция

- `DATABASE_URL_TEST` указывает на отдельную базу `quiz_test` (локально — порт 5433, как и dev-БД).
- `docker/init/01-create-quiz-test.sql` создаёт `quiz_test` при первой инициализации пустого тома.
- Для существующего тома: `npm run db:test:up` (создаёт базу через `pg`, без `docker exec`), `npm run db:test:deploy`, `npm run db:test:reset`.
- `db:test:reset` отказывается работать, если `DATABASE_URL_TEST` указывает на `quiz` — dev-БД защищена от случайной очистки.
- E2E работают с `APP_ENV=test`, `MAIL_TRANSPORT=log`; email генерируются уникальными, поэтому повторные прогоны не конфликтуют.
- `TRUST_PROXY` по умолчанию `false`; e2e и CI не полагаются на заголовки прокси. Включать только за доверенным прокси.
- CI использует сервис `postgres:16` с базой `quiz_test`; отдельный Docker в job не нужен.

## 5. Отложенные пункты

| Пункт | Куда перенесено |
|---|---|
| Каталог, темы, выпуски, вопросы, плеер, результат | Sprint 2–3 |
| `QuestionProgress`, `TopicProgress`, `UserStats`, баллы, освоение, уровни, серии | Sprint 4 |
| Гостевой режим и merge прогресса (`AUTH-7`, `AUTH-8`) | Sprint 2–3 |
| Удаление аккаунта (`AUTH-6`) и смена email (`AUTH-5`) | Sprint 2 |
| Админка, импорт JSON из `forms_writer` | Sprint 2 |
| Реальный SMTP, SPF/DKIM/DMARC, доставляемость | Sprint 5–6 |
| OAuth (VK/ОК/Яндекс/Telegram), вход по коду/телефону | v1.1 |
| Sentry, Метрика/GA4, consent-gated аналитика | Sprint 5 |
| S3/Object Storage, изображения | Sprint 2–3 |
| Integration-тесты auth-роутов на реальной БД | P1, Sprint 2 (обязательный минимум Sprint 1 — unit + e2e + ручные сценарии) |
| Progressive enhancement остальных форм (без JS) | Sprint 2; в Sprint 1 без JS работают чтение страниц, навигация и verify-email |

`change-password` (P1) реализован, поэтому в отложенные пункты не попал.

## 6. Известные ограничения и риски

| Ограничение | Влияние | Что делать |
|---|---|---|
| In-memory rate-limit | Не работает при нескольких инстансах; сбрасывается при рестарте | Redis при горизонтальном масштабировании; до 10k DAU принято как достаточное |
| SMTP-транспорт не проверен реальной отправкой | Письма в Mail.ru/Яндекс/Rambler могут не доходить | Настроить ESP, SPF/DKIM/DMARC перед бетой |
| Локальная dev-БД на порту 5433 | README и `.env.example` по умолчанию содержат 5432 | В `.env` выставить `DB_PORT=5433` и порт в `DATABASE_URL` / `DATABASE_URL_TEST` |
| Playwright `reuseExistingServer` локально | Если запущен `npm run dev`, e2e пойдут в dev-БД | Остановить dev-сервер перед `npm run test:e2e` |
| Формы, кроме verify-email, требуют JS | Без JS нельзя войти/зарегистрироваться | Progressive enhancement — Sprint 2 (зафиксировано в AC-UI-10) |
| CSP содержит `script-src 'unsafe-inline'` | Ослабляет защиту от XSS | Перейти на nonce после стабилизации inline RSC-payload Next.js |
| Dev-mailbox содержит email и токен | Это осознанное исключение из правила «ПДн не логируются» | Только `APP_ENV != production`, файл gitignored, в production страница 404 и `log`-транспорт запрещён |
| Срок жизни cookie сессии задаётся `Max-Age`, а не полем внутри подписи | Unit-тесты проверяют формат/подпись/epoch; истечение проверяется браузером | При необходимости добавить `issuedAt` в payload отдельной задачей |
| TTL и даты считаются в UTC | Локальные даты появятся с прогрессом (Sprint 4) | `User.timezone` уже хранится |
| Нет rate-limit на `verify-email` | Токен одноразовый и длинный; перебор не practical | Добавить при появлении публичного API-нагрузки |
| `TRUST_PROXY` не включён в production | IP-бакеты rate-limit не работают, остаётся лимит по email | На доверенном прокси выставить `TRUST_PROXY=true` и проверить в приёмочном окружении |
| Шрифт загружается из Google Fonts при сборке | Self-host woff2 нет; при недоступности Google работает системный fallback из CSS | Добавить локальный woff2 отдельной задачей, если нужна автономность |
| Интеграционных тестов auth-роутов на реальной БД нет | Unit и e2e покрывают логику и HTTP-сценарии, но не handler'ы с БД напрямую | P1, Sprint 2; в отчётах и документах не заявлять как выполненные |

## 7. Покрытие проверками

| Область | Unit | E2E | Ручная |
|---|---|---|---|
| scrypt: формат, соль, неверный пароль, повреждённый хеш | ✅ `tests/unit/auth/password.test.ts` | — | — |
| Токены: уникальность, sha256, TTL, одноразовость, типы | ✅ `tests/unit/auth/tokens.test.ts` | verify в полном сценарии | — |
| Сессия: формат, подпись, подделка, смена epoch | ✅ `tests/unit/auth/session.test.ts` | вход/выход/guard | — |
| Rate-limit: лимит, окно, раздельные бакеты, clientIp/TRUST_PROXY | ✅ `tests/unit/auth/rateLimit.test.ts` | — | блокировка после 5 неудач |
| Блокировка входа: активная, истёкшая, порог | ✅ `tests/unit/auth/loginState.test.ts` | ✅ `auth-login-errors.spec.ts` (5 неудач → 401/423) | AC-AUTH-13 |
| Чтение формы: лимит 32 КБ и 413 | ✅ `tests/unit/auth/api.test.ts` | — | — |
| Согласия: TERMS/PRIVACY и MARKETING opt-in/opt-out | ✅ `tests/unit/auth/consent.test.ts` | — | — |
| Политика пароля: длина, пробелы по краям, стоп-лист | ✅ `tests/unit/auth/passwordPolicy.test.ts` | — | — |
| CSRF/Origin | ✅ `tests/unit/http/origin.test.ts` | — | — |
| `safeNext` | ✅ `tests/unit/http/redirect.test.ts` | редирект на `/login?next=/account` | — |
| Валидация env | ✅ `tests/unit/env.test.ts` | — | — |
| Регистрация → mailbox → verify → вход → `/account` | — | ✅ `auth-register-login.spec.ts` | ✅ |
| Одинаковое сообщение об ошибке входа | — | ✅ `auth-login-errors.spec.ts` | ✅ |
| Защита `/account`, выход, logout-all | — | ✅ `auth-guard.spec.ts` | ✅ |
| Размер текста и axe critical/serious | — | ✅ `ui-text-size-accessibility.spec.ts` | ✅ |

## 8. Открытые вопросы к владельцу продукта

| ID | Вопрос | Текущее поведение |
|---|---|---|
| Q1 | Обязательное подтверждение email и авто-вход после verify | Подтверждение обязательно, авто-вход выключен (`AUTH_LOGIN_AFTER_VERIFY=false`) |
| Q2 | Текст кнопки регистрации | «Сохранить результаты» |
| Q3 | Готовность версий юридических документов | Заглушки `*-draft` |
| Q4 | Нужен ли `change-password` в Sprint 1 | Реализован (P1) |
| Q5 | `MAIL_FROM` до появления домена | `Тесты и квизы <no-reply@localhost>` |
| Q7 | Удаление аккаунта | Перенесено в Sprint 2 |
| Q9 | Хостинг и домен (влияет на `Secure` cookie и `APP_URL`) | Не выбрано; локально `http://localhost:3000` |

## 9. Проверки Sprint 1

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run db:test:up
npm run db:test:deploy
npm run test:e2e
```

E2E рекомендуется прогонять дважды подряд без ретраев, чтобы поймать зависимость от состояния тестовой БД.

**Статус приёмки:** локальные проверки выполнены в рамках исправлений ревью; результаты CI и e2e считаются подтверждёнными только после зелёного прогона в PR. До этого Sprint 1 не считается принятым.
