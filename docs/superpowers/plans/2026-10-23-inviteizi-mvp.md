# InviteIZI MVP: 16 шаблонов, база, бот RU/UZ, сервер — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** рабочий Telegram-бот InviteIZI (RU/UZ) с 21 дизайном (5 пилотов + 16 новых), базой Supabase и публикацией на Vercel.

**Architecture:** один Next.js-проект. `/{slug}` читает заказ из Postgres и рендерит тему из `templates/registry.ts`. Бот — чистая машина состояний `bot/flow` (тестируется без Telegram, через репозиторий в памяти) + тонкий адаптер grammY в `app/api/bot`. Сервер ходит в базу ролью `inviteizi_server` через пулер Supabase (ключа service_role у нас нет); файлы в Storage — через edge-функцию `storage-gate` (у неё ключ есть внутри Supabase, мы шлём только общий секрет).

**Tech Stack:** Next.js 16.4 (App Router, Turbopack), React 19, Tailwind 4, motion 14, grammY 1, postgres.js 3, qrcode, vitest 3, sharp, playwright-core, Supabase (Postgres 17 + Storage + Edge Functions + pg_cron/pg_net), Vercel.

**Spec:** задание владельца (сообщение от 23.10.2026, копия ключевых требований — в разделе Global Constraints), `CLAUDE.md`, `План проекта/09_…`, `План проекта/10_…`.

## Global Constraints
- Всё, что видят гости, — узбекский, кириллица. Бот — RU и UZ (кириллица), выбор при первом входе.
- Тексты: приглашения — только `texts/uz-cyrl.ts`; бот — `texts/bot-ru.ts`, `texts/bot-uz.ts`.
- Вёрстка 360–430px, на компьютере колонка 430px. Проверка 375×812 и 360×640.
- Шрифты только с ў қ ғ ҳ (`subsets: ["cyrillic","cyrillic-ext"]` + проверка глазами).
- Золото — градиентом с бликом. Тёмных дизайнов среди 16 новых — не больше 2.
- НАМУНА до оплаты: диагональная полупрозрачная надпись + внизу «Тўловдан сўнг бу ёзув олиб ташланади», музыки нет.
- Фото: Pixabay (`isAiGenerated=false`, `isLowQuality=false`), скачивать к себе, webp ≤ 300 КБ, blur 2–6px, растворение в цвет дизайна, автор в `public/art/CREDITS.md`.
- Цены: Анимацияли 10 000 ₸, Оддий 7 000 ₸. Подтверждают оплату только `ADMIN_IDS`.
- Supabase — только проект `hjakyirmyauqhurkqhsn`. Vercel — новый проект `inviteizi` в команде scanizi, проект scanizi не трогать.
- Секреты не выводить, не коммитить, не вставлять в код.
- Не делать: «сайт InviteIZI» и витрины. Только `/{slug}`, `/demo/{id}`, `/demo/{id}/namuna`, `/catalog`, бот.

## Review Focus
1. Клиент пишет в боте не то, что ждёт шаг (текст вместо кнопки, фото вместо имени, название песни) → бот вежливо подсказывает, шаг не теряется. Тест на каждый шаг ввода в `bot/flow.test.ts`.
2. Два клиента с одинаковыми именами → slug `aziz-madina-2`; кириллица/ўқғҳ/апостроф в имени → чистая латиница. Тест в `lib/slug.test.ts`.
3. Не-админ нажимает «Тасдиқлаш» (переслал кнопку, подделал callback) → отказ, статус не меняется. Тест в `bot/flow.test.ts`.
4. Длинные имена (Муҳаммадали, Гулчеҳрахон) и 3 тадбира в Оддий-дизайне на 360×640 → ничего не вылезает, текст читается. Образец `samples.long` в `lib/samples.ts`, прогон `check-template` с `?sample=long`.
5. Повторный чек после «Рад этиш», повторное нажатие «Тасдиқлаш» (двойной клик админа), ссылка после истечения срока → заглушка. Тесты в `bot/flow.test.ts` и `lib/orders.test.ts`.

---

## Решения аудита (Шаг 0)
- Сборка проходит; 5 пилотов: 0 ошибок консоли, нет переполнения/пустых экранов (оба размера).
- Хардкода текстов в шаблонах нет; секретов в коде нет; `.env.local` в .gitignore.
- PIXABAY_API_KEY работает. В `.env.local` нет ключей Supabase → роль `inviteizi_server` (SCRAM-хеш, пароль только в `.env.local`), подключение `aws-0-ap-northeast-2.pooler.supabase.com:6543` проверено.
- НАМУНА не имеет нижней подписи → добавить (Task 1).
- Vercel CLI не залогинен, репозитория GitHub нет → деплой через MCP: маленький «загрузчик» + архив исходников в приватном бакете Storage (Task 9).

