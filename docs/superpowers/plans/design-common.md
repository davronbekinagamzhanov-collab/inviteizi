# Общие правила для каждого нового дизайна InviteIZI (читать полностью)

Проект: `D:\Apps\DVRNBK\Projects Claude\Tg Bot inviting\inviteizi` (Next.js 16.4 App Router, React 19, Tailwind 4, `motion` 14 = Framer Motion, импорт из `motion/react`).
Это НЕ тот Next.js, который ты знаешь: при сомнениях читай `node_modules/next/dist/docs/`. У `next/image` вместо `priority` — `loading="eager"` + `fetchPriority="high"`.

**Цель владельца:** «открываю на телефоне — и у меня открывается рот». Клиенту должно быть трудно выбрать между дизайнами. Уровень — не ниже эталонов: https://nozima-davlatbek-weddingday.lovable.app, https://sunnat-toy.lovable.app и пилотов «Олтин монограмма» (`templates/themes/oltin-monogramma/`) и «Сапфир» (`templates/themes/sapfir/`). Прочитай код этих двух пилотов перед работой: там видно, как устроены заставка, обложка, секции, `Reveal`, таймер, календарь, карточки событий.

**Не должно выглядеть «как сделал ИИ»:** никаких одинаковых белых карточек с тенями друг под другом, шаблонных градиентов «фиолетовый→розовый», эмодзи, иконок из наборов. Аккуратная типографика (кегли, межбуквенные интервалы у капсов, висячие строки), воздух, точные отступы, тонкие орнаменты SVG (ислими, гирих, сюзане, ганч), детали, которые хочется рассматривать. Как дорогой дизайнер-полиграфист, а не конструктор сайтов.

## Что уже готово (не переписывай, используй)
- `lib/types.ts` — `InvitationData`: occasion (`nikoh | nahorgi | sunnat | yubiley`), groom/bride/person/relation/cause/age, hosts, `sides?: {groom?, bride?}` (Куёв томони / Келин томони), `events[]` (1–3 штуки; kind: `nahorgi | nikohMarosim | nikohBazm | kelinSalom | sunnatBazm | yubileyBazm`; date, time, venueName, address, location).
- `lib/samples.ts` — `samples[occasion]` (данные демо) и `longSamples[occasion]` (длинные имена, 3 тадбира — для проверки вёрстки). Не меняй.
- `texts/uz-cyrl.ts` — ВСЕ тексты (узбекский, кириллица). В шаблоне не должно быть ни одного узбекского слова строкой — только `t.…`. Полезное:
  `t.invite(data)` → `{greeting, body}` (через `inv.text`), `t.occasionTitles`, `t.eventTitles[kind]`, `t.countdown.title[occasion]`, `t.date.title[occasion]`, `t.date.long/short/dayAndTime/monthYear/clock/morningAt/at`, `t.weekdays`, `t.months`, `t.weekdaysShort`, `t.venue.openMap/title/programTitle` («Тўй дастури»), `t.heart.title/text[occasion]`, `t.blessing.title` («Оқ фотиҳа») / `t.blessing.text[occasion]` (через `inv.blessing`), `t.sides.groom/bride` («Куёв томони»/«Келин томони»), `t.hosts.thanks` («Ташрифингиздан мамнун бўламиз!») / `respectDeep` («Ҳурмат ва эҳтиром билан») / `respect` / `waiting` / `closing`, `t.causeLine(data)`, `t.jubileeLine(data)`, `t.relationWord(relation)`, `t.opening.tapToOpen/invitation/welcome`, `t.cover.inviteEyebrow/and/andWord/scrollHint`, `t.designs[id]`.
  Если нужного текста нет — добавь его ТОЛЬКО в свою строку `t.design["<твой-id>"]` (она уже есть, сейчас `{}`), одной точечной правкой (Edit). Если Edit упал, потому что файл изменился, — перечитай и повтори. Чужие строки не трогай. Грамотный узбекский-кирилл, уважительный тон. Все твои новые фразы перечисли в отчёте — их проверит ТЕКСТОВИК.
