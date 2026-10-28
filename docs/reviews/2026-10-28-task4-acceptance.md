# InviteIZI — задание 4/5: финальная интеграционная приёмка

Исходный HEAD: `63e01d6889726f51eea2ea773e557bd9ca51292d`, ветка `feature/inviteizi-upgrade`, существующий draft PR #1. Base/main на момент проверки: `ab5eb2ee1925e75a733e7a186fe510f28d9b85c7`. Рабочая папка была чистой. Проверка diff: 368 изменённых файлов до этой партии; прочитаны критические модули и непосредственные зависимости, а не все изображения/компоненты подряд.

## Карта контрактов feature ↔ main

| Контракт | Реализация / проверка | Результат |
|---|---|---|
| Вход Telegram и приватные чаты | `bot/update.ts`, `webhook.ts`, `flow/index.ts`; `webhook.test.ts` | Один router, проверка webhook secret до обработки; callback вопроса содержит q; ошибки обработки возвращают 503 |
| Типы / хранилище | `lib/types.ts`, `domain.ts`, `bot/repo.ts`, `repo-pg.ts`, `repo-memory.ts`, repo contract | InvitationData общие; MemoryRepo — тестовая реализация того же контракта, не второй production-механизм заказов |
| Каталог / цена | `templates/registry.ts`, `steps-order.ts`, `seed-templates.mjs`, formats tests | Один реестр, один PRICES 5000/6000/8000; template SQL — синхронизируемая запись/FK, а orders.amount — сохранённая договорённая сумма |
| Создание / повтор | `confirmDraft`, `createOrderFromDraft`, PgRepo insert transaction | Проверка ожидаемого q и завершение черновика вместе с INSERT; SQL rollback не теряет вопрос; повтор не создаёт второй заказ |
| Оплата / выручка | `flow/orders.ts`, `transition`, analytics trigger | Переход receipt_sent → active условный в UPDATE; повторное подтверждение не добавляет выручку; сумма берётся из заказа |
| Старые ссылки / данные | PgRepo toData/toMusic, slug_history, `lib/orders.ts` | Старые суммы/own URL сохраняются; redirect старого slug; отсутствующие необязательные SQL-поля не подменяются новыми данными |
| Демо / full | `pageMode`, `getInvitationBySlug`, `app/[slug]/page.tsx` | 24 часа от createdAt; updatedAt срок не продлевает; full определяется серверным active, не query-параметром; архив/срок события дают заглушку |
| Места / null | `steps-event.ts`, `venues.ts`, `flow/util.ts`, `map-link.ts` | Прежний InvitationEvent, 10 мест владельца, ручной ввод/URL/venue/location; null в JSON-черновике уплотняется с пересчётом индексов |
| Музыка | `steps-final.ts`, `deps.ts`, `audio-type.ts`, `useInvitation.ts`, MusicButton | Прежние list/own/none; теперь ограничен и фактический download. Клиентские файлы не становятся общим каталогом |
| Права / аналитика | dashboard, favorites, PgRepo canAnalyze/isOwner, demo-event, demo-tracking | Owner-only customers, explicit analytics grants, private chat, непрозрачные AES-GCM markers; статистика не принимает клиентские финансовые события |
| SQL | analytics/favorites и scroll migrations; compatibility / migration tests | Новые совместимые миграции, первоначальная schema в diff не изменена; покупка без аналитической миграции проверена отдельно |

Доказанных дублирующих production-систем заказов/цен/каталогов не найдено. Удалений, переписывания бота и архитектурных замен нет. Текущий каталог остаётся 50 принятых, 51 зарегистрированный, anor-bogi скрыт.

## Воспроизведённый дефект: FAIL → исправление → PASS

**Файл/корень:** `bot/deps.ts` читал `res.arrayBuffer()` без ограничения; 20 МБ проверялись только по необязательному file_size входного Telegram-сообщения в `steps-final.ts`. Тело скачивания могло превысить лимит до записи в Storage.

