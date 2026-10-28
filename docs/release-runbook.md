# InviteIZI — release readiness, задание 5/5, 28.10.2026

**NO-GO для production. Разрешение на Merge/Deploy/DB/Storage/webhook этой задачей не выдано.** Подготовлена проверяемая процедура выпуска; невыполнимые без доступа проверки не объявлены успешными.

## Уточнение владельца: лёгкая Animated-проверка, Windows 11 / Supabase Free

Текущая подготовка не требует установки PostgreSQL/Docker, платных backup/PITR или новых сервисов/проектов. Native-тесты остаются SKIP, PGlite не выдаётся за production-проверку. Отсутствие локального PostgreSQL само по себе не заменяет проверку реальной схемы и резервного сохранения: их состояние пока NOT VERIFIED.

[Выборочный отчёт Animated](reviews/2026-10-28-animation-readiness.md): kabutar-salom и два исторически более тяжёлых кандидата проверены; непродуктивная prewarm-гипотеза отклонена, runtime-анимации не изменены. Подтверждена backup-ветка старого кода ab5eb2e; данных Supabase и Storage она не сохраняет.

Без прямого доступа одно действие владельца для проверки Supabase: в SQL Editor существующего проекта выполнить только read-only preflight/условную history-проверку ниже, без миграций и без передачи секретов. Для Preview — обычный вход разрешённым Vercel-аккаунтом; protection не отключать. По информации владельца, автоматических backups Free нет; наличие ручной восстановимой копии таблиц и Storage ещё нужно подтвердить. Выгрузки отдельных таблиц/файлов не объявлять полным DB-backup/проверенным restore без проверки их полноты.

Минимальный порядок: SHA → подтверждённое резервное сохранение → реальные миграции/старая paid-ссылка (сначала read-only) → Preview → reviewed seed 50 → только отдельно разрешённые Merge/Deploy → Telegram/старые заказы → совместимый rollback. В пунктах о native/restore ниже используется уже доступная среда, если она есть; это не поручение установить ПО или купить сервис. Новых разрешений на запись эта подготовка не даёт.

## Зафиксированное состояние

