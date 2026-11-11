# Тесты и квизы — новый проект

Сайт коротких тематических тестов для аудитории 45+/55+. В репозитории — продуктовые документы и рабочая основа Sprint 1: каркас Next.js, авторизация по email, защищённая страница «Мои результаты», dev-почтовый ящик и сквозные тесты.

## Документы

| Файл                                                       | Что внутри                                                                                                                                                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/01-analogies.md`](docs/01-analogies.md)             | Аналогии и конкурентный анализ: Duolingo, Kahoot!, Quizizz, Quizlet, Trivia Crack, Sporcle, Stepik, Учи.ру, Telegram-квизы и др. Что берём, что не берём. |
| [`docs/02-tz.md`](docs/02-tz.md)                           | Верхнеуровневое ТЗ: цели, аудитория, границы MVP, функциональные требования, контент-модель, архитектура, данные, API, NFR, этапы, риски.                 |
| [`docs/03-progress-model.md`](docs/03-progress-model.md)   | Детальная модель прогресса: освоение по вопросам, прогресс по темам, баллы/уровень знатока/серия дней, дипломы, формулы, экраны статистики, edge cases.   |
| [`docs/04-audience-55plus.md`](docs/04-audience-55plus.md) | Поправка на реальную аудиторию: 74% старше 45, ядро 55+. UX, тексты, контент, авторизация, каналы, метрики.                                               |
| [`docs/sprint-1-notes.md`](docs/sprint-1-notes.md)         | Журнал решений Sprint 1: расхождения с ТЗ, отложенные пункты, известные ограничения.                                                                      |

## Кратко о продукте

**Аудитория:** по статистике тестов в Дзене ~74% зрителей старше 45 лет, ядро — 55+. Поэтому продукт проектируется в первую очередь под взрослую аудиторию: крупный текст, спокойный темп, уважительный тон, без таймера и без молодёжного сленга.

Сайт коротких тематических тестов (10–12 вопросов), в котором:

- можно пройти тест без регистрации, а прогресс сохранить после входа;
- прогресс ведётся не только по тестам, но и **по темам и отдельным вопросам**;
- есть «тест дня», баллы, уровень знатока, серия дней, награды, дипломы и наглядная статистика;
- контент приходит из уже существующего конвейера `forms_writer` (LLM + факт-чек + ревью + дедуп);
- авторизация переиспользует проверенный подход `autocard-pro` (email + scrypt + httpOnly-cookie + подтверждение email + rate-limit).

## Ключевое продуктовое решение

**Не выбирать между «отдельными тестами» и «бесконечным банком вопросов».** Используем гибрид:

1. **Выпуск (тест)** — 10–12 вопросов, знакомый формат, которым удобно делиться.
2. **Банк вопросов темы** — вопросы живут отдельно и переиспользуются.
3. **Прогресс** — по вопросу (освоение 0–5) → по теме (изученность/точность/уровень) → глобальный (баллы/уровень знатока/серия дней).

Так пользователь получает понятный короткий тест, а сервис — глубину и причину возвращаться.

## Статус

**Sprint 1 «Фундамент»: реализация завершена (ноябрь 2026), CI на `master` прошёл успешно.** Локальные проверки — lint, typecheck, unit, build и e2e — зелёные. Осталось пройти ручной чек-лист §10.3 из задачи; отдельный PR не создавался, работа ведётся в `master`.

Что уже работает:

- регистрация с двумя согласиями → письмо в dev-почтовый ящик → подтверждение почты → вход → `/account` → выход;
- вход/выход, «выйти на всех устройствах», сброс пароля, повторная отправка подтверждения;
- cookie `quiz_user_id` (`<userId>:<sessionEpoch>` + HMAC), rate-limit по email/IP, блокировка после неудачных попыток, CSRF-проверка Origin;
- `/account` защищён и отдаёт заглушку «Мои результаты» с `Cache-Control: no-store, private`;
- интерфейс под 45+/55+: три шага размера текста (18/20/22 px), кнопки ≥ 56 px, skip-link, видимый фокус, legal-страницы;
- dev-mailbox `/_dev/mailbox` (только при `APP_ENV != production`), `/api/health`, security-заголовки в `proxy.ts`;
- unit-тесты `lib/auth/*` и `lib/http/*`, Playwright e2e и axe, workflow GitHub Actions (CI на `master` — зелёный).

Что дальше (Sprint 2): каталог тем и выпусков, импорт контента из `forms_writer`, админка, гостевой режим, удаление аккаунта и смена email.

## Быстрый старт (≤ 10 минут)

Требования: Node.js 24 LTS, npm 11+, Docker Desktop.

```powershell
# 0. Клонирование (если репозиторий ещё не склонирован)
git clone <url> "Тесты и квизы"
cd "Тесты и квизы"

# 1. Зависимости
npm ci

# 2. Конфигурация: скопируйте шаблон и заполните AUTH_SECRET
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#    вставьте значение в AUTH_SECRET=.env

# 3. PostgreSQL в Docker (том и healthcheck уже настроены)
npm run db:up

# 4. Миграции auth-контура
npm run db:deploy

# 5. Запуск
npm run dev
```

Откройте `http://localhost:3000`. Если порт 5432 занят, задайте `DB_PORT=5433` в `.env` и поправьте порт в `DATABASE_URL` (в репозитории разработчика используется 5433).

Письма в dev-режиме не отправляются наружу: они пишутся в `logs/dev-mail.log` и доступны на `http://localhost:3000/_dev/mailbox`.

## Переменные окружения

Все переменные валидируются Zod в `lib/env.ts` при старте; при отсутствии `DATABASE_URL` или `AUTH_SECRET` приложение падает с понятным сообщением.

| Переменная                                                                | Обязательна | Назначение                                                                                                                                                  |
| ------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                                                                 | нет         | `local` / `test` / `production`. Не путать с `NODE_ENV`: `next build/start` всегда выставляют `production`. При `production` запрещён `MAIL_TRANSPORT=log`. |
| `DATABASE_URL`                                                            | да          | Строка подключения PostgreSQL, например `postgresql://quiz:quiz@localhost:5432/quiz?schema=public`.                                                         |
| `DATABASE_URL_TEST`                                                       | для e2e     | Отдельная БД `quiz_test`; `npm run db:test:*` и Playwright используют её, dev-БД не трогают.                                                                |
| `AUTH_SECRET`                                                             | да          | Секрет HMAC для cookie сессии, ≥ 32 символов. Генерация: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.                     |
| `APP_URL`                                                                 | да          | Публичный origin приложения; от него считается CSRF-проверка и ссылки в письмах.                                                                            |
| `DB_PORT`                                                                 | нет         | Хост-порт PostgreSQL в `docker-compose.yml` (по умолчанию 5432).                                                                                            |
| `AUTH_SESSION_TTL_DAYS`                                                   | нет         | Срок cookie сессии, по умолчанию 30 дней.                                                                                                                   |
| `AUTH_VERIFY_TOKEN_TTL_HOURS`                                             | нет         | Срок ссылки подтверждения почты, по умолчанию 24 ч.                                                                                                         |
| `AUTH_RESET_TOKEN_TTL_HOURS`                                              | нет         | Срок ссылки сброса пароля, по умолчанию 1 ч.                                                                                                                |
| `AUTH_MAX_FAILED_ATTEMPTS` / `AUTH_LOCKOUT_MINUTES`                       | нет         | Блокировка после 5 неудач на 15 минут.                                                                                                                      |
| `AUTH_LOGIN_AFTER_VERIFY`                                                 | нет         | `false` по умолчанию: после подтверждения почты сессия не создаётся, пользователь идёт на `/login?verified=1`. `true` — авто-вход.                          |
| `TRUST_PROXY`                                                             | нет         | `false` по умолчанию. `true` — доверять `X-Forwarded-For` / `X-Real-IP`; включайте только за доверенным прокси. Без флага IP-бакеты rate-limit не работают. |
| `AUTH_RL_*`                                                               | нет         | Лимиты register/login/resend/forgot/reset/change-password по email, IP и пользователю (см. `.env.example`).                                                 |
| `LEGAL_TERMS_VERSION` / `LEGAL_PRIVACY_VERSION`                           | нет         | Версии документов, которые фиксируются в согласиях. До юридической готовности — `*-draft`.                                                                  |
| `MAIL_TRANSPORT`                                                          | нет         | `log` — письма в `logs/dev-mail.log` и `/_dev/mailbox`; `smtp` — реальная отправка. `log` запрещён при `APP_ENV=production`.                                |
| `MAIL_FROM`                                                               | нет         | Имя и адрес отправителя.                                                                                                                                    |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` | для smtp    | Интерфейс готов, реальная доставка проверяется перед бетой.                                                                                                 |

## Команды

| Команда                                    | Что делает                                                     |
| ------------------------------------------ | -------------------------------------------------------------- |
| `npm run dev`                              | Dev-сервер на `http://localhost:3000`.                         |
| `npm run build` / `npm run start`          | Прод-сборка и запуск.                                          |
| `npm run lint` / `npm run typecheck`       | ESLint 9 и `tsc --noEmit` (strict).                            |
| `npm test` / `npm run test:watch`          | Unit-тесты Vitest.                                             |
| `npm run test:e2e`                         | Playwright: chromium, сам поднимает сервер.                    |
| `npm run db:up` / `npm run db:down`        | PostgreSQL в Docker.                                           |
| `npm run db:generate`                      | Генерация Prisma Client в `lib/generated/prisma` (gitignored). |
| `npm run db:migrate` / `npm run db:deploy` | Миграции Prisma для dev-БД.                                    |
| `npm run db:test:up`                       | Создать `quiz_test`, если её нет.                              |
| `npm run db:test:deploy`                   | Применить миграции к `quiz_test`.                              |
| `npm run db:test:reset`                    | Очистить и заново мигрировать **только** `quiz_test`.          |
| `npm run db:studio`                        | Prisma Studio.                                                 |
| `npm run format` / `npm run format:check`  | Prettier.                                                      |

### E2E локально

```powershell
npm run db:test:up
npm run db:test:deploy
npm run test:e2e
```

Перед e2e остановите `npm run dev`: Playwright переиспользует уже запущенный сервер (`reuseExistingServer`), а он может смотреть в dev-БД. В CI сервер поднимается командой `npm run start` с `APP_ENV=test`.

## Структура

```
app/                 # App Router: страницы, auth-роуты, /api/health, dev/mailbox
components/          # layout, ui-кит под 55+, формы авторизации
lib/auth/            # scrypt, токены, сессия, rate-limit, письма, currentUser
lib/http/            # json-конверт, Origin/CSRF, safeNext, requestId
lib/env.ts           # Zod-валидация окружения
prisma/              # schema.prisma и миграции (auth-контур)
tests/unit/          # Vitest: lib/auth/*, lib/http/*, env
tests/e2e/           # Playwright: auth, guard, размер текста, axe
scripts/db-test.mjs  # управление quiz_test
docker/init/         # создание quiz_test при первом старте контейнера
proxy.ts             # security-заголовки, CSP, HSTS в production
```

## Границы Sprint 1

**Входит:** каркас Next.js 16 + Tailwind 4, PostgreSQL 16 + Prisma 7, auth-контур (регистрация, подтверждение email, вход/выход, сброс пароля, `change-password`), защищённый `/account`, dev-почта, UI-оболочка под 45+/55+, unit/e2e/CI, legal-заглушки.

**Не входит:** каталог тестов, вопросы и плеер, прогресс и баллы, гостевой режим и merge прогресса, админка и импорт контента, удаление аккаунта и смена email, OAuth, реальный SMTP, платежи, публичные рейтинги, аналитика. Подробности — в [`docs/sprint-1-notes.md`](docs/sprint-1-notes.md).

## Тесты и CI

- **Unit (Vitest 3):** пароли, токены, сессионная cookie, rate-limit, Origin/CSRF, `safeNext`, валидация env.
- **E2E (Playwright 1.65):** регистрация → dev-mailbox → verify → вход → `/account`, ошибки входа, защита `/account` и выход, размер текста, axe на `/`, `/login`, `/register` без critical/serious.
- **CI (`.github/workflows/ci.yml`):** `npm ci` → `db:generate` → lint → typecheck → unit → `db:deploy` → build → e2e на сервисе `postgres:16` с БД `quiz_test`. Секреты не требуются.

**Статус приёмки:** CI на `master` прошёл успешно (10.11.2026): lint, typecheck, unit, migrate, build и e2e. Осталось пройти ручной чек-лист §10.3 из задачи; отдельный PR не создавался.

## Фактические версии

| Пакет                                              | Версия          |
| -------------------------------------------------- | --------------- |
| `next`                                             | 16.3.6          |
| `react` / `react-dom`                              | 19.2.4          |
| `@prisma/client` / `prisma` / `@prisma/adapter-pg` | 7.10.1          |
| `pg`                                               | 8.23.1          |
| `zod`                                              | 4.6.7           |
| `nodemailer`                                       | 7.0.13          |
| `tailwindcss` / `@tailwindcss/postcss`             | 4.3.5           |
| `typescript`                                       | 5.9.3           |
| `eslint` / `eslint-config-next`                    | 9.39.5 / 16.3.6 |
| `vitest`                                           | 3.2.7           |
| `@playwright/test`                                 | 1.65.0          |
| `@axe-core/playwright`                             | 4.14.0          |
| `prettier`                                         | 3.9.10          |

## Журнал решений

Все расхождения с ТЗ, принятые решения и отложенные пункты зафиксированы в [`docs/sprint-1-notes.md`](docs/sprint-1-notes.md), чтобы не переписывать утверждённые документы.
