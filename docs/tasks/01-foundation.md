# SPRINT-1-FOUNDATION — Sprint 1. Фундамент

## 1. Название и цель задачи

**ID:** `SPRINT-1-FOUNDATION`
**Название:** Sprint 1. Фундамент: рабочая основа проекта «Тесты и квизы»
**Приоритет:** P0 (блокирует все последующие спринты)
**Оценка:** 8–10 pd (один full-stack разработчик)
**Ветка:** `sprint-1/foundation` → `main` через PR
**Срок по roadmap:** 1–2 недели (`docs/02-tz.md`, §14.1)

**Цель:** получить запускаемое приложение, в которое уже можно зарегистрироваться, войти и увидеть оболочку будущего продукта, и на котором команда может безопасно строить Sprint 2–4.

**Результат спринта (проверяемый):**
1. `npm run dev` поднимает сайт; главная страница доступна без ошибок в консоли.
2. `docker compose up -d db` + `npx prisma migrate deploy` дают рабочую БД PostgreSQL 16.
3. Полный цикл auth работает вручную и в e2e: регистрация → письмо (dev-лог) → подтверждение email → вход → защищённая страница `/account` → выход.
4. `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` — зелёные локально и в CI.
5. UI-оболочка соответствует требованиям аудитории 45+/55+ (крупный текст, три шага размера, без burger-меню, skip-link, видимый фокус).

**Чего в результате нет:** ни одного экрана прохождения теста, ни каталога, ни прогресса, ни админки — это Sprint 2–4.

---

## 2. Контекст и ссылки на разделы ТЗ

| Документ | Раздел | Что берём в Sprint 1 |
|---|---|---|
| `README.md` | весь | Рабочее имя «Тесты и квизы», аудитория 45+/55+, продуктовая модель, тон |
| `docs/01-analogies.md` | позиционирование | Только терминология и отказ от соревновательности в UI |
| `docs/02-tz.md` | §5.1–5.2 | Границы MVP: что вообще не делаем и что откладываем |
| `docs/02-tz.md` | §6.6 | Auth: scrypt, токены, cookie `quiz_user_id`, rate-limit, CSRF, инварианты безопасности |
| `docs/02-tz.md` | §6.7 | Только как задел: `isGuest` в модели; гостевая логика — не в Sprint 1 |
| `docs/02-tz.md` | §8.1–8.2 | Стек, монолит Next.js, REST `/api/v1`, слой сервисов `lib/*` |
| `docs/02-tz.md` | §9.1–9.3 | Сущности и индексы — используются как источник для `schema.prisma` (в Sprint 1 только auth-часть) |
| `docs/02-tz.md` | §10.4, §10.6 | Auth-роуты и общие правила API (ошибки, версионирование) |
| `docs/02-tz.md` | §11.3–11.5 | Доступность (WCAG AA, для 55+ ближе к AAA), безопасность, 152-ФЗ |
| `docs/02-tz.md` | §12.1–12.3, §12.7 | Принципы UX, структура главной, дизайн-система (токены, типографика, компоненты) |
| `docs/02-tz.md` | §13.3 | Dev-фолбэк писем в лог; SMTP — задел |
| `docs/02-tz.md` | §14.1–14.2 | Границы спринта и оценка |
| `docs/03-progress-model.md` | §3–4, §7, §12 | **Только** чтобы не заложить в схему конфликтующие поля и константы; логика прогресса не реализуется |
| `docs/04-audience-55plus.md` | §4, §6, §7 | UX-правила, требования к авторизации для 55+, словарь терминов |
| `autocard-pro/lib/auth/*` | `password.ts`, `tokens.ts`, `session.ts`, `rateLimit.ts`, `identity.ts`, `authConfig.ts`, `consent.ts` | Референс реализации auth |
| `autocard-pro/prisma/schema.prisma` | модели `User`, `AuthIdentity`, `EmailToken`, `Consent` | Референс структуры auth-моделей |
| `autocard-pro/{Dockerfile,docker-compose.yml,eslint.config.mjs,vitest.config.ts}` | — | Референс инфраструктуры |
| `autocard-pro/docs/technical-spec-email-auth.md` | §2.3.1, §2.4, §2.6, §2.7, §4 | scrypt, токены, rate-limit, `sessionEpoch`, контракты |
| `autocard-pro/AGENTS.md` | — | Правило: читать `node_modules/next/dist/docs/` перед работой с Next.js 16 |
| `forms_writer/samples/questions.json` | — | **Не используется** в Sprint 1; нужен с Sprint 2 |

**Важно:** в проекте пока нет кода и git-репозитория — только документация. Sprint 1 создаёт репозиторий с нуля.

---

## 3. Scope и Out of scope

### 3.1. Scope (входит)

**A. Каркас приложения**
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4.
- ESLint 9 (flat config) + Prettier 3.
- Базовая структура каталогов `app/`, `components/`, `lib/`, `prisma/`, `tests/`.
- `next.config.ts` (strict mode, `typedRoutes` — по решению), security-заголовки через `proxy.ts` (в Next 16 вместо `middleware.ts` — проверить по документации в `node_modules/next/dist/docs/`).

**B. Инфраструктура БД**
- `docker-compose.yml` с PostgreSQL 16 (healthcheck, volume, порт 5432).
- `.env.example` без секретов; валидация env через Zod (`lib/env.ts`) с падением на старте при отсутствии обязательных переменных.
- Prisma 7 + `@prisma/adapter-pg` + `pg`, `prisma.config.ts`.
- Первая миграция: таблицы auth-контура (`User`, `AuthIdentity`, `EmailToken`, `Consent`) по разделу 7.
- `/api/health` — проверка `SELECT 1`, 200/503.

**C. Auth-каркас (без гостевого режима и без OAuth)**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET  /api/v1/auth/me`
- `POST /api/v1/auth/change-password` — **P1**, может уехать в Sprint 2 без блокировки спринта.
- Страницы: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/account` (заглушка «Мои результаты» — только заголовок и блок «Здесь появятся ваши результаты»).
- Правовые страницы-заглушки: `/legal/terms`, `/legal/privacy` с версией документа и пометкой «черновик».
- Серверная проверка сессии (`getCurrentUser()`), защита `/account` редиректом на `/login?next=/account`. Для `/account` — `Cache-Control: no-store, private` и `dynamic = "force-dynamic"`.

**D. Письма (dev-режим)**
- `MAIL_TRANSPORT=log` — письмо целиком пишется в `logs/dev-mail.log` и доступно на `/_dev/mailbox` только при `APP_ENV !== "production"`.
- Реальный роут — `app/dev/mailbox/page.tsx`; публичный URL `/_dev/mailbox` создаётся через `rewrites()` в `next.config.ts` (папка `app/_dev` в Next.js исключается из роутинга и не работает).
- `MAIL_TRANSPORT=smtp` — интерфейс готов, реальный SMTP не настраивается.
- При `APP_ENV=production` транспорт `log` запрещён: приложение завершается на старте с явной ошибкой. `NODE_ENV` для этого не используется, потому что `next build` и `next start` всегда выставляют `production`.

**E. UX-оболочка под 45+/55+**
- Шапка: логотип-текст, «Тесты», «Мои результаты», «Войти»/«Выйти». Без burger-меню, без выпадающих списков.
- Skip-link «Перейти к содержанию».
- Переключатель размера текста из трёх шагов: 18 / 20 / 22 px (без процентных множителей), выбор сохраняется в cookie `text_size`, применяется на сервере (без мигания).
- Базовые компоненты: `Button`, `Input`, `Field`, `Alert`, `Card`, `TextSizeSwitch`.
- Контраст основного текста ≥ 7:1, кнопки ≥ 56 px по высоте, видимый `focus-visible`, уважение `prefers-reduced-motion`.

**F. Качество и процесс**
- Vitest 3: юнит-тесты `lib/auth/*` и `lib/http/*`.
- Playwright: 5 e2e-сценариев в 4 файлах (регистрация+verify+вход, неверный пароль, защита `/account`, выход, переключатель размера текста).
- GitHub Actions: `npm ci` → `db:generate` → lint → typecheck → unit → migrate → build (с сервисом Postgres) → e2e.
- README: запуск за 5 минут, переменные env, команды, границы Sprint 1.

### 3.2. Out of scope (не входит)

| Что | Почему / когда |
|---|---|
| Каталог, темы, тесты, вопросы, плеер, результат, разбор | Sprint 2–3 |
| `QuestionProgress`, `TopicProgress`, `UserStats`, баллы, освоение, уровни, серии | Sprint 4 |
| Дипломы, шаринг, «тест дня», повтор ошибок | Sprint 5 |
| Админка, импорт JSON из `forms_writer` | Sprint 2 |
| Гостевой режим и merge прогресса (`AUTH-7`, `AUTH-8`) | Sprint 2–3; в Sprint 1 только задел `isGuest` в модели |
| Удаление аккаунта (`AUTH-6`), смена email (`AUTH-5`, часть) | Sprint 2, экран настроек |
| OAuth (VK/ОК/Яндекс/Telegram), вход по коду, вход по телефону | v1.1 |
| Реальный SMTP, SPF/DKIM/DMARC, доставка в Mail.ru/Яндекс/Rambler | Перед бетой (Sprint 5–6) |
| Платежи, подписки, монетизация | После MVP |
| Публичные рейтинги, лидерборды, PvP, live, UGC, мобильное приложение | Не в MVP |
| Sentry, Метрика/GA4, consent-gated аналитика | Sprint 5 |
| S3/Object Storage, изображения | Sprint 2–3 |
| Redis, фоновые worker'ы, горизонтальное масштабирование | При росте (10k+ DAU) |
| Деплой на VPS, Caddy, домен, TLS | Отдельная задача после Sprint 1 |
| `Dockerfile` для прод-сборки | P2: допускается как задел, не блокирует спринт |

---

## 4. Технические решения и допущения

### 4.1. Версии и пакеты

Версии по умолчанию — как в `autocard-pro/package.json` (проверенный референс). Все версии **фиксируются в `package.json`** (lock-файл коммитится).

**Зависимости (prod):**

| Пакет | Версия | Назначение |
|---|---|---|
| `next` | `16.3.6` (точная) | Фреймворк |
| `react`, `react-dom` | `19.2.4` | UI |
| `@prisma/client` | `^7.9.1` | ORM-клиент |
| `@prisma/adapter-pg` | `^7.9.1` | Драйвер-адаптер Prisma 7 для PostgreSQL |
| `pg` | `^8` (актуальная стабильная) | Драйвер PostgreSQL |
| `zod` | актуальная стабильная | Валидация env, тел запросов, форм |
| `nodemailer` | `^7.0.13` | Отправка писем |

**Зависимости (dev):**

| Пакет | Версия | Назначение |
|---|---|---|
| `prisma` | `^7.9.1` | CLI, миграции |
| `typescript` | `^5` | Типизация, `strict: true` |
| `@types/node` | соответствует Node 24 | Типы Node |
| `@types/react`, `@types/react-dom` | `^19` | Типы React |
| `@types/pg` | `^8` | Типы `pg` |
| `@types/nodemailer` | `^8` | Типы Nodemailer |
| `tailwindcss`, `@tailwindcss/postcss` | `^4` | Стили |
| `eslint` | `^9.39` | Линт |
| `eslint-config-next` | `^16.3.6` | Правила Next |
| `prettier` | `^3` | Форматирование |
| `vitest` | `^3.2.7` | Юнит-тесты |
| `@playwright/test` | актуальная стабильная | E2E |
| `dotenv` | актуальная стабильная | **Только если** требуется для `prisma.config.ts` — проверить по документации Prisma 7 |

**Не добавляем в Sprint 1:** Radix/shadcn, state-manager, ORM-альтернативы, auth-библиотеки (NextAuth и т.п.), Redis-клиент, Sentry, аналитику.

### 4.2. Структура каталогов (решение)

Корень репозитория — текущая папка проекта (документы `README.md` и `docs/` сохраняются как есть). Каталог `src/` **не используем** — как в `autocard-pro`: `app/`, `components/`, `lib/` в корне.

Инициализация — **вручную** (`npm init` + правка `package.json`), а не через `create-next-app`: имя папки на кириллице и уже существующие `README.md`/`docs/` конфликтуют со скаффолдером.

### 4.3. PostgreSQL только через Docker

- Сервис `db`: образ `postgres:16-alpine`, том `pgdata`, `healthcheck` через `pg_isready`, порт `5432:5432`.
- `DATABASE_URL=postgresql://quiz:quiz@localhost:5432/quiz?schema=public` — только локально.
- SQLite-фолбэка нет (расхождение с §8.1 «SQLite — только локально» фиксируется как решение: один тип БД во всех окружениях, меньше расхождений).
- Если Docker недоступен: `/api/health` → 503 `{status:"degraded", db:"down"}`, auth-роуты → 503 `db_unavailable` с понятным текстом; приложение не падает молча.

### 4.4. Prisma 7

- `prisma.config.ts` в корне + `schema.prisma` в `prisma/`.
- Runtime-подключение — через `@prisma/adapter-pg` и singleton в `lib/db.ts` (иначе в dev плодятся коннекты при HMR).
- Схема Sprint 1: только auth-контур (`User`, `AuthIdentity`, `EmailToken`, `Consent`) и роль пользователя (`USER`/`EDITOR`/`ADMIN`). Поля — по разделу 7, здесь не дублируются. Игровые модели не создаются.
- `User.timezone` — источник истины по часовому поясу; `UserStats` timezone не содержит (задел на Sprint 4).
- **Помечено: «проверить по официальной документации Prisma 7»** — точное расположение URL датасорса (`schema.prisma` vs `prisma.config.ts`), способ передачи адаптера в CLI, необходимость `dotenv` в конфиге, команда `prisma migrate deploy` в CI.

### 4.5. Auth-решения