**До исправления:** сначала добавлены два параметризованных регрессионных теста в `bot/deps.test.ts`. Команда `npx vitest run bot/deps.test.ts`: 1 PASS / 2 FAIL. Случай declared: Content-Length 20 MiB + 1 принимался и доходил до uploadFile. Случай streamed: поток без надёжного Content-Length выдавал 22 чанка по 1 MiB и не завершался; старый arrayBuffer зависал до таймаута теста вместо отмены на лимите.

**Исправление:** `readAudioBytes` в `bot/audio-type.ts` проверяет заголовок, считает реальные байты, отменяет reader при превышении и не вызывает Storage. Общий MAX_MUSIC_BYTES перенесён туда же, прежний export util сохранён. Публичный формат URL, HMAC, music choice, Storage bucket и музыкальный движок не менялись.

**После исправления:** оба теста PASS, отмена потока и отсутствие uploadFile подтверждены; 18 целевых music/deps/type тестов PASS. Полный набор после изменения — 529 PASS / 0 FAIL / 30 SKIP. Рабочие Telegram/Storage не вызывались.

## Потеря хозяев и дополнительных мероприятий: FAIL → PASS

| Дефект | Воспроизведение до исправления | Минимальное исправление | Результат |
|---|---|---|---|
| Хозяева пропадают при указанных обеих семьях | nikoh-sides.test.ts: отдельные от семей hosts, 6 FAIL / 54 PASS (30 Никоҳ × demo/full) | oltin-monogramma/OltinMonogramma.tsx, sapfir/Sapfir.tsx, ipak-romol/Design.tsx: в прежнем семейном блоке вывести хозяев, если строка не совпадает с уже показанной семьёй; прежние useFitWords/Family | 60/60 PASS, данные больше не подменяются сторонами |
| Виден только main, события 2/3 и карты теряются | Первый browser-long: 6 FAIL / 94 PASS. После добавления необходимых font mocks, SSR: 6 FAIL / 94 PASS | oq-ot/OqOt.tsx, tonggi-qozon/TonggiQozon.tsx, pion-guldasta/PionGuldasta.tsx: показать дополнительные inv.program в существующем Section/Reveal с датой, временем, адресом, MapButton | SSR 100/100 PASS (все 50 × demo/full), browser повтор проверяется отдельно |

До каждого исправления сначала падал тест. Промежуточные ошибки расширенного SSR-мока (недостающие экспорты шрифтов для новых non-Nikoh случаев) исправлены в тестовой инфраструктуре до валидного воспроизведения; они не считались дефектами продукта. Тексты/шрифты/композиции/открытия/registry/цены не заменялись. Для заказа с одним событием прежняя композиция сохранена, для нескольких добавляются уже сохранённые данные.

Просмотрены контактные листы всех 50 первых экранов. Ранний снимок Sapfir попал до его существующего проявления текста; отдельная проверка после завершения (2.5 с) подтвердила opacity 1 и читаемые имена. Это не зависшее открытие. Не заявляется отсутствие любого краткого декоративного перехода.

## Путь клиента: статусы и доказательства

PASS ниже означает проверку на локальных симуляторах/изолированном SQL, а не работу с настоящим коммерческим аккаунтом.