---

### Task 1: Общая основа шаблонов v2 (координатор)

**Files:** Modify `lib/types.ts`, `texts/uz-cyrl.ts`, `templates/blocks/useInvitation.ts`, `templates/blocks/Watermark.tsx`, `templates/registry.ts`, `app/demo/[template]/*`. Create `lib/samples.ts` (заменяет `lib/pilot-samples.ts`), `templates/blocks/PhotoBackdrop.tsx`, `scripts/pixabay.mjs`, `scripts/check-template.mjs`, `scripts/make-covers.mjs`, `docs/superpowers/plans/design-common.md`.

**Interfaces (Produces):**
- `InvitationData` + `sides?: { groom?: string; bride?: string }` (Куёв/Келин томони), `EventKind` + `"nikohMarosim" | "kelinSalom"`.
- `inv.program` — события по дате/времени; `inv.sides`; `inv.blessing` (оқ фотиҳа по тадбиру); `inv.isMorning` (первое событие раньше 09:00).
- `samples: Record<Occasion, InvitationData>` и `samples.long` (длинные имена, 3 тадбира).
- `Design = { id: string; number: number; occasion: Occasion; format: Format; withPhoto: boolean; dark?: boolean; sample; art?; cover: string; load }`.
- `<PhotoBackdrop src fade="to-bottom"|"to-top"|"radial" color blur? />` — фото с растворением в цвет (blur уже «запечён» скриптом).
- `node scripts/pixabay.mjs search <id> "<english query>"` → кандидаты в `art-raw/<id>/`; `node scripts/pixabay.mjs pick <id> <n> [--blur=3]` → `public/art/<id>.webp` ≤ 300 КБ + строка в `public/art/CREDITS.md`.
- `node scripts/check-template.mjs <id> [--mid=ms] [--sample=long]` → `screens/<id>/…` + JSON-отчёт (как check-pilot).

- [ ] Тексты: формулы из задания, `t.sides`, `t.program`, `t.blessing[occasion]`, `t.watermarkNote`, названия 16 дизайнов в `t.designs`.
- [ ] Watermark: нижняя плашка с `t.watermarkNote`.
- [ ] Проверка: `npx tsc --noEmit`, пилоты проходят `check-template`.

### Task 2–17: 16 дизайнов (ДИЗАЙНЕР → ТЕСТИРОВЩИК/РЕВЬЮЕР)
Каждый — `templates/themes/<id>/`, правила в `design-common.md`, приёмка: `check-template` в 375×812 и 360×640 (+ `--sample=long`), 8 пунктов «капризного клиента», грамотность. Волны по 4–5 параллельно, после волны `npm run build`.

| # | id | Название | Тадбир | Формат | Фото | Открытие | Гамма |
|---|---|---|---|---|---|---|---|
| 61 | ganch-peshtoq | Ганч пештоқ | никоҳ | А | — | ганч-арка раскрывается | слоновая кость, белый ганч, мягкое золото |
| 62 | zarhal-eshik | Зарҳал эшик | никоҳ | А | — | резные двери | шампань, орех, золото |
| 63 | atlas-tolqin | Атлас тўлқини | никоҳ | А | — | свиток | пудра + нежная мята (пастельный атлас) |
| 64 | anor-bogi | Анор боғи | никоҳ | А | ✓ гранат | открытка-разворот | пудра, гранатовый акцент |
| 65 | bodom-guli | Бодом гули | никоҳ | А | ✓ миндаль в цвету | раскрытие лепестками | жемчуг, нежно-розовый, шалфей |
| 66 | samarqand-kitob | Самарқанд | никоҳ | А | ✓ Регистан | книга | пыльно-голубой, песочный, кошин |
| 67 | ipak-romol | Ипак рўмол | никоҳ | О | — | — (ислими прорисовывается) | лаванда, серебристое золото |
| 68 | rishton-koshin | Риштон кошин | никоҳ | О | — | — | слоновая кость + кобальт Риштана |
| 69 | atirgul | Атиргул | никоҳ | О | ✓ розы | — | шампань, румяна |
| 70 | shohona-baxmal | Шоҳона бахмал | никоҳ | О | — | — | **тёмный**: бордо-бархат + золото |
| 71 | tandir-nuri | Тандир нури | наҳорги ош | А | ✓ тандир/нон | свечение тандира | песочный, тёплый янтарь |
| 72 | dasturxon | Дастурхон | наҳорги ош | А | — | дастурхон разворачивается | лён, гранат, зелёный чай |
| 73 | non-muhr | Нон муҳри | наҳорги ош | А | — | конверт с печатью-нон | крафт-молоко, шалфей |
| 74 | tonggi-choy | Тонгги чой | наҳорги ош | О | ✓ чайник/пиалы | — | жемчуг, утренний персик |
| 75 | paxta-gul | Пахта гул | наҳорги ош | О | — | — | шалфей, белый хлопок |
| 76 | oltin-ot | Олтин от | суннат | А | — | бархатная шкатулка | **тёмный-нежный**: голубой бархат + золотой конь, дўппи-узор |

