# Общие правила для каждого пилота InviteIZI (читать полностью)

Проект: `D:\Apps\DVRNBK\Projects Claude\Tg Bot inviting\inviteizi` (Next.js 16.4 App Router, React 19, Tailwind 4, `motion` 14 = Framer Motion, импорт из `motion/react`).
Это НЕ тот Next.js, который ты знаешь: при сомнениях читай `node_modules/next/dist/docs/`. Например, у `next/image` вместо `priority` теперь `preload` (лучше `loading="eager"` / `fetchPriority="high"`).
Главная цель владельца: «открываю на телефоне — и у меня открывается рот». Это витрина качества для ещё 55 дизайнов. Делай медленно и идеально, не быстро и средне.

## Что уже готово (не переписывай, используй)
- `lib/types.ts` — `InvitationData` (occasion, groom/bride/person/relation/cause/age, hosts, events[] с date/time/venueName/address/location).
- `lib/pilot-samples.ts` — примерные данные всех пяти пилотов. Не меняй.
- `texts/uz-cyrl.ts` — ВСЕ тексты (узбекский, кириллица). В шаблоне не должно быть ни одного узбекского слова строкой — только `t.…`. Полезное: `t.invite(data)` → `{greeting, body}` (через `inv.text`), `t.occasionTitles`, `t.eventTitles`, `t.countdown.title[occasion]`, `t.date.title[occasion]`, `t.date.long/short/dayAndTime/monthYear`, `t.weekdays`, `t.months`, `t.weekdaysShort`, `t.venue.openMap/title/programTitle`, `t.heart.title`, `t.heart.text[occasion]`, `t.hosts.respectDeep/respect/waiting/closing`, `t.causeLine(data)`, `t.jubileeLine(data)`, `t.ageLabel`, `t.relationWord(relation)`, `t.opening.tapToOpen`, `t.cover.inviteEyebrow/and/andWord/scrollHint`.
  Если нужного текста нет — ДОБАВЬ его в `texts/uz-cyrl.ts` ТОЛЬКО одной точечной правкой (Edit), в новый раздел `pilot.<твой-id>` в конце объекта `t` (перед `} as const;`). Чужие разделы не трогай. Грамотный узбекский-кирилл, уважительный тон.
- `templates/blocks/`:
  - `useInvitation(data, mode, { melody, opening })` → `inv` с `inv.text`, `inv.events` (у каждого `title`, `when: WeddingDate`, `mapHref`), `inv.main` (первое событие), `inv.started`, `inv.opened`, `inv.start()` (вызывать прямо в onClick заставки — запускает музыку), `inv.finishOpening()` (вызвать, когда анимация открытия закончилась), `inv.playing`, `inv.hasMusic`. `opening: false` — для дизайна без заставки (Оддий): открыт сразу, музыка по кнопке ▶.
  - `InvitationShell` — колонка 430px по центру, кнопка ▶/⏸ (появляется после открытия), водяной знак «НАМУНА» в режиме demo. Пропсы: `style={designVars(palette, fonts)}`, `backdropClassName` (фон по бокам на компьютере), `musicButtonClassName` (вид кнопки музыки под дизайн), `pageColor` (цвет html для «пружины» iPhone).
  - `synth.ts` — движок мелодии WebAudio. Ты пишешь `melody.ts` со своей `Score` (bpm, loopBeats, tracks с инструментами dutor/chang/nay/surnay/bell/pad/bass и нотами `[доля, "D4", длительность, громкость]`, drums дойры `dum/tak/zang`). Цикл 16–32 такта, мелодия красивая и узнаваемо восточная (лады: эолийский/фригийский/хиджаз с увеличенной секундой), не раздражает при повторе. Громкость сурная — осторожно.
  - `Reveal` (эффекты rise/spotlight/fade/unroll) — появление блоков при листании. Используй ЕГО для всех блоков ниже первого экрана (он гарантирует: ≤0,35 с и никогда нет пустого экрана). Не делай свои whileInView с opacity 0.
  - `Calendar`, `Countdown` (оформление через пропсы `look`), `MapButton` (`href={ev.mapHref}`, вид через className), `MusicButton`, `Petals` (золотые хлопья), `Watermark`.
  - CSS (app/globals.css): `.gold-text` (градиент с бликом), `.gold-fill` (золотая заливка), `.gold-shine` (бегущий блик, добавлять к .gold-text), `.soft-pulse`, `.petal`. Tailwind-цвета: `bg-paper text-ink text-muted text-gold text-gold-light bg-primary …` из CSS-переменных палитры; шрифты `font-display font-accent font-body`.
- `templates/themes/types.ts` — `TemplateProps {data, mode}`, `Palette`, `DesignFonts`, `designVars()`. Золото в палитре: `gold: "#B8892F", goldLight: "#F3D58A"`; тёмный край `#A87A28` задан в `--c-gold-deep`.
- `templates/registry.ts` уже ссылается на твой файл (default export компонента). Сейчас там ЗАГЛУШКА — замени её.
- `app/demo/[template]` (полная версия) и `app/demo/[template]/namuna` (демо: водяной знак, без музыки) — готовы.
- Сервер разработки уже запущен: http://localhost:3000 (не запускай второй, не запускай `npm run build` — сборку делает координатор в конце).

