# Sprint 2. Каталог, интересы, тренировки и прогресс

**Приоритет:** P0 (первый учебный цикл после фундамента)
**Оценка:** 8–12 pd
**Статус:** реализовано 12.11.2026
**Ветка:** работа велась в `master`
**Основание:** [`docs/05-learning-experience.md`](../05-learning-experience.md), [`docs/03-progress-model.md`](../03-progress-model.md)

**Цель:** пользователь выбирает интересные темы, проходит тренировку на 10/15/20/30
вопросов, видит разбор ошибок, статистику по темам и возвращается к ошибкам по
расписанию повторения.

---

## 1. Что входит

1. Каталог: разделы → темы, количество вопросов, прогресс.
2. Онбординг интересов и их редактирование.
3. Персональные рекомендации на главной.
4. Тренировка по теме или разделу с выбором длины.
5. Серверная проверка ответов и объяснения.
6. Результат с разбором и разбивкой по темам.
7. `QuestionProgress`, `TopicProgress`, `UserStats`, `DailyActivity`.
8. «Мои результаты»: цифры, изученное, слабые места, история, личный рекорд.
9. «Повторить ошибки»: очередь повторения и отдельная тренировка.
10. Демо-контент в репозитории: 5 разделов, 14 тем, 122 вопроса.

## 2. Что не входит

- готовые выпуски `Quiz` на 10–12 вопросов;
- дипломы, «тест дня», награды;
- публичный рейтинг (только opt-in позже, см. §9 документа 05);
- гостевой режим и merge прогресса;
- админка и импорт из `forms_writer` через UI;
- типы вопросов кроме `single_choice`;
- OAuth, платежи, аналитика.

---

## 3. Модель данных

Добавлено в `prisma/schema.prisma`:

```prisma
enum ContentStatus { DRAFT PUBLISHED ARCHIVED }
enum AttemptMode { TRAINING REVIEW }
enum AttemptStatus { IN_PROGRESS COMPLETED ABANDONED }
enum InterestSource { ONBOARDING MANUAL BEHAVIOR }
```

Модели: `Category`, `Topic`, `Question`, `QuestionOption`, `UserInterest`,
`Attempt`, `AttemptAnswer`, `QuestionProgress`, `TopicProgress`, `UserStats`,
`DailyActivity`.

Фактические правила:

- `Category.slug`, `Topic.slug` — unique;
- `QuestionOption` — 4 варианта, ровно один `isCorrect = true`,
  `@@unique([questionId, order])`;
- `Question.isDemo` помечает демо-контент, `Question.version` — версию текста;
- `Attempt` — `userId`, опциональные `categoryId`/`topicId`, `mode`, `status`,
  `questionCount`, `answeredCount`, `correctCount`, `score`, `maxScore`, `xpEarned`,
  `startedAt`, `finishedAt`, `durationSec`;
- `AttemptAnswer` — `@@unique([attemptId, questionId])`, `order`,
  `selectedOptionId?`, `isCorrect?`, `responseMs?`, `answeredAt?`,
  `questionVersion`, `xpAwarded`, `wasDue`;
- `AttemptAnswer` создаются при старте на весь набор вопросов — это снимок состава
  попытки;
- `QuestionProgress` — `@@unique([userId, questionId])`, поля mastery из
  `docs/03-progress-model.md` §7.1;
- `TopicProgress` — `@@unique([userId, topicId])`, поля из §7.2;
- `UserStats` — `@@unique([userId])`, поля из §7.3 + `bestAccuracy`;
- `DailyActivity` — `@@unique([userId, date])`;
- `User.interestsSetAt` хранит дату прохождения онбординга интересов;
- связи `User` дополнены: `interests`, `attempts`, `questionProgress`,
  `topicProgress`, `stats`, `dailyActivity`;
- индексы: `Attempt(userId, startedAt)`, `Attempt(status)`, `Attempt(topicId)`,
  `AttemptAnswer(attemptId, order)`, `Question(topicId, status)`,
  `QuestionProgress(userId, nextReviewAt)`, `QuestionProgress(userId, masteryLevel)`,
  `TopicProgress(userId, lastActivityAt)`, `TopicProgress(userId, progress)`.