| Область | Статус | Доказательство / ограничение |
|---|---|---|
| /start, RU/UZ, мероприятие, тариф, каталог | PASS | flow.start/form/nikoh/yubiley, formats/catalog tests |
| Все персональные поля, обе семьи, хозяева | PASS | flow.form/review/nikoh, venue-stage, 100 SSR случаев всех 50 дизайнов demo/full; browser reports |
| Несколько событий, даты, время | PASS | form/review, helpers, SQL roundtrip, long fixtures |
| 10 тойхан: выбор и точная ссылка | PASS | venue-stage перебирает все места; название/адрес/mapUrl без придуманных координат |
| Ручной адрес, 2GIS, Telegram venue/location | PASS | venue-stage, normalizeUpdate, SQL roundtrip |
| Skip/back и JSON-массивы с null | PASS | venue-stage + repo-pg.local, данные и индексы событий сохранены |
| List/own/none, отказ загрузки и лимит | PASS | flow.music/form/deps/audio-type/orders; реальные remote MP3 проверялись в задании 3/5, текущий UI использует локальный WAV |
| 24-часовое демо, правки до/после заказа | PASS | orders.test, formats contract; срок от createdAt, прежняя сумма/slug неизменны |
| 5000/6000/8000, старый Simple → Animated | PASS | formats и venue-stage: устаревшие/поддельные кнопки не дают дешёвый upgrade |
| Kaspi phone, PAYMENT_CARD_NUMBER отсутствует/есть | PASS | venue-stage RU/UZ, payment tests, нет реального номера карты в новом коде |
| Чек, подтверждение/отказ, ссылка/QR | PASS | flow.payment/races, SQL format contract; повторная оплата учитывается один раз |
| Оплаченное приглашение, история ссылок | PASS | orders, compatibility.local, formats contract, SSR; реальный order URL не запрашивался |
| Повторы webhook, DB/Telegram ошибки | PASS | webhook/races: 503 до успешной обработки, повтор после потери COMMIT acknowledgement, rollback, отказ отправки ссылки/QR |
| Избранное / аналитика / owner access | PASS | dashboard/analytics/demo-tracking/demo-event, SQL favorites/analytics; права перепроверяются на callback |
| Кодовые токены / приватные файлы | PASS в пределах проверки | Логи ошибок проверяются тестом; эвристический поиск литералов Telegram/JWT в 65 runtime-файлах — 0 совпадений. Это не полный pentest/скан истории git |
| SQL migrations и роли | PASS (PGlite) | Изолированный движок + postgres.js + loopback, роли/RLS/триггеры/новый CHECK/старый schema; это не нативный PostgreSQL/Supabase |
| 50 дизайнов на мобильных | PASS | 200 production-normal до найденных веток потери данных, 100 final dev-long после исправлений; финальный production recheck шести изменённых шаблонов указан ниже |
| Настоящий PostgreSQL suite | SKIP | 30 тестов repo-pg.test.ts: нет изолированного DATABASE_URL. postgres/pg_ctl не найдены; Docker CLI есть, daemon недоступен |
| Реальный Telegram / webhook доставки | NOT VERIFIED | Нет разрешённой тестовой среды; FakeTg не выдаётся за Telegram |
| Production DB/Storage, upload клиента, оплаченная ссылка HTTP | NOT VERIFIED | Нет безопасного тестового доступа; production запись/чтение клиентских файлов не выполнялись |
| Права на текущую музыку | NOT VERIFIED | Предыдущий отдельный инвентарь: 16 названий/16 HTTP-доступных объектов, 4 технически воспроизводятся, 0 подтверждённых коммерческих лицензий |
| Vercel production и физические iOS/Android | NOT VERIFIED | Локальный Chrome с мобильным viewport/touch не заменяет устройства/реальную сеть/Vercel |

## Выполненные проверки