Runtime-приёмка: SHA **700b25484af6028b28d1c3aeb4ff80db25d300cd**, main **ab5eb2ee1925e75a733e7a186fe510f28d9b85c7**, feature/inviteizi-upgrade, [draft PR #1](https://github.com/davronbekinagamzhanov-collab/inviteizi/pull/1), не объединён. В задании 5 нет изменений production-runtime: добавлены проверка env без раскрытия значений, регрессионная проверка старого SQL-адаптера на будущей схеме и release-документация. Финальный SHA подготовки — HEAD PR после commit/push; его нужно заново зафиксировать перед разрешением владельца. Если main или runtime изменятся, повторить относящуюся приёмку.

Исходный [отчёт задания 4](reviews/2026-10-28-task4-acceptance.md): три класса дефектов исправлены, незакрытых воспроизведённых кодовых FAIL нет. Это не гарантия отсутствия любых ошибок под произвольной нагрузкой. [Машинный инвентарь](reviews/2026-10-28-task5-release.json) содержит 50 ID, квоты, seed, SHA-256 всех SQL-файлов и ограничения доступа.

## 50 принятых дизайнов

| Категория | Simple | Scroll | Animated | Всего |
|---|---:|---:|---:|---:|
| Никоҳ | 5 | 10 | 15 | 30 |
| Наҳорги ош | 3 | 3 | 4 | 10 |
| Суннат | 2 | 1 | 2 | 5 |
| Юбилей | 1 | 2 | 2 | 5 |
| Итого | 11 | 16 | 23 | 50 |

Simple **5 000 ₸**, Scroll **6 000 ₸**, Animated **8 000 ₸**. Зарегистрирован 51 ID; anor-bogi скрыт и не включён в 50.

| № | ID | Название | Категория | Формат | ₸ |
|---:|---|---|---|---|---:|
| 1 | oltin-monogramma | Олтин монограмма | Никоҳ | Animated | 8 000 |
| 2 | sapfir | Сапфир | Никоҳ | Simple | 5 000 |
| 3 | oq-ot | Оқ от | Суннат | Animated | 8 000 |
| 4 | tonggi-qozon | Тонгги қозон | Наҳорги ош | Animated | 8 000 |
| 5 | pion-guldasta | Пион гулдаста | Юбилей | Animated | 8 000 |
| 6 | ganch-peshtoq | Ганч пештоқ | Никоҳ | Animated | 8 000 |
| 7 | zarhal-eshik | Зарҳал эшик | Никоҳ | Animated | 8 000 |
| 8 | atlas-tolqin | Атлас тўлқини | Никоҳ | Animated | 8 000 |
| 9 | bodom-guli | Бодом гули | Никоҳ | Animated | 8 000 |
| 10 | samarqand-kitob | Самарқанд | Никоҳ | Animated | 8 000 |
| 11 | ipak-romol | Ипак рўмол | Никоҳ | Simple | 5 000 |
| 12 | rishton-koshin | Риштон кошин | Никоҳ | Simple | 5 000 |
| 13 | atirgul | Атиргул | Никоҳ | Simple | 5 000 |
| 14 | shohona-baxmal | Шоҳона бахмал | Никоҳ | Scroll | 6 000 |
| 15 | tandir-nuri | Тандир нури | Наҳорги ош | Animated | 8 000 |
| 16 | dasturxon | Дастурхон | Наҳорги ош | Animated | 8 000 |
| 17 | non-muhr | Нон муҳри | Наҳорги ош | Animated | 8 000 |
| 18 | tonggi-choy | Тонгги чой | Наҳорги ош | Scroll | 6 000 |
| 19 | paxta-gul | Пахта гул | Наҳорги ош | Scroll | 6 000 |
| 20 | oltin-ot | Олтин от | Суннат | Animated | 8 000 |
| 21 | oq-chinni | Оқ чинни | Наҳорги ош | Simple | 5 000 |
| 22 | doppicha | Дўппича | Суннат | Simple | 5 000 |
| 23 | sayram-hovli | Сайрам ҳовлиси | Суннат | Scroll | 6 000 |
| 24 | zarvaraq | Зарварақ | Юбилей | Simple | 5 000 |
| 25 | umr-daraxti | Умр дарахти | Юбилей | Scroll | 6 000 |
| 26 | marvarid-satr | Марварид сатри | Никоҳ | Simple | 5 000 |
| 27 | gulbog-sahifa | Гулбоғ саҳифаси | Никоҳ | Scroll | 6 000 |
| 28 | suzani-yol | Сўзана йўли | Никоҳ | Scroll | 6 000 |
| 29 | bugdoy-boshoq | Буғдой бошоғи | Наҳорги ош | Simple | 5 000 |
| 30 | lola-ehtirom | Лола эҳтироми | Юбилей | Scroll | 6 000 |
| 31 | zarhal-lavha | Зарҳал лавҳа | Юбилей | Animated | 8 000 |
| 32 | adras-nishon | Адрас нишони | Суннат | Simple | 5 000 |
| 33 | mis-kafgir | Мис капгир | Наҳорги ош | Simple | 5 000 |
| 34 | rayhon-sahari | Райҳон саҳари | Наҳорги ош | Scroll | 6 000 |
| 35 | visol-rishta | Висол риштаси | Никоҳ | Animated | 8 000 |
| 36 | uzum-hovli | Узум ҳовлиси | Никоҳ | Scroll | 6 000 |
| 37 | sopol-navo | Сопол навоси | Никоҳ | Scroll | 6 000 |
| 38 | girih-nur | Гиреҳ нури | Никоҳ | Animated | 8 000 |
| 39 | siyoh-duo | Сиёҳ дуоси | Никоҳ | Animated | 8 000 |
| 40 | kabutar-salom | Кабутар саломи | Никоҳ | Animated | 8 000 |
| 41 | shirin-tilak | Ширин тилак | Никоҳ | Scroll | 6 000 |
| 42 | minor-satr | Минор сатри | Никоҳ | Scroll | 6 000 |
| 43 | kumush-taroq | Кумуш тароқ | Никоҳ | Scroll | 6 000 |
| 44 | shabnam-visol | Шабнам висоли | Никоҳ | Animated | 8 000 |
| 45 | visol-soati | Висол соати | Никоҳ | Animated | 8 000 |
| 46 | dutor-navosi | Дутор навоси | Никоҳ | Scroll | 6 000 |
| 47 | tut-qogozi | Тут қоғози | Никоҳ | Scroll | 6 000 |
| 48 | qosh-uzuk | Қўш узук | Никоҳ | Animated | 8 000 |
| 49 | yelpigich-ziynat | Елпиғич зийнати | Никоҳ | Animated | 8 000 |
| 50 | saodat-kaliti | Саодат калити | Никоҳ | Animated | 8 000 |

## Проверки и реальный предел доказательств

| Область | Статус | Доказательство |
|---|---|---|
| Свежие unit/integration | PASS | 532 passed / 0 failed / 30 skipped; 39 файлов passed, 1 skipped; INVITEIZI_LOCAL_PG=1 npm test -- --maxWorkers=2 |
| Нативный PostgreSQL | SKIP | 30 тестов; бинарники не обнаружены в PATH/обычных каталогах, Docker daemon недоступен. Ни одна production DB не использована |
| PGlite SQL compatibility | PASS с ограничением | source bot/repo-pg.ts взят непосредственно из pinned main; старый create/receipt/approve работает на будущей схеме, сумма 4321 сохранена, SQL event один; новый Scroll читается старым адаптером. Это не полная совместимость старого UI или нативного кластера |
| Read-only SQL preflight | PASS локально | docs/release-preflight.sql: 14 statements на изолированном PGlite, без Supabase migration history/storage schema. На production не запускался |
| TypeScript / lint | PASS | npx tsc --noEmit; npm run lint. Промежуточный TS-дефект нового тестового child-env (NODE_ENV) исправлен, финальный TS чистый |
| Production build | PASS ранее на runtime SHA | Webpack, 166 страниц, задание 4. В этой партии runtime не изменён, полный build не повторялся |
| Browser 50 designs | PASS ранее на runtime SHA | 200 normal + 100 final long; 24 production-повтора 6 исправленных шаблонов, 50 карточек/50 demo/150 images. Подробные JSON в отчёте 4; заново не выдаются за Preview smoke |
| Seed | PASS dry-run | 51 строка, 50 active, скрыт только anor-bogi; цены из PRICES. Соединения с DB нет |
| Миграции production / grants / RLS | NOT VERIFIED | Нет подключённого Supabase read-only инструмента и локальных DB credentials. Файлы и isolated tests не доказывают применение миграций |
| Vercel Preview build | PASS по GitHub status на 700b254 | context Vercel: success, Deployment has completed. Vercel Preview Comments success означает только отсутствие feedback, а не приёмку приложения |
| Preview smoke | BLOCKED / NOT VERIFIED | Существующий branch URL перенаправляет /, /catalog и /demo/saodat-kaliti на вход vercel.com; конечный HTTP 200 — страница login, не успешное приложение. UI-инструмент остановлен из-за невозможности достоверно определить текущий URL Windows Chrome; UI-автоматизация прекращена |
| Реальный Telegram / webhook / checkout / upload / paid URL | NOT VERIFIED | Нет изолированной тестовой среды. Платежи, токены, webhook и клиентские файлы не трогались |
| Backup / restore / rollback artifact | NOT VERIFIED | Не созданы и не испытаны без доступа; не объявлены существующими |

Команды для повторения локальных проверок (PowerShell, только проверенные тестовые ресурсы):

- node scripts/seed-templates.mjs --dry-run
- node --env-file=.env.local scripts/check-release-env.mjs — только локальный env; JSON без значений. Exit 1 при missing/invalid означает неготовность этой конфигурации, а не сбой production.
- $env:INVITEIZI_LOCAL_PG='1'; npm test -- --maxWorkers=2 — при отсутствии production DATABASE_URL/DB_SERVER_PASSWORD. Не загружать production env для всего тестового набора: repo-pg.test.ts способен записывать тестовые строки.
- npm run test:pg — ТОЛЬКО после проверки, что .env.local указывает на отдельный настоящий тестовый PostgreSQL. Тест создаёт и удаляет фикстуры, его нельзя запускать на рабочей Supabase.

## Музыка / Storage

Свежий HEAD-only доступ: **16/16** известных публичных MP3-путей HTTP 200; новых песен не скачивали. Реальное HTMLAudio play/pause ранее проверено для **4** демокомпозиций на четырёх ширинах. Остальные 12 — только доступность, не подтверждённое декодирование. Локально **1** тестовый WAV, **0** MP3 каталога. Подтверждённых коммерческих лицензий **0**; законных новых композиций не добавлено. [Отдельный инвентарь/материалы](reviews/2026-10-28-task3-music.md).

DB music rows и полный bucket listing неизвестны. own/ клиентские объекты не перебирались. По текущей архитектуре music/art/previews публичные; receipts/deploy приватные, gate выдаёт подписанные ссылки. Новые own URL непрозрачные HMAC, но доступ по точной публичной ссылке остаётся возможным. Нельзя считать это приватным bucket или переносить клиентский файл в общий каталог.

music-sync НЕ запускать для релиза: в этой копии 0 каталоговых MP3, write-режим способен скрыть удалённые треки. Не использовать upload-assets как слепую синхронизацию старого содержимого. Для новых существующих файлов сначала read-only manifest/HEAD/hash/тип, затем только отдельно разрешённая адресная загрузка отсутствующих объектов без удаления/перезаписи клиентских путей.

## Миграции: порядок и применение

Все исторические SQL-файлы оставлены без изменений. Полный файловый порядок:

1. 20261023180530_schema.sql
2. 20261023180625_storage_buckets.sql
3. 20261023221315_cron.sql
4. 20261024031409_slug_reserved_dev.sql
5. 20261024120000_slug_history.sql
6. 20261024150000_music_occasion.sql
7. **20261025120000_analytics_favorites.sql**
8. **20261026120000_scroll_format.sql**

Это порядок файлов, **не доказанная production-история**. В diff с main новые миграции — 7/8; не переисполнять исторические 1–6 без сверки применённой истории. Storage/cron используют Supabase storage/vault/pg_net/pg_cron и не эмулируются полностью PGlite. Не применять db reset или безусловный db push вслепую.

Файл 7 добавляет can_analytics, analytics_config/events, design_favorites, dedupe keys и transactional order trigger. RLS включён, anon/authenticated не получают данные, server grants ограничены операциями приложения; customers дополнительно закрыт owner-проверкой в коде. Файл 8 расширяет CHECK templates/orders до simple/scroll/animated и не переписывает суммы/форматы заказов. ALTER CHECK требует блокировки: согласовать окно, lock/statement timeouts и прерывание при длительном ожидании, не оставлять частично применённое состояние.

Для безопасного чтения оператор выполняет [release-preflight.sql](release-preflight.sql) в read-only transaction. Если has_migration_history=true и есть право чтения, отдельно:

```sql
begin read only;
select version,name from supabase_migrations.schema_migrations order by version;
rollback;
```

Не читать/публиковать statements, vault.secrets, auth tokens, DB пароли или персональные строки. Permission denied не означает, что миграция отсутствует; не повышать права без разрешения. Сверить применённые версии с содержимым/хешами release JSON. При расхождении остановиться и подготовить новую корректирующую миграцию, не править уже применённый файл.

Сохранность сумм/ссылок подтверждена isolated tests. Production-снимок оплаченных заказов (ID, template_id, format, amount, slug, связанные events/music) хранить только в защищённой резервной копии/локальном закрытом отчёте владельца. Сравнивать после миграций по тому же исходному набору ID; новые законные оплаты могут менять агрегаты, поэтому одно равенство общего revenue не доказывает сохранность.

## Seed: обязательный review до записи

Dry-run не читает текущую БД и потому **не показывает реальную деактивацию DB-записей**. Все **21** ID из main сохранены в feature; кодовых удалений нет. Тем не менее production может иметь дополнительные исторические ID, о которых в Git нет данных.

До записи seed сравнить DB templates, active flags и все template_id оплаченных заказов с 51 зарегистрированным ID и доступными компонентами/старыми ссылками. Для неизвестного оплаченного ID — STOP: сохранить компонент/активы/чтение заказа, не удалять и не переименовывать заказ. Историческая цена берётся из orders.amount, не templates.price/нового PRICES.

Write-режим seed обновляет templates, ставит is_active=false неизвестным registry ID и скрывает anor-bogi. Он не удаляет строки и не переписывает orders, но побочные изменения каталога требуют точного списка before/after и отдельного разрешения. Проверить в isolated restore: 50 видимых, anor-bogi скрыт, старые оплаченные ссылки работают независимо от каталожного active. При неизвестных historical templates не запускать текущий write-скрипт; сначала подготовить reviewed адресный план, сохраняющий эти записи. Dry-run был единственным запуском здесь.

## Env без значений

| Переменная | Назначение и проверка |
|---|---|
| DATABASE_URL **или** DB_SERVER_PASSWORD | Подключение runtime ролью inviteizi_server, SSL/pooler; credentials migration-owner не использовать в приложении |
| TELEGRAM_BOT_TOKEN | Существующий токен текущего бота; формат и позже getMe в разрешённой среде, без вывода токена |
| TELEGRAM_WEBHOOK_SECRET | Совпадает с заголовком Telegram webhook; не менять адрес/secret автоматически |
| OWNER_USERNAME | Текущий контакт владельца |
| OWNER_TELEGRAM_ID | Положительный безопасный integer, фактический аккаунт владельца; обязателен для owner-only отчётов |
| ADMIN_IDS | Необязательный env при существующих public.admins; оператор обязан проверить право подтверждения чеков, а не предполагать его по username |
| ANALYTICS_ADMIN_IDS | Необязательно, только явные дополнительные grants; customers остаётся owner-only |
| ANALYTICS_SIGNING_SECRET | Минимум 32 символа, серверный секрет; не помещать в NEXT_PUBLIC_* |
| KASPI_PHONE / KASPI_NAME | Существующие реквизиты, не менять этой задачей; сверить владельцем |
| PAYMENT_CARD_NUMBER | Необязательно; отсутствие сохраняет оплату по телефону. Не запрашивать CVV/срок действия |
| PUBLIC_BASE_URL | HTTPS текущего production origin; есть прежний default, но оператор проверяет правильность. Preview/staging не должны отправлять пользователей на чужой runtime |
| SUPABASE_URL | HTTPS нужного существующего проекта, есть default; проверить совпадение проекта с DB/gate, не создавать новый |
| STORAGE_GATE_SECRET | Уже существующий серверный секрет, совпадает с deployed storage-gate; не вращать без разрешения |
| VENUE_MAP_PICKER_URL | Необязательно, HTTPS того же origin. Каталог/ссылки/Telegram location работают без MapGL API key |
| SUPABASE_SERVICE_ROLE_KEY **или** SUPABASE_SECRET_KEYS | Только в Supabase edge storage-gate, существующая service credential. Не добавлять в Next/browser/репозиторий. SUPABASE_URL там также должен присутствовать |
| PIXABAY_API_KEY | Только если отдельно понадобится старый инструмент получения картин; не нужен штатному боту/каталогу для этого выпуска |
| cron_secret | Существующий DB Vault secret, не env; проверить существование cron-checker/job без раскрытия секрета |

Локально нужные секреты/DB credentials отсутствуют; defaults URL имеют корректный HTTPS-формат. Vercel Production/Preview и Edge env **не прочитаны и не проверены** — локальный missing не выдаётся за missing в рабочем Vercel. Проверить env в существующем проекте только по наличию, scope и валидности; не нажимать Reveal, не экспортировать значения в GitHub/чат. Preview smoke не гарантирует изоляцию: даже staged deployment может использовать production env; тестовый write-path разрешён только после проверки тестовых ресурсов.

## Preview

GitHub status на runtime SHA сообщает успешный [deployment](https://vercel.com/scanizi/inviteizi/HXRxRhC6dpDJZd9tEtVhwjP4fJJe). [Branch Preview](https://inviteizi-git-feature-inviteizi-upgrade-scanizi.vercel.app) защищён входом Vercel. Анонимный GET доходит до login, поэтому каталог/карты/new designs в удалённой среде пока NOT VERIFIED. После последнего commit/push сверить headRevision свежих checks; успех статуса старого SHA не переносить на новый автоматически.

Владелец с обычным разрешённым доступом открывает Preview, убеждается в совпадении SHA и проходит только публичные /catalog, 50 /demo/ID, обложки/OG, карты (точные href), открытия/scroll/music play-pause на телефоне. /demo/ID/long и /dev/music закрыты в production. Не отключать protection, не создавать bypass key и не регистрировать production webhook для smoke. До isolated env не делать checkout/upload/admin callbacks; без реальной оплаты использовать только заранее одобренные тестовые данные и отдельную тестовую БД/Storage.

## Точный порядок выпуска владельцем

Каждая операция записи ниже **план**, сейчас она не выполнена и не разрешена автоматически.

1. **Зафиксировать кандидата:** финальный SHA PR #1, main SHA, git tree, Vercel deployment ID, прошедшие checks и отчёт. При новых runtime-коммитах приёмку повторить. Согласовать окно и человека, принимающего GO/NO-GO.
2. **Резервная копия и проверка восстановления:** получить актуальную DB backup с timestamp, schema/data/roles/grants и отдельный безопасный снимок необходимых Storage-объектов/metadata. Зашифрованные файлы вне Git/чатов. Если уже доступна изолированная настоящая PostgreSQL, проверить restore и counts/paid snapshots/FK/RLS/функции/RTO; при её отсутствии ничего не устанавливать и указать непроверенную восстановимость. Согласовать полноту доступной ручной копии и RPO. DB backup не содержит байты Storage; custom-role passwords не входят в daily backup ([Supabase](https://supabase.com/docs/guides/platform/backups)). Возможность restore здесь не доказана; подписать акт проверки до релиза.
3. **Испытать миграции доступными средствами:** только отсутствующие утверждённые файлы, правильная роль, таймауты/атомарность. PGlite и старый/новый SQL adapter уже проверены; native repo tests — только если отдельная среда уже есть. Полноценный внешний тест остаётся NOT VERIFIED без подходящего доступа: не устанавливать PostgreSQL/Docker и не выдавать PGlite за него. Реальные schema/RLS/history сверить read-only через существующий Dashboard; запись и тестовые операции только после отдельного разрешения.
4. **Разрешение владельца на production SQL:** сверить project identity/read-only history и exact migration names/hashes, backup ID и restore proof. Владелец отдельно разрешает только отсутствующие совместимые миграции. Применить их под контролем оператора; при ошибке STOP, не повторять исторические SQL вслепую. Заказы/суммы/slug не обновлять.
5. **Env:** сверить имена/наличие/scope, owner/admin access и gate. Изменять только согласованные необходимые значения; не менять действующие платёжные данные/token/webhook. Проверить preflight без вывода значений; Vercel env изменения могут требовать нового deployment.
6. **Seed после отдельного review/разрешения:** dry-run финального SHA + DB before/after plan, 50 активных, hidden anor-bogi, исторические paid IDs/суммы/ссылки сохранены. Не запускать write при неизвестных historical templates. После разрешения выполнить только reviewed план и проверить результат чтением.
7. **Storage:** HEAD/hash/тип/доступность существующих art/covers/OG/music, private receipts/deploy, gate и own playback на isolated fixture. music-sync запрещён в этой подготовке; никаких удалений и массового upsert. Отдельное разрешение нужно на конкретные отсутствующие объекты. До распространения музыки закрыть документальные права либо согласовать законную замену.
8. **Разрешение на Merge и production deployment:** только после всех gate PASS владелец подтверждает PR #1/точный SHA и существующий Vercel проект. Merge в main может сам вызвать production deploy; не считать их независимыми безопасными шагами. Проверить, что merge tree соответствует одобренному коду, следить за текущим deployment/checks. Этой задачей Merge/Deploy не выполняются.
9. **Webhook/Telegram после разрешённого выпуска:** сначала read-only getWebhookInfo/getMe, ожидаемый origin/secret scope/pending/error metrics без вывода token. Не вызывать setWebhook и не менять токены автоматически. Затем разрешённый реальный тест текущего бота на собственном тестовом аккаунте RU/UZ, без реального перевода денег.
10. **Старое оплаченное и новый тестовый сценарий:** владелец открывает выбранную существующую ссылку (data/amount/slug не меняет), проверяет новый 24-hour demo → receipt → owner confirm в согласованном тестовом контуре. Повтор callback, отказ, resend, music/none и карты. Если нужен production test-order/manual confirm — отдельное явное разрешение, не выдавать фикстуру за настоящую продажу и не удалять её самовольно.
11. **Наблюдение и rollback:** закрепить ответственного, сигналы остановки (5xx/webhook retry, ошибки оплаты/ссылок/Storage), совместимый target artifact, rollback rehearsal и план сверки новых заказов. До окончания окна не вращать токены/gate secrets и не удалять старые assets/records.

## Rollback: приложение и Supabase — разные операции

**Vercel rollback не откатывает Supabase, Storage, внешние webhook или изменения секретов.** По умолчанию оставить расширенные CHECK/таблицы аналитики/избранное: старый SQL adapter их переносит. Не удалять таблицы/колонки и не сужать format CHECK, когда существуют Scroll-заказы. Не пересчитывать amount и не возвращать seed массовой синхронизацией.

**Старый main не является безопасным универсальным rollback target.** В нём зарегистрирован 21 ID; все они сохранены здесь, но **30 активных feature ID отсутствуют в main**. После появления заказов на эти дизайны старый renderer не сможет показать их страницы. Старый bot также не обязан понимать новые step/callback и Scroll-каталог, даже если SQL читает строки. Это доказанный rollback-риск, а не ошибка прошедшего SQL-теста.

До выпуска подготовить и проверить совместимый rollback build в существующем проекте: он сохраняет все 51 зарегистрированный renderer, 50 видимых дизайнов, 3 формата, новые/старые поля/ссылки и чтение будущей схемы. Должен обслуживать старую оплаченную и новую feature-ссылку после отката. Нельзя просто переключить production на старый main или произвольный Preview с чужими env. Если совместимого artifact/restore rehearsal нет — **NO-GO**; предпочтителен минимальный forward fix с сохранением registry/data.

Если проблема только кода, после отдельного разрешения переключить на проверенный совместимый artifact и проверить обе ссылки/бота. Если проблема данных, остановить изменения по согласованной процедуре, сохранить текущее состояние/новые заказы, оценить потери с владельцем и только с новым разрешением восстанавливать DB/Storage из проверенной копии. Не восстанавливать production DB автоматически вслед за rollback Vercel: это может потерять новые оплаты/пользователей. Новые заказы после backup нуждаются в отдельной сверке/восстановлении.

## Что остаётся блокером и как выдать финальное разрешение

1. **Доступ к Preview smoke** и сверка его актуального SHA; текущая защита не менялась.
2. **Сверка реального Supabase/Telegram/Storage**, production migration history/grants/env и исторических paid template IDs пока не выполнена. Native-тесты остаются SKIP без требования установки/покупки.
3. **Backup/restore proof и совместимый rollback artifact для всех 50 дизайнов** не представлены; откат на старый main небезопасен для 30 новых ID.
4. **Коммерческие права музыки:** подтверждений 0, требуются документы на конкретные записи либо одобренные законные материалы.

Vercel сообщил успешный Preview deployment на runtime SHA — это закрывает вопрос существования сборки там, но не прохождение защищённого smoke или пригодность production env. Нативная нагрузка/пулер и реальные устройства не измерены. Локальные проверки PASS не превращают эти NOT VERIFIED в GO.

Когда доказательства gate готовы, владелец указывает отдельно: одобренный финальный SHA PR #1; целевой существующий Supabase/Vercel проект; backup timestamp и restore proof; exact миграции и seed diff; разрешённые env/объекты (без секретных значений в чате); совместимый rollback deployment; разрешение Merge/production Deploy. До такого сообщения остаётся **NO-GO**, действия записи не выполняются.

## Официальные основания процедуры (проверены 28.10.2026)

- [Supabase Backups](https://supabase.com/docs/guides/platform/backups): backup DB не включает байты Storage и пароли custom roles; восстановление требует планирования простоя.
- [Vercel rollback](https://vercel.com/docs/deployments/rollback-production-deployment): откат deployment решает сторону приложения; внешнее состояние проверяется отдельно.
- [Vercel environments](https://vercel.com/docs/deployments/environments): branch push может создавать Preview, merge production branch — production deployment; staged production использует production env и не гарантирует тестовую изоляцию.

В этой задаче не созданы новый проект/бот/БД, не выполнены production migrations/seed/upload/music-sync/Merge/Deploy/setWebhook. Изменения только в текущей feature-ветке и существующем PR #1.