- `templates/blocks/`:
  - `useInvitation(data, mode, { melody, opening })` → `inv`: `inv.text`, `inv.events` (у каждого `title`, `when: WeddingDate`, `mapHref`), `inv.main` (первое событие), `inv.program` (все тадбиры по времени — для «Тўй дастури»), `inv.sides`, `inv.blessing`, `inv.isMorning`, `inv.started`, `inv.opened`, `inv.start()` (вызывать прямо в onClick заставки — запускает музыку), `inv.finishOpening()` (когда анимация открытия закончилась), `inv.playing`, `inv.hasMusic`. `opening: false` — для Оддий (открыт сразу, музыка по кнопке ▶).
  - `InvitationShell` — колонка 430px, кнопка ▶/⏸, водяной знак «НАМУНА» с подписью в demo. Пропсы: `style={designVars(palette, fonts)}`, `fontsClassName`, `backdropClassName`, `musicButtonClassName`, `pageColor`.
  - `PhotoBackdrop` — фото, которое растворяется в цвет дизайна (`fade`: to-top / to-bottom / both / radial; `opacity`, `strength`, `position`, `priority`). Размытие уже «запечено» в файл.
  - `synth.ts` — движок мелодии WebAudio. Ты пишешь `melody.ts` со своей `Score` (bpm, loopBeats, tracks: dutor/chang/nay/surnay/bell/pad/bass, ноты `[доля, "D4", длительность, громкость]`, дойра `dum/tak/zang`). Цикл 16–32 такта, узнаваемо восточная (эолийский/фригийский/хиджаз), не раздражает при повторе. Своя у каждого дизайна. Для наҳорги ош — спокойная утренняя.
  - `Reveal` (rise/spotlight/fade/unroll) — для ВСЕХ блоков ниже первого экрана (≤ 0,35 с, никогда нет пустого экрана). Не делай свои whileInView с opacity 0.
  - `Calendar`, `Countdown` (вид через `look`), `MapButton` (`href={ev.mapHref}`), `MusicButton`, `Petals`, `Watermark`.
  - CSS (app/globals.css): `.gold-text`, `.gold-fill`, `.gold-shine`, `.soft-pulse`, `.petal`. Tailwind-цвета `bg-paper text-ink text-muted text-gold text-gold-light bg-primary …`; шрифты `font-display font-accent font-body`.
- `templates/themes/types.ts` — `TemplateProps {data, mode}`, `Palette`, `DesignFonts`, `designVars()`.
- `templates/registry.ts` уже ссылается на `templates/themes/<id>/Design.tsx` (default export). Сейчас там ЗАГЛУШКА — замени файл целиком. Реестр не меняй.
- Демо: `/demo/<id>` (полная), `/demo/<id>/namuna` (водяной знак, без музыки), `/demo/<id>/long` (трудные данные).
- Сервер разработки уже запущен: http://localhost:3000. Не запускай второй, не запускай `npm run build`. Если он не отвечает — запусти его через `mcp__Claude_Browser__preview_start` с `{name: "inviteizi-dev"}` (если сервер жив, команда его переиспользует). Твой код никогда не должен ронять компиляцию (сломанный импорт шрифта ломает сервер ВСЕМ агентам) — проверяй `/catalog` после правок шрифтов.

## Где работать
Только в `templates/themes/<id>/` (+ своя строка `t.design["<id>"]` в `texts/uz-cyrl.ts`, + свои файлы `public/art/<id>*.webp`). Общие блоки и чужие папки НЕ меняй — если без правки никак, опиши в отчёте. Не делай git commit.
Рекомендуемые файлы: `Design.tsx`, `Opening.tsx` (заставка), `decor.tsx` (SVG), `style.ts` (шрифты next/font/google с `subsets: ["cyrillic","cyrillic-ext"]` + палитра), `melody.ts`.
Имена CSS-переменных шрифтов делай уникальными: `--<короткий-id>-display` и т.п.

## Фото (только если в задании «с фото»)
1. `node --env-file=.env.local scripts/pixabay.mjs search <id> "<english query>" --n=12` → открой `art-raw/<id>/sheet.jpg` (Read) и выбери.
2. `node --env-file=.env.local scripts/pixabay.mjs pick <id> <номер> --blur=3` → `public/art/<id>.webp` (≤ 300 КБ) + автор в `public/art/CREDITS.md`. Blur 2–6.
3. Нужно второе фото — `--name=<id>-2` при pick (после нового search).
Без крупных лиц, без надписей, без людей в европейской одежде, без явно иностранной архитектуры. Фото — МЯГКИЙ фон (как sunnat-toy): размыто, тает в цвет дизайна, текст поверх читается легко. Не делай поисковых запросов чаще раза в 10 секунд. Нет подходящего фото после 3–4 запросов — сделай этот слой орнаментом кодом и напиши в отчёте.