| Решение | Значение |
|---|---|
| Префикс API | `/api/v1/auth/*` (в `autocard-pro` — `/api/auth/*`; отличие осознанное, версионирование по §8.2) |
| Файлы | `app/api/v1/auth/<action>/route.ts`, логика — `lib/auth/*` |
| Хеширование | scrypt, формат `scrypt$v$N$r$p$salt$hash`, сравнение через `timingSafeEqual` |
| Политика пароля | 8–128 символов, стоп-лист частых паролей, без требований к регистру/спецсимволам |
| Токены | 32 байта random, в БД sha256, одноразовые; verify — 24 ч, reset — 1 ч |
| Cookie сессии | `quiz_user_id` = `<userId>:<sessionEpoch>`, `httpOnly`, `SameSite=Lax`, `Secure` в prod, `path=/`, 30 дней |
| Подпись cookie | HMAC-SHA256 от `AUTH_SECRET` — повторить поведение `autocard-pro/lib/auth/session.ts`; если там подписи нет, добавить (это деталь реализации, не расхождение с ТЗ) |
| `sessionEpoch` | Инкремент при смене/сбросе пароля и «выйти на всех устройствах» |
| Перечисление пользователей | Запрещено: одинаковый ответ на несуществующий email и неверный пароль |
| Блокировка | 5 неудачных попыток → 15 минут (константы в env). Проверяется **после верного пароля**: при неверном пароле ответ `401 invalid_credentials`, даже если аккаунт заблокирован. Это исключает перечисление аккаунтов. Оговорка: если запрос отсечён rate-limit раньше, ответ — `429` (см. ниже). |
| Rate-limit | In-memory бакеты по `emailNormalized` и `clientIp()` на каждую операцию; при масштабировании — Redis |
| CSRF | `assertSameOrigin` для всех state-changing запросов + `SameSite=Lax` |
| Ответы API | `{ error: { code, message }, requestId }`, `requestId` в заголовке `x-request-id` |
| Verify и авто-вход | По умолчанию **без** авто-входа: после verify редирект на `/login?verified=1` без email в query. Флаг `AUTH_LOGIN_AFTER_VERIFY=false` позволяет включить авто-вход. **Расхождение с §6.6** («после регистрации — автоматический вход») зафиксировать в журнале решений |
| Подтверждение email | Обязательно для входа (по умолчанию), с повторной отправкой. GET-страница только показывает кнопку; подтверждение — POST, чтобы почтовый prefetch не «сжигал» токен |
| Проверка состояния аккаунта | Только после верного пароля |
| Timing-защита | `login` всегда выполняет scrypt: для несуществующего email — против dummy-хеша, чтобы время ответа не выдавало наличие аккаунта |
| Open redirect | `next` принимается только как внутренний путь: `startsWith("/")`, не `//`, не `/\`, и `new URL(next, APP_URL).origin === APP_URL` |
| Логи | Пароли, токены, хеши, cookie и полные email в прикладные логи **не попадают никогда**. Единственное исключение — dev-транспорт писем: полный текст письма (включая ссылку с токеном и email получателя) пишется в `logs/dev-mail.log` только при `APP_ENV != production`, файл gitignored и не содержит паролей и хешей. При `APP_ENV=production` запись в этот файл отключена и старт с `MAIL_TRANSPORT=log` запрещён |

**Переменные окружения (`.env.example`, без реальных значений):**

```
APP_ENV=local                 # local | test | production; не путать с NODE_ENV
DATABASE_URL=
DATABASE_URL_TEST=            # отдельная БД quiz_test для тестов; не обязателен локально
AUTH_SECRET=
APP_URL=http://localhost:3000
AUTH_SESSION_TTL_DAYS=30
AUTH_VERIFY_TOKEN_TTL_HOURS=24
AUTH_RESET_TOKEN_TTL_HOURS=1
AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCKOUT_MINUTES=15
AUTH_LOGIN_AFTER_VERIFY=false
AUTH_RL_REGISTER_PER_EMAIL_H=3
AUTH_RL_REGISTER_PER_IP_H=5
AUTH_RL_LOGIN_PER_EMAIL_15M=10
AUTH_RL_LOGIN_PER_IP_15M=10
AUTH_RL_RESEND_PER_EMAIL_H=3
AUTH_RL_RESEND_PER_IP_H=10
AUTH_RL_FORGOT_PER_EMAIL_H=3
AUTH_RL_FORGOT_PER_IP_H=10
AUTH_RL_RESET_PER_IP_H=5
AUTH_RL_CHANGE_PASSWORD_PER_USER_H=5
LEGAL_TERMS_VERSION=2026-11-09-draft
LEGAL_PRIVACY_VERSION=2026-11-09-draft
MAIL_TRANSPORT=log
MAIL_FROM="Тесты и квизы <no-reply@localhost>"
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
```

`lib/env.ts` валидирует их Zod-схемой при старте; отсутствие `AUTH_SECRET` или `DATABASE_URL` — фатальная ошибка с понятным сообщением. `DATABASE_URL_TEST` нужен только для integration/e2e (см. шаг 7); локальный запуск без него работает, CI его задаёт.

### 4.6. Письма в dev

> **Инвариант секретности и его единственное исключение.** В прикладные логи (`console`, stdout) токены, пароли, хеши и полные email не пишутся никогда. Dev-транспорт писем — не лог приложения, а локальный файл-почтовый ящик. Поэтому полный текст письма (email получателя и ссылка с токеном) разрешён **только** в `logs/dev-mail.log` при `APP_ENV != production`; файл в `.gitignore`, паролей и хешей в нём нет. При `APP_ENV=production` запись отключена, а `MAIL_TRANSPORT=log` запрещён на старте.

- `MAIL_TRANSPORT=log`: письмо формируется целиком (тема, текст, ссылка с токеном) и пишется в `logs/dev-mail.log` (gitignored, append, с разделителями).
- `/_dev/mailbox` — простая страница со списком последних писем и кликабельными ссылками. Реальный файл — `app/dev/mailbox/page.tsx`; URL `/_dev/mailbox` создаётся через `rewrites()` в `next.config.ts`. Внутри страницы — проверка `APP_ENV !== "production"`, иначе `notFound()`.
- `MAIL_TRANSPORT=smtp` — код готов, переменные читаются, но фактическая отправка проверяется только при появлении ESP.
- При `APP_ENV=production` транспорт `log` запрещён: приложение завершается на старте с явной ошибкой. Проверка привязана к `APP_ENV`, а не к `NODE_ENV`, иначе локальный `next start` и CI не смогут работать.

### 4.7. UI-оболочка (45+/55+)

- Шрифт: Golos Text через `next/font/google`; если шрифт недоступен — self-host woff2 в `public/fonts` (не блокирует спринт).
- Базовый размер текста 18 px, шаги 18/20/22 px. Выбор хранится в cookie `text_size` (`s`/`m`/`l`) и применяется на сервере атрибутом `data-text-size` на `<html>` — без вспышки крупного/мелкого текста.
- Кнопки высотой ≥ 56 px, отступы ≥ 16 px, никаких иконок без подписи для важных действий.
- Навигация: 3–4 пункта, всегда видимые; никаких burger-меню, свайпов, drag-and-drop, скрытых крестиков.
- Тексты: «тест», «баллы», «освоено», «уровень знатока», «Мои результаты». Запрещены «квиз», «XP», «mastery», «streak», «лидерборд». На экране регистрации — «Сохранить результаты», а не «Зарегистрироваться».
- Ошибки форм — текстом под полем, с указанием, что именно исправить; без красных рамок без пояснения.

### 4.8. Инженерные решения

- `lib/http/json.ts` — единый формат успеха/ошибки; `lib/http/origin.ts` — `assertSameOrigin`; `lib/http/redirect.ts` — `safeNext`; `lib/http/requestId.ts` — генерация `requestId`.
- `lib/auth/*` не импортирует `next/*`; cookie-адаптер вынесен в `lib/auth/cookieStore.ts` и `lib/auth/currentUser.ts`, чтобы чистую логику (`parseSession`, `signSession`, `verifySession`) можно было тестировать в Vitest. Сам `currentUser.ts` использует `next/headers` и в unit-тестах не импортируется.
- `proxy.ts` (Next 16) — security-заголовки (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, CSP `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'`); `'unsafe-inline'` для скриптов нужен из-за inline RSC-payload Next, иначе ломается гидратация; ужесточение через nonce — после стабилизации. Проверка сессии — в server components через `getCurrentUser()`, чтобы не ходить в БД из прокси. HSTS — только при `APP_ENV=production`.
- `instrumentation.ts` вызывает `validateEnv()` при `NEXT_RUNTIME === "nodejs"`, чтобы приложение падало на старте, а не на первом запросе.
- `logs/`, `.env`, `.env.local`, `.env.*.local`, `node_modules/`, `.next/`, `test-results/`, `playwright-report/` — в `.gitignore`; `.env.example` **исключён** через `!.env.example` и коммитится.

### 4.9. Допущения (помечены явно)

- **[допущение]** Node.js 24 LTS и npm 11.x (или новее; npm 12 не входит в Node 24) на машине разработчика и в CI.
- **[допущение]** Оценка ~9 pd покрывает только разработку; ревью, QA и стабилизация e2e добавляют 2–3 pd, поэтому реальный срок — 2 недели.
- **[допущение]** Docker Desktop доступен локально; CI использует service-контейнер `postgres:16`.
- **[допущение]** `AUTH_SECRET` — 32+ байта в base64; генерация описывается в README.
- **[допущение]** Стоп-лист паролей — 300–500 самых частых; подбор — задача редактора/разработчика, не влияет на архитектуру.
- **[гипотеза]** Точный синтаксис `prisma.config.ts` для Prisma 7 + `@prisma/adapter-pg` будет подтверждён при выполнении шага 4 по официальной документации; при расхождении — корректируется только конфиг, не архитектура.
- **[гипотеза]** Требование §6.6 об автоматическом входе после регистрации может быть смягчено до «вход после подтверждения email» — нужно подтверждение владельца продукта (см. расхождение C1).

---

## 5. Пошаговый план реализации для разработчика

> Все команды — PowerShell, из корня проекта `C:\Users\a.bochkarev\Documents\Тесты и квизы`.
> После каждого шага — коммит. Формат: `feat(sprint-1): <что сделано>`.

### Шаг 0. Предусловия и репозиторий (0.25 pd)

```powershell
node -v          # ожидается v24.x
npm -v           # ожидается >= 11.x (npm 12 не входит в Node 24)
docker version   # клиент и engine доступны
git init
git branch -M main
git add .
git commit -m "chore: initial commit with docs"
```

Создать `.gitignore` со списком: `node_modules/`, `.next/`, `.env`, `.env.local`, `.env.*.local`, `!.env.example`, `logs/`, `coverage/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`.

Для CI нужен удалённый GitHub-репозиторий: `git remote add origin <url>`, `git push -u origin main`. Если репозитория ещё нет, шаг 7 (CI) выполняется после его создания; локальные проверки от этого не зависят.

**Ожидаемый результат:** git-репозиторий с документацией на ветке `main`, `.env` и логи не попадают в индекс, `.env.example` — попадает. `git status` чистый.

---

### Шаг 1. Каркас Next.js 16 + TypeScript (0.5 pd)

Создать `package.json` вручную (имя папки на кириллице не годится для npm):

```json
{
  "name": "tests-and-quizzes",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:up": "docker compose up -d db",
    "db:down": "docker compose down",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio"
  }
}
```

```powershell
npm install next@16.3.6 react@19.2.4 react-dom@19.2.4
npm install -D typescript@^5 @types/node@^24 @types/react@^19 @types/react-dom@^19 eslint@^9 eslint-config-next@16.3.6 prettier@^3
```

Создать файлы:
- `tsconfig.json` — `strict: true`, `noUncheckedIndexedAccess: true`, `paths: { "@/*": ["./*"] }`, plugin `next`.
- `next.config.ts` — `reactStrictMode: true` и `rewrites()` для `/_dev/mailbox` → `/dev/mailbox` (сам роут создаётся в шаге 6).
- `proxy.ts` — security-заголовки (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, CSP с `script-src 'self' 'unsafe-inline'`; HSTS только при `APP_ENV=production`). Сессию здесь не проверяем — только заголовки.
- `eslint.config.mjs` — ESLint 9 flat config по образцу `autocard-pro/eslint.config.mjs` (`eslint-config-next/core-web-vitals` + `/typescript`).
- `prettier.config.mjs` — форматирование; скрипт `format` уже в `package.json`.
- `app/layout.tsx` — `<html lang="ru">`, метаданные, подключение `globals.css`.
- `app/page.tsx` — главная-заглушка: заголовок «Проверьте себя», подзаголовок про тесты и сохранение результатов, кнопки «Выбрать тест» (ведёт на `/tests` с пометкой «Скоро») и «Войти». Слова «квиз» и «Тесты и квизы» в H1 нет — только «Тесты»/«Проверьте себя» (AC-UI-07).
- `app/tests/page.tsx` — заглушка «Каталог тестов скоро появится», чтобы пункт меню не вёл в 404.
- `app/error.tsx`, `app/not-found.tsx` — понятные тексты крупным шрифтом.

Текст логотипа в шапке — **«Тесты»** (не «Тесты и квизы»), чтобы не нарушать AC-UI-07.

Rewrite для dev-почты:
```ts
async rewrites() {
  return [{ source: "/_dev/mailbox", destination: "/dev/mailbox" }];
}
```

**Перед началом:** прочитать `node_modules/next/dist/docs/` (правило из `autocard-pro/AGENTS.md`) и убедиться в актуальном API App Router для 16.3.6. Не полагаться на память.

```powershell
npm run dev
```

**Ожидаемый результат:** `http://localhost:3000` открывается, в консоли нет ошибок и предупреждений Next.js; `npm run build` проходит.

---

### Шаг 2. Tailwind 4, дизайн-токены и UI-оболочка (1.0 pd)

```powershell
npm install -D tailwindcss@^4 @tailwindcss/postcss@^4
```

Создать `postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

В `app/globals.css`:
- `@import "tailwindcss";`
- `@theme` с токенами: цвета (спокойный акцент, успех, ошибка, нейтральные), радиусы, размеры шрифта (18/20/22/28/36 px), минимальная высота кнопок 56 px, тап-зон — 48 px.
- Базовые правила: `body { font-size: 18px; line-height: 1.6; }`, `:focus-visible { outline: 3px solid; outline-offset: 2px; }`, `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }`.
- Правила для `[data-text-size="s"|"m"|"l"]` — масштаб базового текста.

Создать компоненты:
- `components/layout/SiteHeader.tsx` — логотип-текст, ссылки «Тесты», «Мои результаты», «Войти»/«Выйти».
- `components/layout/SiteFooter.tsx` — копирайт, ссылки на «Пользовательское соглашение» (`/legal/terms`) и «Политика конфиденциальности» (`/legal/privacy`), контакт.
- `components/layout/SkipLink.tsx` — «Перейти к содержанию».
- `components/ui/Button.tsx` — варианты `primary`/`secondary`, высота ≥ 56 px, `aria-disabled` вместо «мёртвых» кнопок.
- `components/ui/Input.tsx`, `components/ui/Field.tsx` — поле с подписью и текстом ошибки, `aria-describedby`.
- `components/ui/Alert.tsx` — нейтральный/успех/ошибка.
- `components/ui/TextSizeSwitch.tsx` — три кнопки «Обычный / Крупный / Очень крупный», сохраняет cookie `text_size`, обновляет `data-text-size` на `<html>`.
- `lib/utils/cn.ts` — склейка классов.

`app/layout.tsx` читает cookie `text_size` (server side) и выставляет `data-text-size` на `<html>`.

**Ожидаемый результат:** главная выглядит как оболочка продукта; навигация доступна с клавиатуры, skip-link работает, переключатель размера меняет текст мгновенно и сохраняется после перезагрузки; проверка контраста основного текста ≥ 7:1.

---

### Шаг 3. PostgreSQL в Docker, env, health-check (0.5 pd)

Создать `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: tests-quizzes-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: quiz
      POSTGRES_PASSWORD: quiz
      POSTGRES_DB: quiz
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U quiz -d quiz"]
      interval: 5s
      timeout: 5s
      retries: 10
volumes:
  pgdata:
```

Создать `.env.example` (состав — в разделе 4.5), скопировать в `.env` и заполнить локально (`APP_ENV=local`, `AUTH_SECRET` сгенерировать: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).

```powershell
npm run db:up
docker compose up -d --wait db   # дождаться healthcheck
docker compose ps                # db — healthy
```

Создать:
- `lib/env.ts` — Zod-схема, экспорт типизированного `env`, падение на старте при невалидных значениях. Валидация `NODE_ENV`/`APP_ENV` раздельная.
- `instrumentation.ts` — при `NEXT_RUNTIME === "nodejs"` вызывает `validateEnv()`, чтобы `next dev` и `next start` падали на старте, а не на первом запросе.
- `app/api/health/route.ts` — `SELECT 1` через `lib/db.ts`; 200 `{status:"ok", db:"up"}` или 503 `{status:"degraded", db:"down"}`; `export const dynamic = "force-dynamic"`. `/api/health` — служебный роут и **не** оборачивается в `{data}`; это единственное исключение из общего конверта.

**Ожидаемый результат:** `docker compose ps` показывает `healthy`; `Invoke-WebRequest http://localhost:3000/api/health` возвращает 200; при `npm run db:down` — 503, приложение не падает.

---

### Шаг 4. Prisma 7, адаптер, первая миграция (1.0 pd)

```powershell
npm install @prisma/client@^7.9.1 @prisma/adapter-pg@^7.9.1 pg@^8
npm install -D prisma@^7.9.1 @types/pg@^8
npx prisma init --datasource-provider postgresql
```

Создать `prisma.config.ts` и настроить подключение.
**[пометка]** Точный синтаксис Prisma 7 (`defineConfig`, расположение `datasource.url`, передача адаптера в CLI, нужен ли `dotenv`) — **проверить по официальной документации Prisma 7** и зафиксировать рабочую конфигурацию в README.

`prisma/schema.prisma`:
- `generator client` с `provider = "prisma-client"` (проверить имя генератора для Prisma 7);
- `datasource db` — PostgreSQL;
- модели `User`, `AuthIdentity`, `EmailToken`, `Consent` и роль `USER/EDITOR/ADMIN` — **по разделу 7**, без дублирования полей здесь;
- индексы — по §9.3 для auth-части (`emailNormalized` уникален, токены по `tokenHash`, `expiresAt`);
- игровые модели (`Topic`, `Quiz`, `Question`, `Attempt`, `QuestionProgress`, `TopicProgress`, `UserStats`) **не создаются** в Sprint 1.

`lib/db.ts`:
- singleton `PrismaClient` с `@prisma/adapter-pg` и `DATABASE_URL`;
- кэш инстанса в `globalThis` для dev (иначе HMR плодит подключения).

```powershell
npx prisma migrate dev --name init_auth
npx prisma generate
```

**Ожидаемый результат:** миграция применена, в БД есть 4 таблицы; `npx prisma studio` открывается и показывает схему; `/api/health` возвращает 200.

---

### Шаг 5. Слой `lib/auth` и `lib/http` (1.5 pd)

Портировать и адаптировать из `autocard-pro` (не переписывать с нуля):

| Файл | Что внутри |
|---|---|
| `lib/auth/authConfig.ts` | Чтение и валидация `AUTH_*`, `MAIL_*`, `SMTP_*` через `lib/env.ts` |
| `lib/auth/password.ts` | `hashPassword`, `verifyPassword`, формат `scrypt$v$N$r$p$salt$hash`, `timingSafeEqual`, `DUMMY_HASH` для выравнивания времени входа |
| `lib/auth/passwordPolicy.ts` | 8–128 символов, стоп-лист, человекочитаемые сообщения об ошибках |
| `lib/auth/passwordStopList.ts` | Массив частых паролей (300–500) |
| `lib/auth/tokens.ts` | `createToken` (32 байта), `hashToken` (sha256), `verifyToken` (TTL, одноразовость) |
| `lib/auth/session.ts` | Чистые функции `parseSession`, `signSession`, `verifySession`; формат `<userId>:<sessionEpoch>` + HMAC, без импорта `next/*` |
| `lib/auth/cookieStore.ts` | Тонкий адаптер над `next/headers`: `setSession`, `clearSession`, `readSession` |
| `lib/auth/rateLimit.ts` | In-memory бакеты по ключу `operation:emailNormalized` и `operation:clientIp`, окно и лимиты из env; `clientIp()` учитывает `x-forwarded-for` только за доверенным прокси |
| `lib/auth/identity.ts` | `emailNormalized` как источник истины, поиск/создание `User` + `AuthIdentity` |
| `lib/auth/consent.ts` | Версии документов, запись `Consent` при регистрации |
| `lib/auth/schemas.ts` | Zod-схемы тел запросов и форм |
| `lib/auth/mail.ts` | Транспорты `log`/`smtp`, шаблоны писем verify/reset, запрет `log` при `APP_ENV=production` |
| `lib/auth/currentUser.ts` | `getCurrentUser()` — читает cookie через `cookieStore`, проверяет `sessionEpoch`, возвращает `User \| null` |
| `lib/http/json.ts` | `ok()`, `fail(code, message, status)` → `{ error: { code, message }, requestId }` |
| `lib/http/origin.ts` | `assertSameOrigin(request)` — сравнение `Origin` с `APP_URL` |
| `lib/http/redirect.ts` | `safeNext(value)` — только внутренний путь; отсекает `//`, `/\`, `javascript:` и внешние origin |
| `lib/http/requestId.ts` | `crypto.randomUUID()`, заголовок `x-request-id` |

Правило: `lib/auth/*` не импортирует `next/*`; единственные исключения — `cookieStore.ts` и `currentUser.ts`. Чистые функции тестируются в Vitest, адаптеры мокаются.

**Ожидаемый результат:** юнит-тесты на `password`, `tokens`, `session`, `rateLimit`, `origin`, `redirect` пишутся и проходят (сами тесты — шаг 7).

---

### Шаг 6. Auth-роуты, страницы и dev-почта (2.0 pd)

**Роуты** (`app/api/v1/auth/<action>/route.ts`):

| Роут | Поведение |
|---|---|
| `register` | Zod-валидация, rate-limit по IP и email, создание `User` + `AuthIdentity` + `Consent`, письмо verify. Ответ всегда нейтральный: «Проверьте почту» |
| `login` | Rate-limit (IP, затем email) → всегда scrypt (для несуществующего email — `DUMMY_HASH`) → проверка пароля → состояние аккаунта. При неверном пароле — `401 invalid_credentials` (если не отсечено `429`); при верном пароле и блокировке — `423 account_locked`; при `!emailVerified` → `403 email_not_verified` + предложение отправить письмо повторно; успех — cookie сессии |
| `logout` | Очистка cookie, идемпотентно |
| `logout-all` | Инкремент `sessionEpoch`, очистка cookie |
| `verify-email` | POST подтверждает токен: проверка, `emailVerified`, одноразовость. GET-страница только показывает кнопку «Подтвердить почту» и не сжигает токен. По умолчанию — редирект на `/login?verified=1` (без email в query); при `AUTH_LOGIN_AFTER_VERIFY=true` — сразу сессия |
| `resend-verification` | Rate-limit, новый токен, нейтральный ответ |
| `forgot-password` | Всегда нейтральный ответ, письмо при существующем email |
| `reset-password` | Проверка токена, смена пароля, инкремент `sessionEpoch` |
| `change-password` | **P1**, требует сессии, инкремент `sessionEpoch` |
| `me` | `200` с публичными полями пользователя или `401` |

Все state-changing роуты вызывают `assertSameOrigin`. Все ответы — через `lib/http/json.ts`.

**Страницы:**
- `/register` — email, пароль, «Показать пароль», два чекбокса согласий со ссылками на `/legal/terms` и `/legal/privacy` (обе ссылки видны и открываются в новой вкладке), кнопка «Сохранить результаты», ссылка «Уже есть аккаунт? Войти».
- `/login` — email, пароль, крупная ссылка «Забыли пароль?», кнопка «Войти», сообщение «Почта подтверждена, войдите» после verify (без email в URL).
- `/forgot-password`, `/reset-password` — минимальные формы с понятными подсказками.
- `/verify-email` — GET показывает токен и крупную кнопку «Подтвердить почту»; подтверждение отправляется POST-формой (работает без JS). Повторная отправка письма — отдельная кнопка.
- `/account` — защищённая заглушка: заголовок «Мои результаты», текст «Здесь появятся ваши результаты и освоенные темы», кнопка «Выйти». Проверка сессии — в server component, редирект на `/login?next=/account`; `Cache-Control: no-store, private`, `dynamic = "force-dynamic"`.
- `/login?next=…` — редирект только на внутренний путь: `startsWith("/")`, не `//`, не `/\`, и `new URL(next, APP_URL).origin === APP_URL`. Внешние URL, `javascript:` и protocol-relative отбрасываются.
- `/legal/terms`, `/legal/privacy` — страницы-заглушки с версией из env и пометкой «черновик».
- `app/dev/mailbox/page.tsx` — список писем из `logs/dev-mail.log`, доступен по `/_dev/mailbox` через rewrite; при `APP_ENV=production` — `notFound()`. Страница **обязательно динамическая**, иначе `next start` отдаст статический 404 или закэширует пустой список: `export const dynamic = "force-dynamic"`, `export const revalidate = 0`, `export const runtime = "nodejs"`. Чтение файла — в `try/catch`: если `logs/dev-mail.log` ещё нет, показать «Писем пока нет» и ссылку на регистрацию, а не падать. Каталог `logs/` создаётся при записи письма через `fs.promises.mkdir(dir, { recursive: true })`, поэтому отдельный коммит пустой папки не нужен. Письмо, созданное после запуска `next start`, должно появляться в списке при следующем открытии страницы.

Формы отправляются через клиентский JS в JSON API. Это осознанное ограничение Sprint 1: страницы читаются и навигация работает без JS, verify-email подтверждается обычной POST-формой, остальные формы требуют JS. Progressive enhancement для всех форм — Sprint 2.

**Ожидаемый результат:** вручную проходится полный цикл: регистрация → письмо в `/_dev/mailbox` → переход по ссылке → подтверждение → вход → `/account` → выход. Неверный пароль и несуществующий email дают одинаковый текст ошибки.

---

### Шаг 7. Тесты и CI (1.5 pd)

```powershell
npm install -D vitest@^3.2.7 @playwright/test @axe-core/playwright
npx playwright install chromium
```

**Vitest** (`vitest.config.ts`, окружение `node`, алиас `@/*`):
- `tests/unit/auth/password.test.ts` — хеш/проверка, неверный пароль, формат строки.
- `tests/unit/auth/tokens.test.ts` — уникальность, sha256, TTL, одноразовость.
- `tests/unit/auth/session.test.ts` — формат `userId:epoch`, подпись, истёкшая/подделанная cookie.
- `tests/unit/auth/rateLimit.test.ts` — лимит, окно, раздельные бакеты по email и IP.
- `tests/unit/http/origin.test.ts` — совпадающий/чужой `Origin`, отсутствие заголовка.
- `tests/unit/http/redirect.test.ts` — `safeNext`: `/account` ок; `//evil.com`, `https://evil.com`, `/\evil.com`, `javascript:` отбрасываются.
- `tests/unit/env.test.ts` — падение при отсутствии `AUTH_SECRET`.

**Playwright** (`playwright.config.ts`, `baseURL: http://localhost:3000`, проект `chromium`):
```ts
webServer: {
  command: process.env.CI ? "npm run start" : "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
}
```
- регистрация → чтение письма из dev-mailbox → verify → вход → `/account`;
- после `npm run build && npm run start` с `APP_ENV=test`: регистрация создаёт письмо, `/_dev/mailbox` отдаёт `200` и показывает это письмо (проверка, что страница не застаивается и не отдаёт статический 404). Сценарий «`APP_ENV=production` → 404» вынесен в ручной чек-лист §10.3: основной Playwright-сервер поднимается один раз с `APP_ENV=test`, а production-конфигурация требует отдельного запуска с `MAIL_TRANSPORT=smtp`;
- вход с неверным паролем → одинаковое сообщение, нет перечисления;
- `/account` без cookie → редирект на `/login?next=/account`;
- выход → `/account` снова недоступен;
- переключатель размера текста сохраняется после перезагрузки;
- axe на `/`, `/login`, `/register` — 0 critical/serious.

Тестам нужна отдельная БД `quiz_test`: `DATABASE_URL_TEST`, скрипты `db:test:up`, `db:test:deploy`, `db:test:reset` и сид фикстур. Dev-БД не очищается. Для e2e: `APP_ENV=test`, `MAIL_TRANSPORT=log`.

**GitHub Actions** (`.github/workflows/ci.yml`):
- триггеры: `push` в `main`, `pull_request`;
- `ubuntu-latest`, `actions/setup-node` с Node 24, `npm ci`;
- service `postgres:16` с healthcheck и базой `quiz_test`; env job'а: `APP_ENV=test`, `DATABASE_URL`, `DATABASE_URL_TEST`, `AUTH_SECRET`, `APP_URL`, `MAIL_TRANSPORT=log`, `LEGAL_*_VERSION`. Тесты используют `quiz_test`, dev-база не затрагивается;
- шаги: `npm ci` → `npm run db:generate` (сразу, до lint/typecheck — иначе Prisma-клиент ещё не сгенерирован) → `npm run lint` → `npm run typecheck` → `npm test` → `npm run db:deploy` → `npm run build` → `npm run test:e2e` (Playwright с `--with-deps chromium`);
- кэш npm.

**Ожидаемый результат:** все шаги зелёные локально и в PR; e2e стабильно проходит два прогона подряд.

---

### Шаг 8. README, фиксация версий, приёмка спринта (0.75 pd)

Обновить `README.md`: сохранить существующее описание продукта, обновить блок «Статус» (Sprint 1 завершён, что работает, что дальше) и добавить:
- «Быстрый старт»: 5 команд от клонирования до работающего сайта;
- таблица переменных окружения;
- команды (`dev`, `build`, `test`, `test:e2e`, `db:*`);
- структура каталогов (кратко);
- границы Sprint 1 и что появится в Sprint 2;
- ссылка на `docs/sprint-1-notes.md` с зафиксированными расхождениями (C1 verify/авто-вход, C2 auth URL, C7 согласия, C8 dev-логи, C10 «квиз», C11 Postgres/SQLite, C17 cookie, C18 Prisma adapter, C21 URL экранов, C22 APP_ENV, C23 CSP/HSTS).

Создать `docs/sprint-1-notes.md` — журнал решений и известных расхождений (не менять существующие документы ТЗ).

```powershell
npm ls --depth=0        # зафиксировать фактические версии
npm run lint
npm run typecheck
npm test
npm run build
```

**Ожидаемый результат:** новый разработчик по README поднимает проект за ≤ 10 минут; все проверки зелёные; версии в `package.json` соответствуют фактически установленным; PR смержен.

---

### Сводка по шагам

| Шаг | Содержание | Оценка |
|---|---|---|
| 0 | Репозиторий, `.gitignore` | 0.25 |
| 1 | Каркас Next.js 16 + TS | 0.5 |
| 2 | Tailwind 4 + UI-оболочка | 1.0 |
| 3 | Docker Postgres, env, health | 0.5 |
| 4 | Prisma 7, адаптер, миграция | 1.0 |
| 5 | `lib/auth` + `lib/http` | 1.5 |
| 6 | Auth-роуты и страницы | 2.0 |
| 7 | Тесты и CI | 1.5 |
| 8 | README, приёмка | 0.75 |
| **Итого разработка** | | **~9 pd** |
| **Буфер: ревью, QA, стабилизация e2e** | | **2–3 pd** |
| **Итого** | | **~11–12 pd** |

---

## 6. Ожидаемая структура файлов и каталогов

```
Тесты и квизы/
├─ .github/
│  └─ workflows/
│     └─ ci.yml                     # npm ci → db:generate → lint → typecheck → unit → migrate → build → e2e
├─ .env.example                     # шаблон env без секретов (коммитится)
├─ .gitignore                       # .env, .env.local, .env.*.local, !.env.example, node_modules, .next, logs
├─ README.md                        # описание продукта + быстрый старт Sprint 1 + статус
├─ docker-compose.yml               # сервис db: postgres:16-alpine + volume + healthcheck
├─ package.json                     # зависимости, скрипты, фиксированные версии
├─ package-lock.json                # коммитится
├─ tsconfig.json                    # strict, алиас @/*
├─ next.config.ts                   # конфиг Next.js 16 + rewrite /_dev/mailbox
├─ instrumentation.ts               # validateEnv() при старте nodejs-рантайма
├─ proxy.ts                         # security-заголовки, базовая CSP, HSTS в production
├─ postcss.config.mjs               # @tailwindcss/postcss
├─ eslint.config.mjs                # ESLint 9 flat config (по образцу autocard-pro)
├─ prettier.config.mjs              # форматирование
├─ vitest.config.ts                 # node-окружение, алиас @/*
├─ playwright.config.ts             # baseURL localhost:3000, chromium
├─ prisma.config.ts                 # конфиг Prisma 7 (синтаксис — по офиц. документации)
│
├─ prisma/
│  ├─ schema.prisma                 # auth-контур: User, AuthIdentity, EmailToken, Consent + роль
│  └─ migrations/                   # init_auth и далее
│
├─ app/
│  ├─ layout.tsx                    # <html lang="ru">, data-text-size из cookie, шапка/подвал
│  ├─ globals.css                   # Tailwind + @theme-токены + a11y-правила
│  ├─ page.tsx                      # главная-заглушка: заголовок, описание, CTA
│  ├─ tests/page.tsx                # заглушка «Каталог тестов скоро появится»
│  ├─ error.tsx                     # понятная страница ошибки, крупный текст
│  ├─ not-found.tsx                 # 404 с возвратом на главную
│  ├─ login/page.tsx                # вход, «Забыли пароль?», сообщение после verify
│  ├─ register/page.tsx             # «Сохранить результаты»: email + пароль + согласия
│  ├─ forgot-password/page.tsx      # запрос письма для сброса
│  ├─ reset-password/page.tsx       # новый пароль по токену
│  ├─ verify-email/page.tsx         # GET показывает кнопку, POST подтверждает
│  ├─ account/page.tsx              # защищённая заглушка «Мои результаты», no-store
│  ├─ legal/
│  │  ├─ terms/page.tsx             # черновик пользовательского соглашения
│  │  └─ privacy/page.tsx           # черновик политики конфиденциальности
│  ├─ dev/
│  │  └─ mailbox/page.tsx           # просмотр dev-писем; 404 при APP_ENV=production
│  └─ api/
│     ├─ health/route.ts            # 200 / 503, проверка БД
│     └─ v1/
│        └─ auth/
│           ├─ register/route.ts
│           ├─ login/route.ts
│           ├─ logout/route.ts
│           ├─ logout-all/route.ts
│           ├─ verify-email/route.ts
│           ├─ resend-verification/route.ts
│           ├─ forgot-password/route.ts
│           ├─ reset-password/route.ts
│           ├─ change-password/route.ts   # P1
│           └─ me/route.ts
│
├─ components/
│  ├─ layout/
│  │  ├─ SiteHeader.tsx             # логотип, «Тесты», «Мои результаты», вход/выход
│  │  ├─ SiteFooter.tsx             # копирайт, ссылки на /legal/terms и /legal/privacy, контакт
│  │  └─ SkipLink.tsx               # «Перейти к содержанию»
│  ├─ ui/
│  │  ├─ Button.tsx                 # ≥ 56 px, варианты, focus-visible
│  │  ├─ Input.tsx                  # крупное поле с подписью
│  │  ├─ Field.tsx                  # подпись + текст ошибки + aria-describedby
│  │  ├─ Alert.tsx                  # нейтральный / успех / ошибка
│  │  ├─ Card.tsx                   # базовая карточка
│  │  └─ TextSizeSwitch.tsx         # три шага размера текста, cookie text_size
│  └─ auth/
│     ├─ RegisterForm.tsx
│     ├─ LoginForm.tsx
│     ├─ ForgotPasswordForm.tsx
│     ├─ ResetPasswordForm.tsx
│     └─ LogoutButton.tsx
│
├─ lib/
│  ├─ db.ts                         # PrismaClient singleton + @prisma/adapter-pg
│  ├─ env.ts                        # Zod-валидация переменных окружения
│  ├─ http/
│  │  ├─ json.ts                    # ok()/fail() → { error: { code, message }, requestId }
│  │  ├─ origin.ts                  # assertSameOrigin (CSRF)
│  │  ├─ redirect.ts                # safeNext: только внутренний путь
│  │  └─ requestId.ts               # генерация и заголовок x-request-id
│  ├─ auth/
│  │  ├─ authConfig.ts              # AUTH_*, MAIL_*, SMTP_*
│  │  ├─ password.ts                # scrypt hash/verify
│  │  ├─ passwordPolicy.ts          # 8–128, стоп-лист, тексты ошибок
│  │  ├─ passwordStopList.ts        # частые пароли
│  │  ├─ tokens.ts                  # createToken / hashToken / verifyToken
│  │  ├─ session.ts                 # чистые parseSession/signSession/verifySession
│  │  ├─ cookieStore.ts             # адаптер next/headers: set/clear/read cookie
│  │  ├─ rateLimit.ts               # in-memory бакеты по emailNormalized и clientIp
│  │  ├─ identity.ts                # emailNormalized, User + AuthIdentity
│  │  ├─ consent.ts                 # версии документов, записи Consent
│  │  ├─ schemas.ts                 # Zod-схемы запросов и форм
│  │  ├─ mail.ts                    # транспорты log/smtp, шаблоны писем
│  │  └─ currentUser.ts             # getCurrentUser() для server components
│  └─ utils/
│     └─ cn.ts                      # склейка классов
│
├─ emails/                          # шаблоны писем (verify, reset), импортируются из lib/auth/mail.ts
├─ public/
│  └─ fonts/                        # локальные woff2, если Golos Text недоступен в next/font
│
├─ tests/
│  ├─ unit/
│  │  ├─ auth/
│  │  │  ├─ password.test.ts
│  │  │  ├─ tokens.test.ts
│  │  │  ├─ session.test.ts
│  │  │  └─ rateLimit.test.ts
│  │  ├─ http/
│  │  │  ├─ origin.test.ts
│  │  │  └─ redirect.test.ts
│  │  └─ env.test.ts
│  └─ e2e/
│     ├─ auth-register-login.spec.ts
│     ├─ auth-login-errors.spec.ts
│     ├─ auth-guard.spec.ts
│     └─ ui-text-size-accessibility.spec.ts
│
├─ logs/                            # gitignored; dev-mail.log
└─ docs/
   ├─ 01-analogies.md               # существующие документы — НЕ меняются
   ├─ 02-tz.md
   ├─ 03-progress-model.md
   ├─ 04-audience-55plus.md
   └─ sprint-1-notes.md             # журнал решений и расхождений Sprint 1
```

**Сознательно отсутствует в Sprint 1:** `app/api/v1/content/*`, `app/api/v1/attempts/*`, `app/api/v1/me/*` (кроме auth), реальный каталог `app/tests/[slug]/*`, `app/topics/*`, `app/admin/*`, `components/quiz/*`, `lib/quiz/*`, `lib/progress/*`, `lib/content/*`, `Dockerfile` (P2), `sentry.*`, аналитика. Заглушка `app/tests/page.tsx` — только навигационная, без данных.

**Пояснения к ключевым местам:**
- `lib/auth/*` — единственное место, где живёт логика аутентификации; роуты только валидируют вход и вызывают сервис.
- `lib/auth/schemas.ts` переиспользуется и в API, и в формах — одни и те же сообщения об ошибках.
- `components/ui/*` — минимальный кит под 55+, расширяется в Sprint 2–3 (`ProgressBar`, `OptionButton`, `Badge`, `Modal`, `Toast`) без переделки.
- `docs/sprint-1-notes.md` — место для расхождений с ТЗ, чтобы не редактировать утверждённые документы.

---

## 7. Модель данных

### 7.1. Принципы

- **Одна БД — PostgreSQL 16** во всех окружениях. SQLite не используется (см. Приложение A, C11).
- **Prisma 7** + `@prisma/adapter-pg`. Схема — `prisma/schema.prisma`, конфиг CLI — `prisma.config.ts`.
- Идентификаторы — `String @id @default(cuid())` (компактнее uuid, сортируемо по времени).
- Время — `DateTime` в UTC; локальная дата считается по `User.timezone` (IANA), по умолчанию `Europe/Moscow`.
- Денежные/дробные метрики — `Float`, целые счётчики — `Int`, составные — `Json`.
- Внутренние имена (`xp`, `mastery`, `streak`) допустимы в коде и БД; в UI — только «баллы», «освоено», «дней подряд» (`docs/03-progress-model.md`, преамбула).
- Удаление аккаунта — soft delete (`User.deletedAt`) с анонимизацией ПДн; агрегаты сохраняются.
- `createdAt` / `updatedAt` — на всех изменяемых сущностях.
- Правильные ответы никогда не попадают в клиентские ответы API до ответа пользователя (инвариант серверной проверки).

### 7.2. Перечисления

| Enum | Значения | Комментарий |
|---|---|---|
| `UserRole` | `USER`, `EDITOR`, `ADMIN` | В ТЗ роли не описаны явно; вводим минимальный набор. Админки в Sprint 1 нет |
| `IdentityProvider` | `EMAIL`, `VK`, `OK`, `YANDEX`, `TELEGRAM` | В Sprint 1 используется только `EMAIL`; остальные — задел на v1.1 |
| `EmailTokenType` | `VERIFY_EMAIL`, `RESET_PASSWORD`, `CHANGE_EMAIL` | `CHANGE_EMAIL` — Sprint 2 |
| `ConsentType` | `TERMS`, `PRIVACY`, `MARKETING` | Оферта для платежей не нужна: платежей в MVP нет (C20) |
| `ContentStatus` | `DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED` | Контент — Sprint 2 |
| `Difficulty` | `EASY`, `MEDIUM`, `HARD` | — |
| `QuestionType` | `SINGLE_CHOICE`, `TRUE_FALSE`, `IMAGE_SINGLE_CHOICE` | MVP-формат (`docs/02-tz.md`, §4.4); `MULTIPLE_CHOICE` — v1.1. Модель появится в Sprint 2 |
| `AttemptMode` | `CLASSIC`, `DAILY`, `REVIEW`, `EXAM` | `EXAM` — задел, в MVP может не использоваться |
| `AttemptStatus` | `IN_PROGRESS`, `COMPLETED`, `ABANDONED` | — |
| `ReportStatus` | `NEW`, `REVIEWED`, `FIXED`, `REJECTED` | Жалобы на вопросы |

### 7.3. Модели

#### `User`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | `cuid()` |
| `email` | String | да | Как ввёл пользователь (для писем) |
| `emailNormalized` | String | да | `trim().toLowerCase()` — источник истины, **unique** |
| `passwordHash` | String? | нет | `scrypt$v$N$r$p$salt$hash`; null для будущих OAuth-аккаунтов |
| `name` | String? | нет | Отображаемое имя |
| `avatarUrl` | String? | нет | S3 — позже |
| `role` | UserRole | да | По умолчанию `USER` |
| `isGuest` | Boolean | да | По умолчанию `false`; задел на гостевой режим |
| `emailVerifiedAt` | DateTime? | нет | null = email не подтверждён |
| `sessionEpoch` | Int | да | По умолчанию `0`; инкремент инвалидирует все сессии |
| `timezone` | String | да | IANA, по умолчанию `Europe/Moscow`; источник истины по времени (C3) |
| `failedLoginCount` | Int | да | Сбрасывается при успешном входе |
| `lockedUntil` | DateTime? | нет | Блокировка после 5 неудач на 15 минут |
| `lastLoginAt` | DateTime? | нет | — |
| `createdAt` | DateTime | да | — |
| `updatedAt` | DateTime | да | — |
| `deletedAt` | DateTime? | нет | Soft delete + анонимизация |

Отношения: `attempts`, `questionProgress`, `topicProgress`, `stats` (1—1), `diplomas`, `achievements`, `consents`, `tokens`, `identities`, `dailyActivity`, `reports`.

#### `AuthIdentity`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `userId` | String | да | FK → `User`, `onDelete: Cascade` |
| `provider` | IdentityProvider | да | В Sprint 1 — `EMAIL` |
| `providerAccountId` | String | да | Для `EMAIL` — `emailNormalized` |
| `email` | String? | нет | Для OAuth |
| `createdAt` | DateTime | да | — |
| `lastUsedAt` | DateTime? | нет | — |

Уникальность: `(provider, providerAccountId)`.

#### `EmailToken`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `userId` | String | да | FK → `User`, Cascade |
| `type` | EmailTokenType | да | — |
| `tokenHash` | String | да | sha256 от 32 случайных байт, **unique** |
| `expiresAt` | DateTime | да | verify — 24 ч, reset — 1 ч (C9) |
| `usedAt` | DateTime? | нет | Одноразовость |
| `createdAt` | DateTime | да | — |
| `requestedIp` | String? | нет | Для разбора инцидентов; не для UI |

Индексы: `(userId, type)`, `(expiresAt)`.

#### `Consent`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `userId` | String? | нет | null допустим для cookie-consent до регистрации |
| `type` | ConsentType | да | — |
| `version` | String | да | Версия документа из env (`LEGAL_TERMS_VERSION`) |
| `accepted` | Boolean | да | Фиксируем и отказ от маркетинга |
| `ip` | String? | нет | — |
| `userAgent` | String? | нет | — |
| `createdAt` | DateTime | да | — |

Индекс: `(userId, type, version)`.

#### `Category`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `slug` | String | да | **unique** |
| `title` | String | да | — |
| `order` | Int | да | Сортировка в каталоге |
| `createdAt` / `updatedAt` | DateTime | да | — |

#### `Topic`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `categoryId` | String | да | FK → `Category` |
| `slug` | String | да | **unique** |
| `title` | String | да | — |
| `description` | String? | нет | — |
| `coverUrl` | String? | нет | — |
| `difficulty` | Difficulty | да | — |
| `status` | ContentStatus | да | По умолчанию `DRAFT` |
| `order` | Int | да | — |
| `publishedAt` | DateTime? | нет | — |
| `createdAt` / `updatedAt` | DateTime | да | — |

Индекс: `(categoryId, status, order)`.

#### `Question`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `topicId` | String | да | FK → `Topic` |
| `type` | QuestionType | да | — |
| `text` | String | да | — |
| `explanation` | String? | нет | Показывается после ответа |
| `imageUrl` | String? | нет | Sprint 3+ |
| `imageLicense` | String? | нет | Обязательно при наличии изображения |
| `difficulty` | Difficulty | да | — |
| `status` | ContentStatus | да | — |
| `contentHash` | String | да | Для дедупликации при импорте |
| `version` | Int | да | По умолчанию `1`; растёт при правке текста/ответов |
| `publishedAt` | DateTime? | нет | — |
| `createdAt` / `updatedAt` | DateTime | да | — |

Индексы: `(topicId, status)`, `(contentHash)`.

#### `QuestionOption`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `questionId` | String | да | FK → `Question`, Cascade |
| `text` | String | да | — |
| `isCorrect` | Boolean | да | Никогда не отдаётся клиенту до ответа |
| `order` | Int | да | — |

Уникальность: `(questionId, order)`.

#### `Quiz`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `topicId` | String | да | FK → `Topic` |
| `slug` | String | да | **unique** |
| `title` | String | да | — |
| `description` | String? | нет | — |
| `intro` | String? | нет | Текст перед стартом |
| `outro` | String? | нет | Текст после завершения |
| `passThreshold` | Int | да | Процент для «тест пройден» |
| `status` | ContentStatus | да | — |
| `coverUrl` | String? | нет | — |
| `publishedAt` | DateTime? | нет | — |
| `createdAt` / `updatedAt` | DateTime | да | — |

#### `QuizQuestion`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `quizId` | String | да | Составной PK |
| `questionId` | String | да | Составной PK |
| `order` | Int | да | Уникален внутри выпуска |
| `points` | Int | да | По умолчанию `1`; баллы считает сервер |

Уникальность: `(quizId, questionId)`, `(quizId, order)`.

#### `Attempt`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `userId` | String | да | FK → `User` |
| `quizId` | String | да | FK → `Quiz` |
| `mode` | AttemptMode | да | — |
| `status` | AttemptStatus | да | По умолчанию `IN_PROGRESS` |
| `startedAt` | DateTime | да | **Индексируется** (C5) |
| `finishedAt` | DateTime? | нет | — |
| `score` | Int? | нет | Баллы за попытку |
| `maxScore` | Int? | нет | — |
| `correctCount` | Int | да | По умолчанию `0` |
| `totalCount` | Int | да | Снимок числа вопросов |
| `durationSec` | Int? | нет | Не показываем как давление |
| `guestToken` | String? | нет | Задел под гостевой режим |
| `idempotencyKey` | String? | нет | **unique**; защита от дублей старта/финиша |
| `createdAt` | DateTime | да | — |

Индексы: `(userId, startedAt)`, `(quizId, startedAt)`, `(status)`, `(userId, status)`.

#### `AttemptAnswer`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `attemptId` | String | да | FK → `Attempt`, Cascade |
| `questionId` | String | да | FK → `Question` |
| `selectedOptionIds` | Json | да | Массив id выбранных вариантов |
| `isCorrect` | Boolean | да | Считается только на сервере |
| `responseMs` | Int? | нет | Для аналитики, не для рейтинга |
| `questionVersion` | Int | да | Снимок версии вопроса |
| `order` | Int | да | Порядок в попытке |
| `answeredAt` | DateTime | да | — |

Уникальность: `(attemptId, questionId)` — повторный ответ идемпотентен и возвращает тот же результат.

Индексы: `(attemptId)`, `(questionId)`.

#### `QuestionProgress`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `userId` | String | да | Составной PK |
| `questionId` | String | да | Составной PK |
| `seenCount` | Int | да | — |
| `correctCount` | Int | да | — |
| `wrongCount` | Int | да | — |
| `correctStreak` | Int | да | Подряд верных ответов (C4) |
| `attemptsWithCorrect` | Int | да | В скольких попытках был верный ответ (C4) |
| `masteryLevel` | Int | да | 0–5 |
| `lastResult` | Boolean? | нет | — |
| `lastSeenAt` | DateTime | да | Нужен для правила «интервал ≥ 7 дней» |
| `nextReviewAt` | DateTime? | нет | Очередь повторения |
| `updatedAt` | DateTime | да | — |

Индексы: `(userId, questionId)` unique, `(userId, nextReviewAt)`, `(userId, masteryLevel)`.

#### `TopicProgress`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `userId` | String | да | Составной PK |
| `topicId` | String | да | Составной PK |
| `totalQuestions` | Int | да | Снимок на момент пересчёта |
| `seenQuestions` | Int | да | — |
| `masteredQuestions` | Int | да | mastery ≥ 4 |
| `answeredCount` | Int | да | — |
| `correctCount` | Int | да | — |
| `masteryPoints` | Int | да | Сумма mastery |
| `progress` | Float | да | 0–100 |
| `coverage` | Float | да | 0–100 |
| `quality` | Float | да | 0–100 |
| `accuracy` | Float | да | 0–100 |
| `level` | Int | да | 0–5 |
| `lastActivityAt` | DateTime | да | — |
| `updatedAt` | DateTime | да | — |

Уникальность: `(userId, topicId)`.

#### `UserStats`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `userId` | String | да | **unique**, PK |
| `xp` | Int | да | В UI — «баллы» |
| `level` | Int | да | «Уровень знатока» |
| `totalAttempts` | Int | да | — |
| `completedAttempts` | Int | да | — |
| `totalAnswered` | Int | да | — |
| `totalCorrect` | Int | да | — |
| `dailyStreak` | Int | да | «Дней подряд» |
| `longestStreak` | Int | да | — |
| `lastActiveDate` | DateTime? | нет | Локальная дата пользователя |
| `updatedAt` | DateTime | да | — |

`timezone` в `UserStats` **не хранится** — единственный источник `User.timezone` (C3).

#### `DailyActivity`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `userId` | String | да | Составной PK |
| `date` | DateTime | да | Локальная дата (00:00) |
| `xp` | Int | да | — |
| `attempts` | Int | да | — |
| `correct` | Int | да | — |

Уникальность: `(userId, date)`.

#### `Achievement`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `code` | String | да | **unique**, например `first_quiz` |
| `title` | String | да | «Первый шаг» |
| `description` | String | да | — |
| `icon` | String | да | Имя иконки из дизайн-системы |
| `condition` | Json | да | Декларативное условие проверки |
| `points` | Int | да | 20–100 |
| `isActive` | Boolean | да | — |

#### `UserAchievement`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `userId` | String | да | Составной PK |
| `achievementId` | String | да | Составной PK |
| `unlockedAt` | DateTime | да | — |

#### `Diploma`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `userId` | String | да | FK → `User` |
| `topicId` | String | да | FK → `Topic` |
| `level` | Int | да | 3 или 5 |
| `score` | Float | да | `progress` на момент выдачи |
| `publicId` | String | да | **unique**, для `/diploma/[publicId]` |
| `issuedAt` | DateTime | да | — |
| `revokedAt` | DateTime? | нет | При удалении аккаунта или ошибке |

Уникальность: `(userId, topicId, level)`.

#### `ContentReport`

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `questionId` | String | да | FK → `Question` |
| `userId` | String? | нет | Жалоба может быть от гостя |
| `reason` | String | да | Код причины |
| `comment` | String? | нет | — |
| `status` | ReportStatus | да | По умолчанию `NEW` |
| `createdAt` / `resolvedAt` | DateTime? | — | — |

#### `Event` (опционально)

| Поле | Тип | Обяз. | Комментарий |
|---|---|---|---|
| `id` | String | да | — |
| `userId` | String? | нет | — |
| `type` | String | да | `attempt_started`, `attempt_finished`, … |
| `payload` | Json | да | Без ПДн |
| `createdAt` | DateTime | да | Индекс `(type, createdAt)` |

### 7.4. Индексы и ограничения (сводно)

| Таблица | Ограничение/индекс | Зачем |
|---|---|---|
| `User` | `emailNormalized` unique | Вход, отсутствие дублей |
| `AuthIdentity` | `(provider, providerAccountId)` unique | Один вход на провайдера |
| `EmailToken` | `tokenHash` unique; `(userId, type)`; `(expiresAt)` | Поиск токена, очистка |
| `Topic` / `Quiz` | `slug` unique | ЧПУ и SEO |
| `Question` | `(topicId, status)`; `contentHash` | Выборка опубликованных, дедупликация |
| `Attempt` | `(userId, startedAt)`; `(quizId, startedAt)`; `(status)`; `idempotencyKey` unique | История, resume, идемпотентность |
| `AttemptAnswer` | `(attemptId, questionId)` unique | Защита от двойного ответа |
| `QuestionProgress` | `(userId, questionId)` unique; `(userId, nextReviewAt)` | Очередь повторения |
| `TopicProgress` | `(userId, topicId)` unique | Одна запись на тему |
| `DailyActivity` | `(userId, date)` unique | Heatmap и серия |
| `UserAchievement` | `(userId, achievementId)` unique | Без дублей наград |
| `Diploma` | `(userId, topicId, level)` unique; `publicId` unique | Без повторной выдачи |

### 7.5. Инварианты

1. `masteryLevel ∈ [0, 5]`, `progress/coverage/quality/accuracy ∈ [0, 100]`, `xp ≥ 0`.
2. `UserStats` — ровно одна запись на пользователя; создаётся в транзакции регистрации **начиная со Sprint 4**, когда модель появляется в схеме. В Sprint 1 таблицы `UserStats` нет.
3. `User.sessionEpoch` только растёт; сравнение cookie-значения с БД — при каждом запросе.
4. `AttemptAnswer.isCorrect` вычисляется на сервере; клиент не может его передать.
5. `selectedOptionIds` валидируются: все id принадлежат вопросу, количество соответствует типу вопроса.
6. `Attempt.status = COMPLETED` — терминальный; повторный `finish` идемпотентен и возвращает тот же результат.
7. `EmailToken` одноразовый: `usedAt` выставляется в той же транзакции, что и целевое действие.
8. `UserStats.lastActiveDate` и `DailyActivity.date` — локальная дата по `User.timezone`, не UTC.
9. Все ПДн-поля (`email`, `ip`, `userAgent`) не попадают в прикладные логи и в аналитические события. Исключение — dev-файл `logs/dev-mail.log` при `APP_ENV != production` (см. §4.6), который является локальным почтовым ящиком, gitignored и не содержит паролей и хешей.
10. Контент нельзя опубликовать без `QuestionOption` с `isCorrect=true` (проверка на уровне сервиса; в Sprint 2).

### 7.6. Политика хранения

| Данные | Срок | Механизм |
|---|---|---|
| Гостевые аккаунты (`isGuest=true`, нет попыток 30 дней) | 30 дней | Плановая очистка (Sprint 2+) |
| `EmailToken` истёкшие | 7 дней после `expiresAt` | Очистка по cron |
| Логи приложения | 90 дней | Ротация |
| Сырые аналитические события | 12 месяцев | Агрегация |
| Агрегаты прогресса после удаления аккаунта | Бессрочно, обезличенно | Анонимизация при `deletedAt` |
| Бэкапы PostgreSQL | 14–30 дней | Ежедневно (вне Sprint 1) |

Удаление аккаунта: `deletedAt` + замена `email`/`emailNormalized`/`name` на заглушки, обнуление `passwordHash`, удаление `AuthIdentity`, `EmailToken`, `Consent` (кроме юридически значимых — по решению юриста), инкремент `sessionEpoch`.

### 7.7. Что создаётся в каком спринте

| Группа моделей | Спринт |
|---|---|
| `User`, `AuthIdentity`, `EmailToken`, `Consent` | **1** |
| `Category`, `Topic`, `Question`, `QuestionOption`, `Quiz`, `QuizQuestion` | 2 |
| `Attempt`, `AttemptAnswer` | 3 |
| `QuestionProgress`, `TopicProgress`, `UserStats`, `DailyActivity`, `Achievement`, `UserAchievement`, `Diploma` | 4–5 |
| `ContentReport`, `Event` | 5 |

В Sprint 1 в `schema.prisma` присутствуют только модели первой строки и перечисления, которые им нужны. Остальные добавляются отдельными миграциями — без «пустых» таблиц заранее.

---

## 8. API

### 8.1. Общие правила

| Правило | Значение |
|---|---|
| База | `/api/v1` |
| Формат | JSON, `Content-Type: application/json; charset=utf-8` |
| Аутентификация | Cookie `quiz_user_id` (httpOnly, SameSite=Lax, Secure в prod, 30 дней) |
| CSRF | `SameSite=Lax` + `assertSameOrigin` для всех POST/PATCH/DELETE |
| Формат ошибки | `{ "error": { "code": "string", "message": "string", "details"?: {} }, "requestId": "string" }` |
| Формат успеха | `{ "data": { … } }` |
| `X-Request-Id` | Принимается из заголовка или генерируется; возвращается всегда |
| Идемпотентность | `Idempotency-Key` для `POST /attempts`, `/attempts/:id/finish`, `/auth/register` (опционально) |
| Пагинация | cursor: `?cursor=…&limit=20`, `limit` ≤ 50 |
| Версионирование | Новое несовместимое поведение → `/api/v2` |
| Язык сообщений | Русский, без технического жаргона; коды — латиницей |
| Кэш | `GET` публичного контента — `Cache-Control: public, s-maxage=…`; приватные, auth-ответы и защищённые страницы — `Cache-Control: no-store, private` |
| Служебный health | `/api/health` — единственный роут вне конверта `{data}`/`{error}`: тело `{status, db}` |

### 8.2. Служебные

| Метод | Путь | Доступ | Ответ | Спринт |
|---|---|---|---|---|
| `GET` | `/api/health` | публичный | `200 {status:"ok", db:"up"}` / `503 {status:"degraded", db:"down"}` | 1 |

### 8.3. Auth

> Все пути ниже — относительно `/api/v1/auth`. Реализация: `app/api/v1/auth/<action>/route.ts`, логика — `lib/auth/*`.

#### `POST /register`

Запрос:
```json
{
  "email": "user@example.com",
  "password": "минимально 8 символов",
  "acceptedTerms": true,
  "acceptedPrivacy": true,
  "marketingOptIn": false,
  "timezone": "Europe/Moscow"
}
```

Ответ: `202 { "data": { "status": "verification_sent" } }` — **всегда**, независимо от того, существует ли email (защита от перечисления).

Ошибки: `400 validation_error`, `429 rate_limited`, `503 db_unavailable`.

Побочные эффекты: создаётся `User` (`role=USER`, `isGuest=false`, `emailVerifiedAt=null`), `AuthIdentity(EMAIL)`, три записи `Consent`: `TERMS` и `PRIVACY` с `accepted=true`, `MARKETING` с `accepted=marketingOptIn` (отказ тоже фиксируется), токен `VERIFY_EMAIL`, письмо.

#### `POST /login`

Запрос: `{ "email": "...", "password": "..." }`

Ответ: `200 { "data": { "user": { "id", "email", "name", "role" } } }` + `Set-Cookie: quiz_user_id=…`

Ошибки:

| Код | HTTP | Когда |
|---|---|---|
| `invalid_credentials` | 401 | Неверный пароль **или** несуществующий email — одинаковый текст: «Не удалось войти. Проверьте почту и пароль». Возвращается и при заблокированном аккаунте, если пароль неверный |
| `email_not_verified` | 403 | Пароль верный, email не подтверждён. В `details.canResend = true` |
| `account_locked` | 423 | Пароль верный, но `lockedUntil > now`. В `details.retryAfterSec`. Проверяется только после верного пароля, чтобы не раскрывать существование аккаунта |
| `rate_limited` | 429 | Лимит по IP/email. Проверяется до пароля и имеет приоритет над `423` и `401` |
| `db_unavailable` | 503 | БД недоступна |

`login` всегда выполняет scrypt: для несуществующего email — против `DUMMY_HASH`. Это выравнивает время ответа. При неверном пароле ответ `401 invalid_credentials`, даже если аккаунт заблокирован — **кроме** случая, когда запрос отсечён rate-limit (`429`); `429` проверяется до пароля и имеет приоритет.

Порядок проверок в `login`: rate-limit по IP → rate-limit по `emailNormalized` → scrypt → состояние аккаунта. Лимит по email намеренно выше числа попыток блокировки (`AUTH_RL_LOGIN_PER_EMAIL_15M=10` против `AUTH_MAX_FAILED_ATTEMPTS=5`), иначе 6-я попытка всегда получала бы `429` и сценарий `423` был бы недостижим.

#### `POST /logout`

Без тела. Ответ: `204`, cookie очищается. Идемпотентно.

#### `POST /logout-all`

Требует сессии. Инкремент `sessionEpoch`, очистка cookie. Ответ: `204`.

#### `POST /verify-email`

Запрос: `{ "token": "..." }`

Ответ: `200 { "data": { "status": "verified" } }`. При `application/x-www-form-urlencoded` (POST-форма без JS) — redirect на `/login?verified=1`.

Ошибки: `400 token_invalid`, `410 token_expired` (в `details.canResend=true`).

Поведение: GET-страница `/verify-email?token=…` только показывает кнопку «Подтвердить почту» и **не** расходует токен (защита от предзагрузки почтовым клиентом). Подтверждение выполняет POST. По умолчанию сессия не создаётся: после успеха — `/login?verified=1` без email в query. При `AUTH_LOGIN_AFTER_VERIFY=true` — сразу `Set-Cookie`.

#### `POST /resend-verification`

Запрос: `{ "email": "..." }` → `202 { "data": { "status": "sent" } }` всегда.

Ошибки: `429 rate_limited`, `503 db_unavailable`.

#### `POST /forgot-password`

Запрос: `{ "email": "..." }` → `202 { "data": { "status": "sent" } }` всегда.

#### `POST /reset-password`

Запрос: `{ "token": "...", "password": "..." }` → `200 { "data": { "status": "password_changed" } }`.

Побочные эффекты: обновление `passwordHash`, `sessionEpoch += 1`, `usedAt` у токена, сброс `failedLoginCount`/`lockedUntil`.

Ошибки: `400 token_invalid`, `400 validation_error`, `410 token_expired`.

#### `POST /change-password` (P1)

Требует сессии. Запрос: `{ "currentPassword": "...", "newPassword": "..." }` → `200`, `sessionEpoch += 1`, текущая cookie перевыпускается.

Ошибки: `401 unauthorized`, `401 invalid_credentials`, `400 validation_error`.

#### `GET /me`

Ответ: `200 { "data": { "id", "email", "name", "role", "emailVerified": true, "timezone": "Europe/Moscow" } }` или `401 unauthorized`.

### 8.4. Контент (Sprint 2, контракты фиксируются заранее)

| Метод | Путь | Назначение | Спринт |
|---|---|---|---|
| `GET` | `/api/v1/topics` | Каталог тем, пагинация, прогресс при наличии сессии | 2 |
| `GET` | `/api/v1/topics/:slug` | Тема + выпуски + прогресс | 2 |
| `GET` | `/api/v1/quizzes/:slug` | Выпуск + метаданные, **без ответов** | 2–3 |
| `GET` | `/api/v1/quizzes/:slug/preview` | Превью вопросов без ответов (SEO) | 3 |

Правило: в ответах контента нет `isCorrect` и `explanation` до ответа пользователя.

### 8.5. Попытки (Sprint 3)

| Метод | Путь | Тело | Ответ |
|---|---|---|---|
| `POST` | `/api/v1/attempts` | `{ quizId, mode }` | `201 { attemptId, questions[] }` |
| `POST` | `/api/v1/attempts/:id/answers` | `{ questionId, optionIds[], idempotencyKey }` | `{ isCorrect, correctOptionIds, explanation, points }` |
| `POST` | `/api/v1/attempts/:id/finish` | `{}` | `{ result, points, progress, achievements }` |
| `POST` | `/api/v1/attempts/:id/abandon` | `{}` | `204` |
| `GET` | `/api/v1/attempts/:id` | — | Состояние для продолжения |
| `GET` | `/api/v1/attempts/:id/result` | — | Результат для страницы |
| `POST` | `/api/v1/daily/start` | `{}` | «Тест дня» |
| `POST` | `/api/v1/review/start` | `{ topicId? }` | Повторение ошибок |

### 8.6. Пользователь (Sprint 4–5)

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/api/v1/me` | Профиль и настройки |
| `PATCH` | `/api/v1/me` | Имя, аватар, timezone, настройки |
| `GET` | `/api/v1/me/stats` | Баллы, уровень знатока, серия |
| `GET` | `/api/v1/me/topics` | Прогресс по темам |
| `GET` | `/api/v1/me/topics/:slug` | Детальный прогресс темы |
| `GET` | `/api/v1/me/history` | История попыток (cursor) |
| `GET` | `/api/v1/me/weak-questions` | Слабые вопросы / очередь повторения |
| `GET` | `/api/v1/me/achievements` | Награды |
| `GET` | `/api/v1/me/diplomas` | Дипломы |
| `POST` | `/api/v1/me/claim-guest` | Перенос гостевого прогресса |
| `DELETE` | `/api/v1/me` | Удаление/анонимизация |

### 8.7. Админка (Sprint 2+)

`/api/v1/admin/topics`, `questions`, `quizzes`, `import`, `users`, `analytics`, `reports`. Все — `requireEditor`/`requireAdmin`, аудит действий. В Sprint 1 не реализуется.

### 8.8. Каталог кодов ошибок

| Код | HTTP | Значение |
|---|---|---|
| `validation_error` | 400 | Не прошла Zod-валидация; `details.fields` |
| `invalid_credentials` | 401 | Неверная пара email/пароль |
| `unauthorized` | 401 | Нет или недействительна сессия |
| `token_invalid` | 400 | Токен не найден или уже использован |
| `token_expired` | 410 | Токен истёк |
| `email_not_verified` | 403 | Требуется подтверждение почты |
| `forbidden` | 403 | Недостаточно прав |
| `origin_mismatch` | 403 | CSRF-проверка не пройдена |
| `not_found` | 404 | Ресурс не найден |
| `method_not_allowed` | 405 | Неподдерживаемый метод |
| `conflict` | 409 | Конфликт состояния |
| `payload_too_large` | 413 | Слишком большое тело |
| `account_locked` | 423 | Временная блокировка входа |
| `rate_limited` | 429 | Превышен лимит запросов |
| `db_unavailable` | 503 | БД недоступна |
| `internal_error` | 500 | Непредвиденная ошибка (без деталей наружу) |

### 8.9. Заголовки и cookie

| Имя | Направление | Правила |
|---|---|---|
| `quiz_user_id` | Set-Cookie / Cookie | `<userId>:<sessionEpoch>` + HMAC-подпись; `HttpOnly`, `SameSite=Lax`, `Secure` в prod, `Path=/`, `Max-Age=2592000` |
| `text_size` | Set-Cookie / Cookie | `s`/`m`/`l`; **не** HttpOnly (читается и пишется UI), `SameSite=Lax` |
| `X-Request-Id` | оба | Сквозной идентификатор запроса |
| `Idempotency-Key` | запрос | Для мутаций, где важна повторяемость |
| `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | ответ | Выставляются в `proxy.ts` |

### 8.10. Ограничения частоты (стартовые значения, настраиваются)

| Операция | Лимит |
|---|---|
| `register` | 5/час на IP, 3/час на email |
| `login` | 10/15 мин на IP, 10/15 мин на email; блокировка аккаунта наступает после 5 неудач и проверяется отдельно. Лимит по email выше порога блокировки, чтобы `401`/`423` были достижимы, а `429` оставался защитой от перебора |
| `resend-verification` | 3/час на email, 10/час на IP |
| `forgot-password` | 3/час на email, 10/час на IP |
| `reset-password` | 5/час на IP |
| `change-password` | 5/час на пользователя |

Реализация Sprint 1 — in-memory; при переходе на несколько инстансов — Redis (вне спринта).

---

## 9. Acceptance criteria

Формат: проверяемое утверждение. `[S1]` — обязательное для Sprint 1, `[S1-P1]` — желательное, `[later]` — фиксируется как контракт на будущее.

### 9.1. Инфраструктура и каркас

| ID | Критерий |
|---|---|
| AC-INF-01 `[S1]` | `npm install && npm run dev` на чистой машине поднимает приложение на `http://localhost:3000` без ошибок в консоли. |
| AC-INF-02 `[S1]` | `npm run build` завершается успешно; `npm run start` отдаёт главную страницу. |
| AC-INF-03 `[S1]` | `npm run lint` и `npm run typecheck` проходят без ошибок. TypeScript работает в режиме `strict`. |
| AC-INF-04 `[S1]` | `docker compose up -d --wait db` поднимает PostgreSQL 16; `docker compose ps` показывает `healthy`. |
| AC-INF-05 `[S1]` | `npm run db:deploy` применяет миграции на пустой БД без ручных действий. |
| AC-INF-06 `[S1]` | `GET /api/health` возвращает `200` при доступной БД и `503` при остановленной, с телом `{status, db}`. |
| AC-INF-07 `[S1]` | При отсутствии `DATABASE_URL` или `AUTH_SECRET` приложение не стартует и печатает понятное сообщение с именем переменной. |
| AC-INF-08 `[S1]` | В репозитории нет `.env`, `.env.local`, `.env.*.local`; есть закоммиченный `.env.example` без реальных значений; `logs/` в `.gitignore`, `.env.example` не игнорируется. |

### 9.2. Регистрация и подтверждение email

| ID | Критерий |
|---|---|
| AC-AUTH-01 `[S1]` | Регистрация с валидными email/паролем и двумя обязательными согласиями создаёт пользователя, `AuthIdentity(EMAIL)`, три записи `Consent` (`TERMS`/`PRIVACY` — приняты, `MARKETING` — `accepted=marketingOptIn`) и токен `VERIFY_EMAIL`. |
| AC-AUTH-02 `[S1]` | Повторная регистрация на существующий email возвращает тот же `202` и тот же текст, что и первая; нового пользователя не создаёт; письмо не раскрывает факт существования аккаунта. |
| AC-AUTH-03 `[S1]` | Пароль короче 8 символов или из стоп-листа отклоняется с `400 validation_error` и текстом, объясняющим правило. |
| AC-AUTH-04 `[S1]` | Отсутствие любого обязательного согласия → `400`; запись `Consent` не создаётся. |
| AC-AUTH-05 `[S1]` | Ссылка из письма открывает `/verify-email?token=…`; GET только показывает кнопку и не меняет `usedAt`; после POST-подтверждения `emailVerifiedAt` заполнен, токен помечен использованным. |
| AC-AUTH-06 `[S1]` | Повторный POST с тем же токеном → `400 token_invalid`; истёкший токен → `410 token_expired` с предложением отправить письмо снова. |
| AC-AUTH-07 `[S1]` | По умолчанию после подтверждения сессия **не** создаётся: пользователь попадает на `/login?verified=1` без email в query и видит сообщение «Почта подтверждена». При `AUTH_LOGIN_AFTER_VERIFY=true` сессия создаётся сразу. |
| AC-AUTH-08 `[S1]` | `resend-verification` для несуществующего email возвращает тот же `202`, что и для существующего. |
| AC-AUTH-09 `[S1]` | Письмо подтверждения содержит рабочую ссылку, тему и одну крупную кнопку; в dev-режиме письмо доступно на `/_dev/mailbox` и в `logs/dev-mail.log` после `dev` и после `build && start`. |

### 9.3. Вход, выход, сессия

| ID | Критерий |
|---|---|
| AC-AUTH-10 `[S1]` | Вход с верными данными и подтверждённым email выставляет cookie `quiz_user_id` с `HttpOnly`, `SameSite=Lax`, сроком из `AUTH_SESSION_TTL_DAYS` (30 дней по умолчанию) и редиректит на `next` или `/account`. |
| AC-AUTH-11 `[S1]` | Вход с неверным паролем и вход с несуществующим email дают идентичный ответ: `401 invalid_credentials`, одинаковый текст. Время ответа выравнивается dummy-scrypt: 20 замеров `verifyPassword`/`DUMMY_HASH` на уровне функции (или через API с отключённым rate-limit), разница p50 ≤ 20 мс. |
| AC-AUTH-12 `[S1]` | Вход с верным паролем, но неподтверждённым email → `403 email_not_verified`, состояние аккаунта не раскрывается до проверки пароля. |
| AC-AUTH-13 `[S1]` | Порядок проверок в `login`: rate-limit → scrypt → блокировка. Сценарий: 5 неверных паролей → 6-я попытка с неверным паролем = `401 invalid_credentials`; 6-я попытка с **верным** паролем = `423 account_locked` с `retryAfterSec`; после 15 минут верный пароль = `200`, счётчик неудач сброшен. При исчерпании rate-limit (11-я попытка в окне) — `429` с `Retry-After`, и он имеет приоритет над `401`/`423`. |
| AC-AUTH-14 `[S1]` | `POST /logout` очищает cookie и делает `/account` недоступным. |
| AC-AUTH-15 `[S1]` | `POST /logout-all` инкрементирует `sessionEpoch`; все ранее выданные cookie становятся недействительными. |
| AC-AUTH-16 `[S1]` | `GET /api/v1/auth/me` возвращает профиль при валидной cookie и `401` без неё. |
| AC-AUTH-17 `[S1]` | Подделанная cookie (неверная подпись или чужой `sessionEpoch`) отклоняется как `401`; в БД ничего не меняется. |

### 9.4. Сброс пароля

| ID | Критерий |
|---|---|
| AC-AUTH-18 `[S1]` | `forgot-password` для существующего email создаёт токен и письмо; для несуществующего — тот же `202` без письма. |
| AC-AUTH-19 `[S1]` | `reset-password` с валидным токеном меняет пароль, инкрементирует `sessionEpoch`, токен становится неиспользованным повторно. |
| AC-AUTH-20 `[S1]` | После сброса пароля старый пароль не работает, новый работает; все прежние сессии недействительны. |
| AC-AUTH-21 `[S1]` | Ссылка сброса действует 1 час; после истечения — `410 token_expired`. |
| AC-AUTH-22 `[S1-P1]` | `change-password` требует текущий пароль, меняет его, инкрементирует `sessionEpoch` и перевыпускает cookie. |

### 9.5. Безопасность

| ID | Критерий |
|---|---|
| AC-SEC-01 `[S1]` | Все POST-роуты auth отклоняют запрос с чужим или отсутствующим `Origin` при наличии заголовка → `403 origin_mismatch`. |
| AC-SEC-02 `[S1]` | Пароли хранятся только как scrypt-хеш; в БД и ответах API нет открытых паролей и токенов. В прикладных логах нет токенов, хешей и полных email. Исключение — dev-файл `logs/dev-mail.log` при `APP_ENV != production`: он содержит письмо с токеном и email, gitignored, паролей и хешей не содержит. |
| AC-SEC-03 `[S1]` | В БД хранится только sha256-хеш токена; сырой токен существует только в письме. |
| AC-SEC-04 `[S1]` | Превышение лимитов даёт `429 rate_limited` с `Retry-After`; лимиты раздельные по операциям, email и IP. |
| AC-SEC-05 `[S1]` | Ответы API не содержат stack trace, SQL и имён внутренних полей; `internal_error` — без деталей. |
| AC-SEC-06 `[S1]` | `MAIL_TRANSPORT=log` при `APP_ENV=production` приводит к отказу старта с явной ошибкой. При `APP_ENV=local` и `APP_ENV=test` запуск разрешён. |
| AC-SEC-07 `[S1]` | В dev `/_dev/mailbox` открывается (200) и показывает письмо, созданное после запуска сервера — проверяется и на `npm run dev`, и на `npm run build && npm run start` с `APP_ENV=test`. При `APP_ENV=production` — 404. Страница динамическая (`force-dynamic`), не отдаёт закэшированный 404. |
| AC-SEC-08 `[S1]` | `next` при редиректе после входа принимается только как внутренний путь. Тест-кейсы: `/account` — ок; `//evil.com`, `https://evil.com`, `/\evil.com`, `javascript:alert(1)` — отбрасываются. |
| AC-SEC-09 `[S1]` | В прикладных логах (stdout/файлы приложения) нет `email`, `ip`, `userAgent` в открытом виде на уровне info; email не передаётся в query-строке; ошибки логируются с `requestId`. Проверяется отдельно от dev-файла `logs/dev-mail.log`, который является почтовым ящиком, а не логом приложения. |

### 9.6. Интерфейс и доступность

| ID | Критерий |
|---|---|
| AC-UI-01 `[S1]` | Базовый размер основного текста — 18 px; переключатель даёт 18 / 20 / 22 px и сохраняется после перезагрузки и между сессиями. |
| AC-UI-02 `[S1]` | Кнопки и основные действия имеют высоту ≥ 56 px; любые тап-зоны — ≥ 48×48 px; inline-текстовые ссылки — исключение с увеличенным line-height и отступами; у всех интерактивных элементов видимый `focus-visible`. |
| AC-UI-03 `[S1]` | Навигация доступна без burger-меню и выпадающих списков; все пункты видны на ширине от 360 px. |
| AC-UI-04 `[S1]` | Skip-link «Перейти к содержанию» — первый элемент в Tab-порядке на каждой странице. |
| AC-UI-05 `[S1]` | Контраст основного текста к фону ≥ 7:1, второстепенного — ≥ 4.5:1. |
| AC-UI-06 `[S1]` | Формы доступны с клавиатуры; ошибки связаны с полем через `aria-describedby` и зачитываются скринридером. |
| AC-UI-07 `[S1]` | В UI нет слов «квиз», «XP», «mastery», «streak», «лидерборд»; используются «тест», «баллы», «освоено», «дней подряд», «Мои результаты». |
| AC-UI-08 `[S1]` | Кнопка регистрации подписана «Сохранить результаты»; экран не называется «Регистрация» в пользовательских текстах. |
| AC-UI-09 `[S1]` | При `prefers-reduced-motion: reduce` анимации и переходы отключены. |
| AC-UI-10 `[S1]` | Страницы `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/account` имеют заголовок первого уровня и осмысленный `<title>`. Без JS страницы читаются, навигация работает, verify-email подтверждается обычной POST-формой; остальные формы требуют JS — ограничение зафиксировано в `docs/sprint-1-notes.md`. |
| AC-UI-11 `[S1]` | На 360 px и при браузерном зуме 200% нет горизонтального скролла; текст не обрезан; навигация и формы остаются доступными. |
| AC-UI-12 `[S1]` | `/legal/terms` и `/legal/privacy` открываются, показывают версию документа и пометку «черновик»; ссылки на них есть в футере и на экране регистрации. |

### 9.7. Защищённые страницы

| ID | Критерий |
|---|---|
| AC-GUARD-01 `[S1]` | `/account` без валидной сессии редиректит на `/login?next=%2Faccount`. |
| AC-GUARD-02 `[S1]` | После входа происходит возврат на `next`, если он внутренний. |
| AC-GUARD-03 `[S1]` | `/account` показывает «Мои результаты» и текст-заглушку; никаких вымышленных цифр прогресса. |
| AC-GUARD-04 `[S1]` | Со страницы `/account` доступен выход, после которого возврат назад не открывает содержимое. У `/account` и auth-ответов есть `Cache-Control: no-store, private`. |

### 9.8. Тесты и CI

| ID | Критерий |
|---|---|
| AC-QA-01 `[S1]` | `npm test` проходит; покрыты `password`, `tokens`, `session`, `rateLimit`, `origin`, `redirect`, `env`. |
| AC-QA-02 `[S1]` | `npm run test:e2e` проходит полный сценарий регистрации → verify → вход → `/account` → выход. |
| AC-QA-03 `[S1]` | E2E стабильно проходит два прогона подряд без ретраев. |
| AC-QA-04 `[S1]` | CI на PR выполняет `npm ci` → `db:generate` → lint → typecheck → unit → migrate → build → e2e и зелёный. Тесты используют БД `quiz_test` через `DATABASE_URL_TEST`. |
| AC-QA-05 `[S1]` | CI не требует секретов: все значения — тестовые из env job'а. |

### 9.9. Документация

| ID | Критерий |
|---|---|
| AC-DOC-01 `[S1]` | README содержит запуск за ≤ 10 минут: клонирование, `.env`, `db:up`, миграции, `dev`. |
| AC-DOC-02 `[S1]` | README перечисляет переменные окружения и объясняет `APP_ENV`, `AUTH_LOGIN_AFTER_VERIFY`, `MAIL_TRANSPORT`, `LEGAL_TERMS_VERSION`, `LEGAL_PRIVACY_VERSION`. |
| AC-DOC-03 `[S1]` | `docs/sprint-1-notes.md` содержит журнал расхождений с ТЗ и принятых решений. |
| AC-DOC-04 `[S1]` | Существующие `README.md` (описание продукта), `docs/02-tz.md`, `docs/03-progress-model.md`, `docs/04-audience-55plus.md` не переписаны и не удалены. |

### 9.10. Контракты на будущее

| ID | Критерий |
|---|---|
| AC-FUT-01 `[later]` | Ответы контента и попыток не содержат `isCorrect` до ответа пользователя. |
| AC-FUT-02 `[later]` | `POST /attempts/:id/answers` идемпотентен по `Idempotency-Key`. |
| AC-FUT-03 `[later]` | `User.timezone` — единственный источник часового пояса; `UserStats` его не дублирует. |
| AC-FUT-04 `[later]` | Гостевой прогресс переносится на аккаунт в одной транзакции без потери попыток. |

---

## 10. План проверки

### 10.1. Уровни

| Уровень | Инструмент | Что проверяет | Когда |
|---|---|---|---|
| Unit | Vitest 3 | Чистые функции `lib/auth/*`, `lib/http/*`, схемы Zod | Каждый коммит |
| Integration | Vitest + тестовая БД (P1) | Auth-роуты через handler'ы с реальной PostgreSQL; если не успеваем — e2e + ручные сценарии | PR |
| E2E | Playwright | Пользовательские сценарии в браузере | PR, перед мержем |
| Ручная | Чек-лист | Крупный текст, клавиатура, реальные письма, восприятие 55+ | Конец спринта |
| Доступность | axe (Playwright) + ручная | Контраст, фокус, подписи, Tab-порядок | Конец спринта |
| Безопасность | Ручные сценарии + чек-лист | CSRF, перечисление, cookie, лимиты, утечки в логи | Конец спринта |

### 10.2. Матрица покрытия (Sprint 1)

| Область | Unit | Integration (P1) | E2E | Ручная |
|---|---|---|---|---|
| Хеширование и политика пароля | ✅ | — | — | — |
| Токены и TTL | ✅ | P1 | ✅ | — |
| Сессия и cookie | ✅ | P1 | ✅ | ✅ |
| Rate-limit и блокировка | ✅ | P1 | ✅ | ✅ |
| CSRF/Origin | ✅ | P1 | — | ✅ |
| Регистрация → verify | — | P1 | ✅ | ✅ |
| Вход / выход / logout-all | — | P1 | ✅ | ✅ |
| Сброс пароля | — | P1 | ✅ | ✅ |
| Защита `/account` | — | P1 | ✅ | ✅ |
| Размер текста и клавиатура | — | — | ✅ | ✅ |
| Письма в dev | — | P1 | ✅ | ✅ |
| Health и отказ БД | — | P1 | — | ✅ |

Обязательный минимум Sprint 1 — unit + e2e + ручные сценарии. Integration-тесты помечены P1 и **в Sprint 1 не реализованы**: в репозитории есть только `tests/unit` и `tests/e2e`, поэтому колонка Integration показывает `P1`, а не фактическое покрытие. Они переносятся в Sprint 2 без блокировки (см. `docs/sprint-1-notes.md`).

### 10.3. Ручные сценарии (чек-лист приёмки)

1. Открыть сайт в Chrome, Firefox, Edge (последние версии) на 1366×768 и 1920×1080; отдельно — Android Chrome 360×640, iPhone SE Safari, планшет, системный крупный шрифт и браузерный зум 200%.
2. Пройти Tab-ом всю главную: skip-link → шапка → основной контент → подвал. Фокус всегда виден.
3. Переключить размер текста на «Очень крупный», перезагрузить — размер сохранился.
4. Зарегистрироваться, открыть `/_dev/mailbox`, перейти по ссылке, войти.
5. Ввести неверный пароль 5 раз, затем верный — увидеть понятное сообщение о блокировке с указанием времени. При неверном пароле сообщение не должно раскрывать блокировку. Отдельно проверить, что 6-я попытка с неверным паролем даёт обычную ошибку входа, а не сообщение о блокировке, и что 11-я попытка в окне 15 минут даёт сообщение о слишком частых попытках (`429`).
6. Нажать «Забыли пароль?» — получить письмо, сменить пароль, убедиться, что старый не работает.
7. Войти на двух устройствах, нажать «Выйти на всех устройствах» — второе устройство разлогинено.
8. Открыть `/account` в приватном окне — редирект на вход.
9. Остановить Docker: `/api/health` → 503, вход → понятное сообщение, приложение не падает.
10. Проверить контраст и размеры кнопок инструментами разработчика.
11. Пройти сценарий с включённым скринридером (NVDA или VoiceOver): формы читаются, ошибки озвучиваются.
12. Просмотреть `logs/dev-mail.log` и убедиться, что пароли и хеши туда не попадают.
13. Отдельно собрать и запустить приложение с `APP_ENV=production` и `MAIL_TRANSPORT=smtp` (SMTP можно указать тестовый/fake): `/_dev/mailbox` возвращает `404`, а `MAIL_TRANSPORT=log` в этой конфигурации не даёт приложению стартовать.

### 10.4. Тестовые данные

- Отдельная БД `quiz_test` (`DATABASE_URL_TEST`) для integration/e2e; скрипты `db:test:up`, `db:test:deploy`, `db:test:reset`, сид фикстур; dev-БД не очищается.
- Пользователи: `verified@example.com` (подтверждён), `unverified@example.com`, `locked@example.com`.
- Пароли — только тестовые, не совпадающие с реальными.
- Письма в e2e читаются из `logs/dev-mail.log` (парсинг последнего блока) или из тестового массива в памяти.

### 10.5. Команды проверки

```powershell
npm run lint
npm run typecheck
npm test
npm run db:up
npm run db:deploy
npm run build
npm run test:e2e
```

### 10.6. Критерии выхода из спринта

- Все `[S1]` AC выполнены и подтверждены в PR.
- `[S1-P1]` (change-password) — выполнен или явно перенесён с записью в `docs/sprint-1-notes.md`.
- CI зелёный на последнем коммите ветки.
- Ручной чек-лист пройден вторым человеком (ревьюер или владелец продукта).
- Нет открытых дефектов уровня «блокирует вход/регистрацию».

---

## 11. Риски и открытые вопросы

### 11.1. Риски

| ID | Риск | Вер. | Влияние | Меры |
|---|---|---|---|---|
| R1 | Синтаксис Prisma 7 (`prisma.config.ts`, адаптер, генератор) отличается от ожидаемого | Средняя | Среднее | Свериться с официальной документацией Prisma 7 на шаге 4; конфиг изолирован в двух файлах; при блокере — консультация, а не «догадки» |
| R2 | Next.js 16 содержит breaking changes относительно привычного API | Высокая | Среднее | Читать `node_modules/next/dist/docs/`; использовать `proxy.ts`, а не `middleware.ts`; не переносить код из примеров Next 14/15 без проверки |
| R3 | Docker недоступен на машине разработчика или в CI-окружении | Средняя | Высокое | Явное сообщение об ошибке, документированный отказ `/api/health`; CI использует service-контейнер |
| R4 | Расползание скоупа: в спринт пытаются добавить каталог, прогресс или гостевой режим | Высокая | Высокое | Раздел 3.2 как контракт; всё новое — только через изменение задачи, а не «по пути» |
| R5 | Требование авто-входа после регистрации конфликтует с обязательным подтверждением email | Средняя | Среднее | Флаг `AUTH_LOGIN_AFTER_VERIFY`; решение владельца продукта (Q1) |
| R6 | Реальная доставляемость писем в Mail.ru/Яндекс/Rambler не проверена | Высокая | Высокое (перед бетой) | В Sprint 1 — только dev-транспорт; SMTP и домен — отдельная задача Sprint 5–6 |
| R7 | In-memory rate-limit не работает при нескольких инстансах | Низкая (сейчас) | Среднее (позже) | Зафиксировано как ограничение; переход на Redis при масштабировании |
| R8 | Ошибки в cookie-сессии (подпись, `sessionEpoch`, `Secure`) приводят к уязвимости | Низкая | Критическое | Отдельные unit-тесты, ревью `lib/auth/session.ts`, чек-лист AC-SEC |
| R9 | Доступность деградирует без автоматических проверок | Средняя | Среднее | axe в e2e + ручной чек-лист; контраст и размеры — в дизайн-токенах |
| R10 | В UI просачивается «квиз»/«XP» из документов и кода | Средняя | Среднее | AC-UI-07, ревью текстов, словарь в `docs/04-audience-55plus.md` §7 |
| R11 | Часовой пояс и серия дней будут реализованы позже с конфликтом полей | Низкая | Среднее | Зафиксировано: `User.timezone` — источник истины (C3) |
| R12 | Нестабильные e2e из-за гонок с БД и письмами | Средняя | Среднее | Очистка БД, ожидание появления письма, отказ от `sleep` |
| R13 | Юридические тексты согласий не готовы к запуску регистрации | Средняя | Высокое | Версии документов в env; до готовности текстов — заглушки только в dev (Q3) |

### 11.2. Допущения и гипотезы

**Допущения (приняты как рабочие):**
- Node.js 24 LTS и npm 11.x на машине разработчика и в CI.
- Docker Desktop доступен локально.
- `AUTH_SECRET` — 32+ байта в base64, генерируется разработчиком.
- Стоп-лист паролей — 300–500 записей, подбор не влияет на архитектуру.
- TTL токенов: verify — 24 часа, reset — 1 час.
- Часовой пояс по умолчанию — `Europe/Moscow`.

**Гипотезы (требуют проверки, не являются требованиями):**
- Пользователи 55+ предпочтут вход по email/паролю, а не по коду из письма — проверяется на бете.
- Три шага размера текста достаточны; возможно, понадобится четвёртый.
- Формулировка «Сохранить результаты» повышает конверсию регистрации по сравнению с «Зарегистрироваться».
- In-memory rate-limit достаточно до 10k DAU.

### 11.3. Открытые вопросы

| ID | Вопрос | Блокирует | Кому |
|---|---|---|---|
| Q1 | Подтверждение email обязательно для входа — оставляем? Включаем ли авто-вход после verify по умолчанию? | Релиз auth, тексты писем | Владелец продукта |
| Q2 | Кнопка регистрации — «Сохранить результаты» или «Создать аккаунт»? | Тексты UI, AC-UI-08 | Владелец продукта |
| Q3 | Готовы ли версии документов «Пользовательское соглашение» и «Политика конфиденциальности» для фиксации в `Consent`? | Запуск регистрации вне dev | Юрист / владелец |
| Q4 | Нужен ли `change-password` в Sprint 1 или переносим в Sprint 2? | Планирование спринта | Владелец продукта |
| Q5 | Какое имя отправителя и `MAIL_FROM` использовать до появления домена? | Dev-письма, тексты | Владелец продукта |
| Q6 | Допустимо ли показывать полное письмо с токеном на `/_dev/mailbox` при демонстрациях? | Политика dev-режима | **Решено:** да, только при `APP_ENV != production`; файл `logs/dev-mail.log` gitignored, паролей и хешей не содержит; в production транспорт и страница отключены |
| Q7 | Удаление аккаунта — Sprint 2 или уже в Sprint 1 (AUTH-6 — Must)? | Полнота auth-контура | Владелец продукта |
| Q8 | Нужен ли пароль при входе в первой версии или сразу планируем код из письма (v1.1)? | Архитектура auth, тексты | Владелец продукта |
| Q9 | Хостинг и домен (VPS + Caddy vs Vercel + Neon) — влияет на `Secure` cookie и `APP_URL` | Конфигурация окружений | Владелец продукта / разработчик |
| Q10 | Нужна ли регистрация по инвайту на закрытой бете? | Схема `User`, API | Владелец продукта |

Блокирующими для **старта** Sprint 1 являются только Q9 (можно отложить до деплоя) и Q3 (можно отложить до релиза регистрации). Остальные можно решать по ходу, но Q1, Q2, Q4 нужно закрыть до реализации шага 6.

---

## 12. Definition of Done

### 12.1. Функциональность

- [ ] Все AC с меткой `[S1]` выполнены и проверены.
- [ ] Регистрация, подтверждение email, вход, выход, «выйти на всех устройствах», сброс пароля работают end-to-end.
- [ ] `/account` защищён и показывает заглушку «Мои результаты» без вымышленных данных.
- [ ] `/api/health` отражает состояние БД.
- [ ] `/legal/terms` и `/legal/privacy` открываются, содержат версию и пометку «черновик».
- [ ] `change-password` реализован или официально перенесён (Q4).

### 12.2. Качество кода

- [ ] TypeScript `strict`, `npx tsc --noEmit` без ошибок.
- [ ] ESLint без ошибок и без отключённых правил «на время».
- [ ] Нет `any` в новом коде без обоснования в комментарии.
- [ ] Логика auth не дублируется между роутами: роут — валидация + вызов сервиса.
- [ ] Чистая логика `lib/auth/*` не зависит от `next/*` (кроме `cookieStore.ts` и `currentUser.ts`) и покрыта unit-тестами.
- [ ] Нет мёртвого кода, закомментированных блоков и `console.log` в продакшн-путях.

### 12.3. Безопасность

- [ ] Пароли — scrypt; токены — sha256; в прикладных логах нет секретов. Полный текст письма допустим только в gitignored `logs/dev-mail.log` при `APP_ENV != production`, без паролей и хешей.
- [ ] CSRF-проверка включена на всех мутациях.
- [ ] Cookie соответствует AC-AUTH-10.
- [ ] Нет перечисления пользователей.
- [ ] Rate-limit и блокировка работают и покрыты тестами.
- [ ] `MAIL_TRANSPORT=log` запрещён при `APP_ENV=production`.
- [ ] Секреты не закоммичены; `.env.example` без значений.

### 12.4. Доступность и аудитория 45+/55+

- [ ] Контраст ≥ 7:1 для основного текста.
- [ ] Основной текст 18 px, три шага размера.
- [ ] Кнопки ≥ 56 px, тап-зоны ≥ 48×48 px, видимый фокус, полная клавиатурная навигация.
- [ ] Нет burger-меню, скрытых меню, свайпов, drag-and-drop.
- [ ] Проверено на Android 360 px, iPhone SE, планшете и при зуме 200%; нет горизонтального скролла.
- [ ] Терминология соответствует словарю; «квиз», «XP», «mastery», «streak», «лидерборд» отсутствуют в UI.
- [ ] Ошибки сформулированы как инструкция к действию, без обвинений.

### 12.5. Тесты и CI

- [ ] Unit-тесты покрывают `password`, `tokens`, `session`, `rateLimit`, `origin`, `redirect`, `env`.
- [ ] E2E покрывает регистрацию → verify → вход → `/account` → выход, неверный пароль, защиту `/account`, переключатель текста, axe на трёх страницах; проходит с включёнными security-заголовками и CSP (гидратация и формы не сломаны).
- [ ] CI зелёный на PR; проверки не требуют ручных шагов.
- [ ] Тесты используют отдельную БД `quiz_test` и не оставляют данных в dev-БД.

### 12.6. Документация

- [ ] README: быстрый старт, env, команды, границы Sprint 1, актуальный блок «Статус».
- [ ] `docs/sprint-1-notes.md`: решения, расхождения (Приложение A), отложенные пункты.
- [ ] Существующие документы ТЗ не переписаны.
- [ ] В README зафиксированы фактические версии ключевых пакетов.

### 12.7. Процесс

- [ ] PR прошёл ревью вторым человеком.
- [ ] Ветка `sprint-1/foundation` смержена в `main`.
- [ ] Нет открытых дефектов, блокирующих вход или регистрацию.
- [ ] Задача закрыта со ссылкой на PR и на `docs/sprint-1-notes.md`.

### 12.8. Не считается готовым, если

- Работает только на машине автора (нет README/CI).
- Есть «временные» заглушки в auth-логике (например, `if (email === "test@test.ru")`).
- Тесты проходят только при определённом порядке или с ручной подготовкой БД.
- UI использует запрещённую терминологию или мелкий текст.
- Секреты, токены или реальные письма попали в репозиторий.
- Документы ТЗ изменены без согласования.

---

## Приложение A. Расхождения и противоречия документации

Статус: **«решено»** — принято решение в рамках задачи; **«требует подтверждения»** — нужно решение владельца продукта.

| ID | Где | Что сказано | Что делаем | Статус |
|---|---|---|---|---|
| C1 | `02-tz.md` §6.6 | «После регистрации — автоматический вход»; при этом «подтверждение email обязательно для входа» | Регистрация не создаёт сессию. После verify — `/login?verified=1` без email в URL. Флаг `AUTH_LOGIN_AFTER_VERIFY` (по умолчанию `false`) | Требует подтверждения (Q1) |
| C2 | `02-tz.md` §6.6, §10.4; `autocard-pro` | В ТЗ путь `/api/v1/auth/*`; в референсе `/api/auth/*` | Используем `/api/v1/auth/*`, файлы — `app/api/v1/auth/*` | Решено |
| C3 | `03-progress-model.md` §5.3 vs §7.3; в `02-tz.md` §9.1 поле не описано | В `UserStats` указан `timezone`; в `User` тоже есть время | Единственный источник — `User.timezone`; в `UserStats` поля нет | Решено |
| C4 | `02-tz.md` §9.1 vs `03-progress-model.md` §7.1 | В ТЗ `QuestionProgress.streak`; в модели прогресса `correctStreak` + `attemptsWithCorrect` | Принимаем `correctStreak` и `attemptsWithCorrect`; `streak` не используем | Решено |
| C5 | `02-tz.md` §9.1, §9.3 | Индексы `Attempt(userId, createdAt)`, но поле `createdAt` в описании не выделено | Добавляем `startedAt` (обязательное) и индексируем по нему; `createdAt` остаётся техническим | Решено |
| C6 | `02-tz.md` §6.6, §10.5 | Роли упоминаются (`requireAdmin`), но перечисление не задано | Вводим `USER`, `EDITOR`, `ADMIN`; админка в Sprint 1 отсутствует | Решено |
| C7 | `02-tz.md` §6.6, §6.14; `04-audience` | Требуются согласия, но версии документов и их перечень не зафиксированы | `ConsentType`: `TERMS`, `PRIVACY`, `MARKETING`; версии — в env (`LEGAL_TERMS_VERSION`, `LEGAL_PRIVACY_VERSION`) | Требует подтверждения (Q3) |
| C8 | `02-tz.md` §13.3; `autocard-pro` | «Dev-фолбэк: письмо в лог»; в референсе токен в логи не пишется | Пишем полное письмо только в `logs/dev-mail.log` и `/_dev/mailbox`, только при `APP_ENV != production` | Решено |
| C9 | `02-tz.md` §6.6 | TTL токенов не заданы | verify — 24 ч, reset — 1 ч; константы в env | Допущение |
| C10 | `README.md`, `02-tz.md` (название), `01-analogies.md` | Слово «квиз» используется в названии продукта и документах | В пользовательском интерфейсе — только «тест»; «квиз» остаётся в названии проекта и внутренних документах | Решено |
| C11 | `02-tz.md` §8.1 | «PostgreSQL 16 (prod), SQLite — только локально» | SQLite не используем: одна СУБД во всех окружениях, меньше расхождений | Решено |
| C12 | `02-tz.md` §6.7 | Два варианта гостевого режима: cookie `quiz_guest_id` или отдельная `GuestSession` | `User.isGuest` — проще merge; cookie гостя и логика — Sprint 2 | Решено |
| C13 | `02-tz.md` §6.6 | «запомнить меня по умолчанию» — механика не описана | Чекбокса нет; сессия всегда 30 дней | Решено |
| C14 | `02-tz.md` §6.6, AUTH-5 | Смена пароля и email — Must, но экран настроек появляется позже | `change-password` — Sprint 1 (P1); `change-email` и удаление аккаунта — Sprint 2 | Требует подтверждения (Q4, Q7) |
| C15 | `02-tz.md` §12.7 | Перечислены четыре шрифта без выбора | Golos Text; при недоступности — self-host woff2 | Решено |
| C16 | `02-tz.md` §10.6 vs `autocard-pro` | Формат ошибок в ТЗ `{ error: { code, message, details? }, requestId }`; в референсе возможны отличия | Используем формат ТЗ во всех новых роутах | Решено |
| C17 | `02-tz.md` §6.6 vs `autocard-pro` | Cookie `quiz_user_id` против `autocard_user_id` | `quiz_user_id`, формат `<userId>:<sessionEpoch>` + HMAC-подпись | Решено |
| C18 | `02-tz.md` §8.1; `autocard-pro` | Prisma 7 в референсе работает с `@prisma/adapter-better-sqlite3`; для PostgreSQL нужен другой адаптер | `@prisma/adapter-pg` + `pg` + `prisma.config.ts`; точный синтаксис — по официальной документации Prisma 7 | Требует проверки |
| C19 | `02-tz.md` §6.6 | «Блокировка после 5 неудачных попыток на 15 минут» и «rate-limit по email и IP» — не сказано, одна это механика или две | Реализуем обе: счётчик неудач в `User` (блокировка) + бакеты лимитов в памяти | Решено |
| C20 | `02-tz.md` §6.14, §11.5 | Упоминаются юридические документы, включая оферту | Для MVP без платежей нужны «Пользовательское соглашение» и «Политика конфиденциальности»; оферта не требуется | Решено |
| C21 | `02-tz.md` §12.2 | Карта экранов использует `/auth/*` и `/profile`; задача — `/login`, `/register`, `/account` | Принимаем `/login`, `/register`, `/account`: короче и понятнее для 55+; `/profile` не используем | Решено |
| C22 | `02-tz.md` §13.3 | «Dev-фолбэк: письмо в лог»; при этом `next build/start` всегда `NODE_ENV=production` | Вводим `APP_ENV` (local/test/production) и запрещаем `MAIL_TRANSPORT=log` только при `APP_ENV=production` | Решено |
| C23 | `02-tz.md` §11.4 | Требуются CSP и HSTS | В Sprint 1 — базовая CSP, `X-Frame-Options`, HSTS только при `APP_ENV=production`; полный CSP — после стабилизации inline-скриптов Next | Решено |

---

## Приложение B. Ревью задачи и исправления

Первое ревью заблокировало передачу в разработку: 2 блокера и 2 критичных дефекта. Они исправлены в тексте задачи:

| № | Проблема | Исправление |
|---|---|---|
| B1 | `app/_dev/mailbox` — private folder Next.js, не маршрутизируется | Реальный роут `app/dev/mailbox/page.tsx` + rewrite `/_dev/mailbox` в `next.config.ts`; проверка `APP_ENV` внутри страницы |
| B2 | Запрет `MAIL_TRANSPORT=log` по `NODE_ENV` ломал локальный `next start` и CI | Введён `APP_ENV` (local/test/production); запрет только при `APP_ENV=production` |
| B3 | `423` до проверки пароля раскрывал существование аккаунта | Блокировка проверяется после верного пароля; при неверном — `401` (если не отсечено `429`); `429` имеет приоритет |
| B4 | Время ответа выдавало существующий email | `login` всегда выполняет scrypt, для несуществующего email — `DUMMY_HASH`; AC с измеримым порогом p50 |
| B5 | GET-подтверждение email сжигало токен при prefetch почтовика | GET только показывает кнопку, POST подтверждает; форма работает без JS |
| B6 | Email попадал в query после verify | `/login?verified=1` без email в URL |
| B7 | `next` мог быть open redirect | Правило `safeNext`: только внутренний путь, отсекаются `//`, `/\`, `javascript:` |
| B8 | `/account` мог открыться из bfcache после выхода | `Cache-Control: no-store, private`, `dynamic = "force-dynamic"` |
| B9 | Playwright не поднимал сервер, CI падал | Добавлен `webServer`, `prisma generate`, `APP_ENV=test`, отдельная `quiz_test` |
| B10 | `validateEnv()` не вызывался на старте | Добавлен `instrumentation.ts` |
| B11 | `UserStats` в инварианте требовал таблицу в Sprint 1 | Инвариант перенесён на Sprint 4; в Sprint 1 таблицы нет |
| B12 | Не было правовых страниц при сборе согласий | Добавлены `/legal/terms`, `/legal/privacy` с версией и пометкой «черновик» |

**Остаточные риски, принятые осознанно:**
- Точный синтаксис Prisma 7 + `@prisma/adapter-pg` проверяется на шаге 4 по официальной документации.
- Integration-тесты — P1; обязательный минимум — unit + e2e + ручные сценарии.
- Формы, кроме verify-email, требуют JS; progressive enhancement — Sprint 2.
- Полный CSP и HSTS — после стабилизации inline-скриптов Next и появления production-домена.

---

## Приложение C. Второе ревью и исправления

Второе ревью не нашло новых блокеров, но выявило 3 критичных и 4 крупных замечания. Все исправлены:

| № | Проблема | Исправление |
|---|---|---|
| C1-1 | Лимит `AUTH_RL_LOGIN_PER_EMAIL_15M=5` совпадал с порогом блокировки: 6-я попытка всегда получала `429`, сценарий `401`/`423` был недостижим | Лимит по email поднят до 10; явно задан порядок «rate-limit → scrypt → блокировка»; AC-AUTH-13 переписан под 5 неверных → 6-я неверная `401`, 6-я верная `423`, после 15 минут успех |
| C1-2 | Dev-файл `logs/dev-mail.log` с токеном и email противоречил инварианту «токены и email не логируются» | Введено явное исключение: файл — почтовый ящик, а не лог приложения; разрешён только при `APP_ENV != production`, gitignored, без паролей и хешей. Обновлены §4.5, §4.6, AC-SEC-02, AC-SEC-09, §12.3, Q6 |
| C1-3 | `app/dev/mailbox/page.tsx` мог быть статически отрендерен: `next start` отдавал бы 404 или кэш | Страница объявлена динамической (`force-dynamic`, `revalidate = 0`, `runtime = "nodejs"`), чтение в `try/catch`, `mkdir({ recursive: true })` при записи; добавлена проверка после `build && start` |
| M1 | H1 главной «Тесты и квизы» нарушал AC-UI-07 | Заголовок заменён на «Проверьте себя», логотип — «Тесты» |
| M2 | В структуре отсутствовали `proxy.ts`, `lib/http/redirect.ts`, `tests/unit/http/redirect.test.ts` | Все три добавлены в §5 и §6; шаг 1 создаёт `proxy.ts`, шаг 5 — `redirect.ts` |
| M3 | В футере и на регистрации не было обеих правовых ссылок | Футер ведёт на `/legal/terms` и `/legal/privacy`; на `/register` оба согласия содержат видимые ссылки |
| M4 | CI запускал `db:generate` после unit-тестов и не задавал `DATABASE_URL_TEST` | `db:generate` перенесён сразу после `npm ci`; в env job'а добавлены `DATABASE_URL_TEST` и база `quiz_test`; AC-QA-04 синхронизирован |