- Общий запуск: `INVITEIZI_LOCAL_PG=1 npm test -- --maxWorkers=2` → **529 PASS / 0 FAIL / 30 SKIP**, 38 файлов PASS, 1 SKIP. В первом запуске без ограничения workers был один 5-секундный cold SSR timeout; отдельно все 60 SSR тестов прошли, затем общий набор с двумя workers прошёл. Таймаут не маскировался изменением тестовых ожиданий.
- PGlite SQL: 100 клиентов — 1233 мс, revenue delta 1 000 000; 1000 — 11445 мс, delta 10 000 000. Это фикстуры 10 000 ₸, не текущий тариф. Один socket/connection и очередь вызовов, **не 1000 одновременных native PostgreSQL connections**, не измерение пропускной способности Vercel.
- `npx tsc --noEmit`, `npm run lint` → PASS.
- `npx next build --webpack` → PASS, 166 страниц. Использован поддерживаемый Webpack из-за уже задокументированного в задании 3/5 сбоя локального Turbopack CSS worker. default npm run build в этой партии не повторяли; сбой Turbopack не объявлен исправленным, настройка build не менялась.
- Каталог: **50 карточек / 50 demo / 150 JPG, WebP, OG → PASS**, правильные format/PRICES, anor-bogi скрыт. [JSON](2026-10-28-task4-catalog.json).
- Browser normal: 200/200 PASS (50 × 320/360/375/430). Первый long: 94 PASS / 6 FAIL, файлы/воспроизведение/исправления перечислены выше. Финальный long: **100/100 PASS** (50 × 320/375), поля/карты/слова за краем экрана/overflow/открытие/scroll/JS и reduced motion. [Normal JSON](2026-10-28-task4-mobile-normal.json), [до исправления](2026-10-28-task4-mobile-long-before.json), [final long](2026-10-28-task4-mobile-long.json). Final production recheck: **24/24 PASS** (6 изменённых шаблонов × 320/360/375/430) после финальной сборки; [JSON](2026-10-28-task4-production-fixed.json). Остальные 44 шаблона не менялись после полного production-normal прогона. Существующий check-mobile-regression расширен проверками присутствия пользовательских строк и карт, ожиданием hydration, ограничением localhost и локальным WAV. Это инфраструктура проверки, не новая система приглашений. CPU ×4/реальные телефоны заново не измерялись; прежние отчёты дизайнов не подменяются новыми заявлениями об FPS.

## GO / NO-GO

**NO-GO для немедленного production-внедрения этого PR.** Успешные локальные проверки не закрывают следующие блокеры:

1. **Музыкальные права:** нет подтверждения коммерческого размещения текущих композиций. Нужны документы на выбранные фонограммы/произведения либо материалы с проверенными правами и условиями атрибуции. Клиентская загрузка не является лицензией общего каталога. Никакие существующие объекты не удалялись/не скрывались.
2. **Изолированная внешняя приёмка:** нужен нативный тестовый PostgreSQL с теми же миграциями/ролями и тестовый Telegram/Supabase Storage для полного HTTP-пути заказа, webhook retry, чека, уведомлений и own audio. PGlite/MemoryRepo/FakeTg этого не доказывают; 30 native tests остаются SKIP. Высокая одновременная нагрузка и сбои пулера не проверены.
3. **Состояние внедрения:** не сверены применённые production migrations, grants, OWNER_TELEGRAM_ID/analytics grants/секреты, Storage-gate и опубликованные assets/templates. Нужен review/read-only сверка владельцем и отдельное разрешение на внедрение. Для feature необходимы `20261025120000_analytics_favorites.sql` и `20261026120000_scroll_format.sql`, прежние обязательные schema/slug/music миграции, затем разрешённый seed/upload. Скрипты sync/seed могут менять данные — сейчас не запускались.
4. **Build целевой среды:** Webpack production build подтверждён, стандартный Turbopack локально ранее падал на CSS worker. До публикации нужен успешный выбранный build в разрешённом preview/staging окружении; о production build Vercel данных нет.

Незакрытые критические кодовые FAIL по выполненным unit/integration/SSR/browser проверкам: **0**. Все три воспроизведённых класса дефектов исправлены. Граница идемпотентности: недавние update_id хранятся в ограниченной истории (64), повтор создания и оплаты дополнительно защищён транзакционным q/условным status UPDATE. Не заявляется универсальная exactly-once доставка Telegram или отсутствие любых ошибок при произвольной нагрузке.

Production SQL/Storage, webhook/токены, main, Vercel Production, заказы и пользователи не менялись. Merge/Deploy не выполнялись. После commit/push и проверки HEAD PR #1 остановиться.