Миграции:

- `prisma/migrations/20261112083550_learning_experience/`;
- `prisma/migrations/20261112083752_question_demo_flag/`.

---

## 4. Демо-контент и сид

Скрипт `npm run db:seed` (идемпотентный upsert по стабильным `id`), файл
`scripts/seed.mjs`, контент — `scripts/seed/content/*.mjs`.

Источники:

- образцы `forms_writer`: `samples/questions.json`, `maps_quiz.json`;
- демо-наборы: «Гарри Поттер», «Животные», «Картины и художники»,
  «Советское кино».

Структура каталога:

| Раздел | Темы | Вопросов |
|---|---|---|
| Искусство | Картины и художники, Музыка | 16 |
| Кино и сериалы | Гарри Поттер, Советское кино | 16 |
| Кругозор | Карты и навигация, Технологии, Спорт, Языкознание | 32 |
| Природа | Животные, География | 16 |
| Наука | История, Литература, Точные науки, Космос | 42 |
| **Итого** | **14 тем** | **122 вопроса** |

Требования выполнены:

- в каждой теме не менее 8 вопросов, в «Кругозоре» — 32;
- у каждого вопроса 4 варианта и объяснение;
- факты простые и проверяемые; спорные формулировки не используются;
- демо-контент помечен `Question.isDemo = true` и комментарием в сиде
  «демо, заменить импортом»;
- сид не удаляет пользователей, попытки и прогресс.

---

## 5. Backend

### 5.1. Чистые функции (unit-тесты обязательны)

| Файл | Что делает |
|---|---|
| `lib/progress/mastery.ts` | `nextQuestionProgress(...)`: mastery 0–5, streak, attemptsWithCorrect, nextReviewAt по интервалам 1/3/7/16/35 |
| `lib/progress/scoring.ts` | `scoreQuestion(...)` и `selectQuestions(...)`: due/weak/unseen/interest/недавно видели/детерминированный шум, round-robin по темам для раздела |
| `lib/progress/recommendations.ts` | `scoreTopic(...)`: interest, due, progress, unseen, недавняя активность |
| `lib/progress/stats.ts` | XP, серия, пересчёт `TopicProgress` |
| `lib/progress/level.ts` | пороги уровней и `pointsToNext` |
| `lib/progress/time.ts` | локальная дата и интервалы |

### 5.2. Сервисы

| Файл | Что делает |
|---|---|
| `lib/content/catalog.ts` | каталог с количеством вопросов и прогрессом пользователя, тема по slug |
| `lib/interests/service.ts` | получить/сохранить интересы |
| `lib/attempts/service.ts` | создание попытки, ответ, завершение, прерывание, разбор, `countDueQuestions` |
| `lib/stats/service.ts` | главная, статистика, история, рекомендации, слабые темы |
| `lib/attempts/http.ts` | единый формат ошибок попыток |
| `lib/auth/rateLimit.ts` | лимиты на старт тренировки и ответы |

Требования выполнены:

- проверка ответа только на сервере;
- повторный ответ идемпотентен: сервер возвращает сохранённый результат и **не
  начисляет баллы повторно**;
- завершение попытки идемпотентно по `attemptId`;
- все изменения в транзакции: ответ → `AttemptAnswer` → `QuestionProgress` →
  `UserStats`; завершение → `Attempt` → `TopicProgress` → `UserStats` →
  `DailyActivity`;
- чужая попытка → `404`, не `403` (не раскрывать существование);
- попытка в статусе `COMPLETED` или `ABANDONED` не принимает ответы;
- `durationSec` считается сервером от `startedAt`;
- прерванная попытка сохраняет XP за ответы, но не получает XP за завершение;
- лимит ответов и старта тренировки защищает от перебора.

### 5.3. API

| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/v1/catalog` | разделы, темы, `questionCount`, прогресс |
| GET | `/api/v1/topics/[slug]` | тема, `questionCount`, прогресс |
| GET/PUT | `/api/v1/me/interests` | список topicId / сохранение |
| POST | `/api/v1/attempts` | `{ topicId?, categoryId?, count, mode }` → `{ attemptId, questionCount, mode }` |
| GET | `/api/v1/attempts/[id]` | вопросы и ответы текущей попытки; до ответа без правильного варианта |
| POST | `/api/v1/attempts/[id]/answers` | `{ questionId, optionId }` → `{ isCorrect, correctOptionId, explanation, xpAwarded, masteryLevel, nextReviewAt, answeredCount, correctCount, questionCount, alreadyAnswered }` |
| POST | `/api/v1/attempts/[id]/finish` | итог, разбор, разбивка по темам |
| POST | `/api/v1/attempts/[id]/abandon` | прерывание, итог по данным ответам |
| GET | `/api/v1/me/stats` | `UserStats`, темы, история, `dueCount` |
| GET | `/api/v1/me/review` | `dueCount` и до 20 вопросов к повторению |

Все мутации: `rejectCrossOrigin`, проверка сессии, rate limit,
`Cache-Control: no-store, private`. Ответы — `{ data }` или
`{ error: { code, message, details? }, requestId }`.

Некорректный `count` → `400`; допустимые значения 10/15/20/30. Если вопросов
меньше, создаётся попытка с фактическим числом.

---

## 6. UI

### 6.1. Страницы

| Путь | Содержание |
|---|---|
| `/tests` | Каталог: разделы, темы, количество вопросов, прогресс; онбординг интересов |
| `/tests/[slug]` | Тема: описание, прогресс, выбор 10/15/20/30, «Начать тренировку», повторение |
| `/interests` | Редактирование интересов |
| `/attempts/[id]` | Плеер: вопрос, варианты, проверка, объяснение, «Дальше», выход с подтверждением |
| `/attempts/[id]/result` | Результат: счёт, процент, темы, ошибки, CTA |
| `/account` | «Мои результаты»: цифры, изученное, слабые темы, повтор, история |
| `/` | Для вошедшего: «Продолжить», «Рекомендуем», «Пора повторить» |

### 6.2. Компоненты

- `components/content/InterestPicker.tsx` — чипы интересов и онбординг;
- `components/content/TopicCard.tsx` — карточка темы с прогрессом;
- `components/content/StartTraining.tsx` — выбор длины и запуск;
- `components/attempts/AttemptPlayer.tsx` — прохождение, проверка, выход;
- `components/attempts/ReviewButton.tsx` — запуск повторения;
- `components/ui/ProgressBar.tsx` — спокойная полоса прогресса.

### 6.3. UI-правила 45+/55+

- основной текст 18 px, крупные заголовки, кнопки ≥ 56 px;
- один главный action на экран;
- без таймера, автоперехода и анимаций, мешающих чтению;
- прогресс — текстом «Вопрос 3 из 10» и спокойной полосой;
- слова «тест», «баллы», «освоено», «дней подряд», «Мои результаты»;
- не использовать «квиз», «XP», «mastery», «streak», «лидерборд» в UI;
- ошибка формулируется спокойно: «Пока неверно. Правильный ответ — …»;
- «Повторить ошибки» — не наказание, а продолжение обучения.

---

## 7. Acceptance criteria

### 7.1. Каталог и интересы

| ID | Критерий | Статус |
|---|---|---|
| AC-CAT-01 | `/tests` показывает 5 разделов и 14 тем; у каждой темы видно количество вопросов. | ✅ |
| AC-CAT-02 | Гость видит каталог; при старте тренировки его переводит на `/login?next=…`. | ✅ |
| AC-CAT-03 | Вошедший видит прогресс по темам; темы без прогресса помечены «Ещё не начато». | ✅ |
| AC-CAT-04 | Интересы сохраняются, переживают перезагрузку и редактируются на `/interests`. | ✅ |
| AC-CAT-05 | Главная вошедшего показывает до 3 рекомендаций по интересам и слабым темам. | ✅ |
| AC-CAT-06 | Пустые темы (0 вопросов) не показываются в каталоге. | ✅ |

### 7.2. Тренировка

| ID | Критерий | Статус |
|---|---|---|
| AC-SES-01 | Можно выбрать 10/15/20/30; если вопросов меньше — показывается фактическое число и кнопка работает. | ✅ |
| AC-SES-02 | Попытка создаётся только для вошедшего; чужая попытка недоступна. | ✅ |
| AC-SES-03 | В ответе API до ответа нет `isCorrect` и правильного варианта. | ✅ |
| AC-SES-04 | Ответ проверяется на сервере; повторная отправка идемпотентна и не начисляет баллы. | ✅ |
| AC-SES-05 | После ответа показываются верно/неверно, правильный вариант и объяснение. | ✅ |
| AC-SES-06 | Попытка завершается после ответа на все вопросы; повторный `finish` идемпотентен. | ✅ |
| AC-SES-07 | Результат показывает счёт, процент, разбивку по темам и ошибки с объяснениями. | ✅ |
| AC-SES-08 | Вопросы выбираются по приоритету: просроченные, слабые, новые; недавно виденные — реже. | ✅ |
| AC-SES-09 | Перезагрузка страницы возвращает к первому неотвеченному вопросу. | ✅ |
| AC-SES-10 | Выход с подтверждением сохраняет ответы и переводит попытку в `ABANDONED`. | ✅ |

### 7.3. Прогресс и ошибки

| ID | Критерий | Статус |
|---|---|---|
| AC-PRG-01 | `QuestionProgress` обновляется по правилам mastery из `03-progress-model.md` §3. | ✅ |
| AC-PRG-02 | Верный ответ увеличивает `nextReviewAt` по интервалу; ошибка ставит повтор на завтра. | ✅ |
| AC-PRG-03 | После завершения или прерывания пересчитываются `TopicProgress` и `UserStats`. | ✅ |
| AC-PRG-04 | XP: +10 верный, +2 неверный, +5 завершение, +25 идеальный, +12 верный из повторения. | ✅ |
| AC-PRG-05 | Уровень считается по таблице порогов; в UI — «баллы». | ✅ |
| AC-PRG-06 | Серия дней обновляется по локальной дате `User.timezone`. | ✅ |
| AC-PRG-07 | «Мои результаты» показывает тренировок, вопросов, точность, освоено. | ✅ |
| AC-PRG-08 | «Что вы уже знаете» показывает темы с `masteredQuestions` и прогрессом. | ✅ |
| AC-PRG-09 | Слабые темы показываются после ≥ 5 изученных вопросов при точности < 60 % или прогрессе < 40 %. | ✅ |
| AC-PRG-10 | «Пора повторить» показывает `dueCount`; кнопка создаёт тренировку `mode = REVIEW`. | ✅ |
| AC-PRG-11 | История последних 10 попыток отображается с датой, темой, счётом. | ✅ |
| AC-PRG-12 | Личный рекорд: лучший процент (для тренировок ≥ 10 вопросов) и лучшая серия. | ✅ |

### 7.4. Качество

| ID | Критерий | Статус |
|---|---|---|
| AC-QA-01 | Unit-тесты покрывают mastery, интервалы, выбор вопросов, рекомендации, XP/уровень, серию. | ✅ 148 тестов |
| AC-QA-02 | E2E: вход → интересы → каталог → тренировка 10 → ответы → результат → «Мои результаты». | ✅ |
| AC-QA-03 | E2E проверяет, что гость не может начать тренировку и уходит на `/login`. | ✅ |
| AC-QA-04 | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` зелёные. | ✅ 16 e2e |
| AC-QA-05 | CI дополнен шагом `npm run db:seed` после миграции. | ✅ |
| AC-QA-06 | Сид идемпотентен: повторный запуск не создаёт дубликаты и не стирает прогресс. | ✅ |
| AC-QA-07 | Новые страницы проходят axe без critical/serious. | ✅ `/tests`, `/tests/history` |

---

## 8. Definition of Done

- [x] Миграция применена, `prisma validate` и `prisma generate` проходят.
- [x] Сид загружает контент, повторный запуск безопасен.
- [x] Все AC из §7 подтверждены тестами или ручным сценарием.
- [x] Нет `any` без обоснования, нет `console.log` в продакшн-путях.
- [x] `docs/sprint-1-notes.md` не переписан; решения Sprint 2 — в
      `docs/sprint-2-notes.md`.
- [x] README обновлён: новые страницы, команда `db:seed`, что работает.
- [x] CI зелёный.