## Где работать
Только в своей папке `templates/themes/<id>/` (+ свой раздел в `texts/uz-cyrl.ts`, + свои файлы в `public/art/` или `public/<id>/`, если нужны SVG/текстуры). Общие блоки и чужие папки НЕ меняй. Если без правки общего блока никак — не меняй, а опиши в отчёте, что и зачем.
Рекомендуемые файлы: `<Component>.tsx` (сборка страницы), `Opening.tsx` (заставка), `decor.tsx` (SVG-орнаменты), `fonts.ts` (next/font/google, обязательно `subsets: ["cyrillic", "cyrillic-ext"]`), `palette.ts`, `melody.ts`.
Не делай git commit — коммитит координатор.

## Жёсткие правила (каждое проверяется)
1. Только телефон: вёрстка 360–430px, на компьютере — колонка 430px (даёт Shell). Нет горизонтальной прокрутки. Ничего не вылезает за экран (декор за краем — `overflow-hidden` у контейнера и `aria-hidden`).
2. Узбекский кирилл, грамотно; ў қ ғ ҳ видны в выбранных шрифтах (проверь глазами на скриншоте — нет «квадратиков» и выпадающих в другой шрифт букв).
3. Текст ≥ 16px (мелкие подписи-капсы вроде «КУН/СОАТ» допустимы от 12px, но не абзацы). Имена крупные. Контраст хороший, на тёмном — светлый текст.
4. Золото — только градиентом с бликом (`.gold-text`, `.gold-fill`, SVG `linearGradient` с 3+ стопами #A87A28 → #B8892F → #F3D58A → #B8892F), никогда плоский жёлтый.
5. Музыка только после нажатия. Своя мелодия в `melody.ts`. В /namuna музыки нет (это делает useInvitation).
6. Карта: «Харитада очиш» → `ev.mapHref` (2GIS по координатам). У каждого события своя кнопка.
7. Анимации плавные (только transform/opacity/clip-path/filter на небольших слоях; никаких анимаций width/height/top/left; `will-change` по делу). Открытие 2–4 с, затем `inv.finishOpening()`. Первый экран за ≤ 2 с: картины через `next/image` (`loading="eager"` + `fetchPriority="high"` только для первой видимой картины), остальное lazy. Никаких тяжёлых библиотек.
8. Блоки ниже первого экрана — через `Reveal`. При быстром листании никогда нет пустого экрана.
9. Стиль: местный, нарядный, дорогой, нежный. Нельзя: ночь и звёзды, космос, неон, мультяшность, «роботный» вид, европейский минимализм, иранские/афганские/индийские мотивы. Узбекские мотивы: ислими, гирих, сюзане, ганч, атлас, гранат, пахта.
10. Элемент, по которому нажимают для открытия, помечай атрибутом `data-open` (по нему работает скрипт проверки). Декоративные слои, которые намеренно выходят за край, помечай `aria-hidden` или `data-decor`.
11. Код читается как окружающий: TypeScript, функциональные компоненты, короткие комментарии по-русски там, где неочевидно.

## Проверка (обязательно, до отчёта)
1. `npx tsc --noEmit -p .` — без ошибок в твоих файлах (ошибки в чужих папках игнорируй — другие пилоты в работе).
2. `npx eslint templates/themes/<id>` — без ошибок.
3. `node scripts/check-pilot.mjs <id> --mid=<мс середины открытия>` — делает скриншоты в `pilots-screens/<id>/375x812/` и `360x640/` (01-cover, 02-opening, 03-opened, 04-middle, 05-end, 06-namuna) и печатает отчёт. Требования к отчёту: `consoleErrors` и `namunaConsoleErrors` пусты; `horizontalOverflow: false`; `offscreen` пуст; `blankScreens` пуст; `smallText` пуст (или только подписи-капсы, объясни); `mapLinks` — по числу событий; `musicPlaying: true` (для дизайна с заставкой) / `musicButton: true` (для Оддий); `namunaWatermark: true`; `namunaMusicButton: false`.
4. ОТКРОЙ И ПОСМОТРИ каждый скриншот (Read по пути файла) и пройди «проверку капризного клиента». Всё должно быть «да»:
   1) Первая секунда «вау»: заставка/обложка сразу красивая, хочется показать родственникам.
   2) Не похож на соседей: своя картина, раскладка, орнамент, открытие.
   3) Дорого, а не дёшево: нет пиксельных картинок, кривых отступов, «пластмассового» золота.
   4) Читается на телефоне: имена крупные, текст ≥ 16px, хороший контраст.
   5) Узбекский по духу: узнаваемые мотивы, грамотный кирилл, уважительные формулы.
   6) Быстро: без пустых экранов, плавно.
   7) Современно: аккуратная типографика, воздух, мягкие тени; не «открытка из 2005 года».
   8) Музыка и карта работают.
   Если хоть один пункт «нет» — исправь и сними скриншоты заново. Повторяй, пока не будет «да» по всем 8 в обоих размерах.
5. Скриншоты в браузере можно делать и своим кодом на `playwright-core` (`chromium.launch({channel: "chrome"})`), например кадры анимации открытия. MCP-браузер playwright НЕ используй — он общий, им пользуются другие агенты.

## Отчёт
Полный отчёт запиши в файл, который назовёт координатор: что сделано (файлы), какое визуальное решение, итог `check-pilot` (JSON кратко), твоя честная оценка по 8 пунктам с одной строкой на пункт, что получилось хуже, чем хотелось. В ответ координатору — только статус (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), список файлов и 1–3 строки о проблемах.