Номера 61–76 — продолжение каталога (1–60 заняты планом файла 10).

### Task 18: Тексты (ТЕКСТОВИК)
Проверка всех фраз `texts/uz-cyrl.ts`, `texts/bot-uz.ts`, `texts/bot-ru.ts`: падежи, ў қ ғ ҳ, уважительный тон, простота для пожилых. Отчёт `docs/reviews/texts.md`.

### Task 19: Превью каталога
`node scripts/make-covers.mjs` → `public/covers/<id>.webp` 1080×1920 (обложка после открытия, без НАМУНА), загрузка в бакет `previews`.

### Task 20: База (БЭКЕНД)
**Files:** `supabase/migrations/*.sql`, `lib/db.ts`, `lib/orders.ts`, `lib/slug.ts` (+ тесты), `supabase/functions/storage-gate/index.ts`.
- Таблицы: `users(id bigint pk, username, first_name, lang, step, draft jsonb, source, created_at, last_seen_at)`, `admins(telegram_id pk, name)`, `templates(id pk, number, occasion, format, with_photo, price, cover_url, is_active, sort)`, `music(id pk, title_uz, title_ru, file_url, telegram_file_id, sort, is_active)`, `orders(id uuid pk, number serial unique, user_id fk, occasion, format, template_id fk, relation, groom, bride, person, cause, age, hosts, side_groom, side_bride, text_id, custom_text, music_kind, music_id fk, music_file_id, music_url, slug unique, status, amount, receipt_file_id, receipt_kind, reject_reason, created_at, updated_at, receipt_at, paid_at, payment_reminded_at, admin_reminded_at, expires_at)`, `events(id, order_id fk cascade, position, kind, date, time, venue_name, address, lat, lng, map_url)`.
- `status` check: draft, preview, awaiting_payment, receipt_sent, active, archived, rejected.
- RLS включён везде; anon/authenticated — ничего; `inviteizi_server` — свои политики. Бакеты: art, previews, music (public), receipts, deploy (private).
- `lib/slug.ts`: `slugify(groom, bride|person) → "aziz-madina"`, `uniqueSlug(base, taken: (s)=>Promise<boolean>)`.

### Task 21: Бот (БОТ, TDD)
**Files:** `bot/flow.ts` (машина состояний), `bot/keyboards.ts`, `bot/repo.ts` (интерфейс) + `bot/repo-memory.ts` (тесты) + `bot/repo-pg.ts`, `bot/telegram.ts` (адаптер grammY), `app/api/bot/route.ts`, `app/api/cron/route.ts`, `texts/bot-ru.ts`, `texts/bot-uz.ts`, `bot/flow.test.ts`.
- Шаги: lang → menu → occasion → format → catalog(i) → anketa (по тадбиру) → moreEvents → text → music → review(edit) → preview → payment → receipt → wait → done. Каждый шаг: `back`, подсказка на непонятный ввод.
- Админ: approve/reject(reason), /orders, /stats, /find; напоминания: админу через 30 мин без ответа, клиенту через 3 ч на шаге оплаты (cron каждые 10 мин из pg_cron).
- Проверка: `npx vitest run` — всё зелёное.

### Task 22: Страница заказа и каталог
`app/[slug]/page.tsx` (active → full, до оплаты → demo, после срока → заглушка), `app/[slug]/opengraph-image.tsx`, `app/catalog/page.tsx`, `app/api/music/[id]`.

### Task 23: Сервер
Vercel-проект `inviteizi` (scanizi), env, деплой загрузчиком, `setWebhook` с secret_token, профиль бота (setMyName/ShortDescription/Description/Commands на uz и ru), pg_cron.

### Task 24: Финальная проверка и отчёт
ТЕСТИРОВЩИК: путь клиента на обоих языках (через webhook-симулятор и вживую, если есть доступ), ссылка без НАМУНА, музыка, карта. РЕВЬЮЕР: код + безопасность. `ОТЧЁТ.md`.