## Жёсткие правила (каждое проверяется)
1. Только телефон 360–430px; колонку 430px даёт Shell. Нет горизонтальной прокрутки, ничего не вылезает (декор за краем — `overflow-hidden` и `aria-hidden`/`data-decor`).
2. Узбекский кирилл, ў қ ғ ҳ в выбранных шрифтах (скрипт проверки ловит запасной шрифт).
3. Текст ≥ 16px (подписи-капсы «КУН/СОАТ» — от 12px, но не абзацы). Имена крупные. Контраст хороший.
4. Золото — только градиентом с бликом (`.gold-text`, `.gold-fill`, SVG `linearGradient` 3+ стопа). Никогда плоский жёлтый.
5. Музыка только после нажатия. В /namuna музыки нет (делает useInvitation).
6. Карта: у каждого события своя кнопка «Харитада очиш» → `ev.mapHref`.
7. Анимации плавные: только transform/opacity/clip-path/filter на небольших слоях. Открытие 2–4 с, затем `inv.finishOpening()`. Первый экран ≤ 2 с. Никаких новых библиотек.
8. Блоки ниже первого экрана — через `Reveal`. Пустого экрана не бывает.
9. Стиль: местный, нарядный, дорогой, нежный. Нельзя: ночь и звёзды, космос, неон, мультяшность, «роботный» вид, европейский минимализм, иранские/афганские/индийские мотивы.
10. Элемент, по которому нажимают для открытия, — атрибут `data-open`.
11. Узбекские детали — минимум 2 из: «Куёв томони / Келин томони» (`inv.sides`, для никоҳ); «Тўй дастури» с временем (`inv.program`); оқ фотиҳа/тилак в рамке (`inv.blessing`); символы (анор, пахта, бодом гули, беҳи, нон, сюзане, атлас, адрас, ганч, кошин Риштана, ислими, дойра); живая деталь (ислими прорисовывается, волна атласа, пар над казаном, свечение тандира, золотая пыль, лепестки). Наҳорги ош: «эрталаб соат 6:00» (`t.date.morningAt`), утро, казан/тандир/дастурхон/чой, тон уважительный.
12. Механика блоков как в эталоне 1: имена/монограмма, «Тўй санаси» (день недели · число · месяц · время · год), календарь с отметкой (в Анимацияли), «… гача қолди» (таймер), место + карта на каждый тадбир, «Чин юракдан» или оқ фотиҳа, хозяева («Ҳурмат ва эҳтиром билан: … оиласи»). Оддий — всё это компактно на одном-полутора экранах, без заставки, с мягким появлением.
13. Код читается как пилоты: TypeScript, функциональные компоненты, короткие комментарии по-русски там, где неочевидно.

## Проверка (обязательно, до отчёта)
1. `npx tsc --noEmit -p .` — без ошибок в твоих файлах (ошибки в `.next/types` и чужих папках игнорируй).
2. `npx eslint templates/themes/<id>` — без ошибок.
3. `node scripts/check-template.mjs <id> --mid=<мс середины открытия>` и `node scripts/check-template.mjs <id> --sample=long`. В конце вывода должно быть «OK: проблем не найдено» для обоих прогонов. Скриншоты: `screens/<id>/…` и `screens/<id>-long/…`.
4. ОТКРОЙ И ПОСМОТРИ скриншоты (Read) обоих размеров и пройди «проверку капризного клиента» — всё «да»:
   1) Первая секунда «вау». 2) Не похож на соседей и пилотов. 3) Дорого (нет пикселей, кривых отступов, «пластмассового» золота). 4) Читается на телефоне. 5) Узбекский по духу, грамотный кирилл. 6) Быстро, без пустых экранов. 7) Современно: типографика, воздух. 8) Музыка и карта работают.
   Если хоть один пункт «нет» — исправь и сними заново.
5. Свои скриншоты можно делать кодом на `playwright-core` (`chromium.launch({channel: "chrome"})`), файлы складывай в `scripts/tmp/`. MCP-браузер playwright НЕ используй — он общий.

## Отчёт
Полный отчёт — в `docs/reviews/designs/<id>.md`: файлы; визуальная идея (2–3 предложения); шрифты и почему; фото (автор, ссылка) или «без фото»; какие узбекские детали; итог обоих прогонов check-template (строка OK/проблемы); честная оценка по 8 пунктам (по строке); список твоих новых фраз в `t.design["<id>"]`; что получилось хуже, чем хотелось.
В ответ координатору — только статус (DONE / DONE_WITH_CONCERNS / BLOCKED), путь к отчёту и 1–3 строки о проблемах.
