/**
 * Тексты БОТА на ўзбекском (кириллица). Ключи — те же, что в bot-ru.ts (тип отсюда).
 * Тон: дружелюбно и просто, коротко — ботом пользуются и пожилые люди.
 * Названия дизайнов и тадбиров для гостей — из texts/uz-cyrl.ts.
 */
import type { OrderStatus } from "@/lib/domain";
import type { EventKind, Relation } from "@/lib/types";
import { t } from "./uz-cyrl";

const eventKinds: Record<EventKind, string> = { ...t.eventTitles };

const statuses: Record<OrderStatus, string> = {
  draft: "📝 Қоралама",
  preview: "👁 Тўланмаган (НАМУНА)",
  awaiting_payment: "💳 Тўлов кутилмоқда",
  receipt_sent: "⏳ Чек текширилмоқда",
  active: "✅ Тўланган, фаол",
  archived: "📦 Муддати тугаган",
  rejected: "❌ Тўлов тасдиқланмади",
};

/** «Кем приходится» — подписи кнопок */
const relations: Record<Relation, string> = { ...t.relationLabel };

export const uz = {
  /** Профиль бота в Telegram (scripts/telegram-setup.mjs) */
  profile: {
    name: "InviteIZI — онлайн таклифнома",
    short: "Тўй, наҳорги ош, суннат ва юбилей учун чиройли онлайн таклифнома. 5 дақиқада, Kaspi орқали тўлов.",
    description:
      "💌 Ўзбекча онлайн таклифномалар: никоҳ тўйи, наҳорги ош, суннат тўйи, юбилей.\n✨ Чиройли дизайн, мусиқа, харита ва таймер — меҳмонларга битта ҳавола.\n⏱ 5 дақиқада тайёр, тўлов Kaspi орқали.\nБошлаш учун «Start» тугмасини босинг.",
    commands: { start: "Бошлаш", my: "Менинг таклифномаларим", favorites: "Танланган дизайнлар", help: "Ёрдам" },
    /** Только у админов: scripts/telegram-setup.mjs --admin-commands */
    adminCommands: { dashboard: "Бошқарув панели" },
  },

  langName: "Ўзбекча",
  chooseLang: "Тилни танланг / Выберите язык 👇",
  langUz: "🇺🇿 Ўзбекча",
  langRu: "🇷🇺 Русский",
  langKk: "🇰🇿 Қазақша",
  /** При KAZAKH_ENABLED: выбор из трёх языков */
  chooseLang3: "Тилни танланг / Выберите язык / Тілді таңдаңыз 👇",
  langSaved: "✅ Тил: ўзбекча.",

  menu: {
    create: "✨ Таклифнома яратиш",
    my: "📂 Менинг таклифномаларим",
    help: "💬 Ёрдам",
    lang: "🌐 Тил",
  },
  /** Надписи старой клавиатуры внизу: у кого она ещё видна, кнопки продолжают работать */
  menuLegacy: { create: "💌 Таклифнома яратиш", help: "❓ Ёрдам", lang: "🌐 Тил / Язык" },
  menuSaved: (n: number) => (n ? `❤️ Сақланганлар (${n})` : "❤️ Сақланганлар"),
  /** Кнопка меню Telegram у поля ввода — открывает приложение */
  menuButton: "✨ Очиш",

  welcome: (name: string | null) =>
    `Ассалому алайкум${name ? `, ${name}` : ""}! 🌸\nТелефонда очиладиган чиройли таклифнома — 5 дақиқада.\nПастдаги «✨ Таклифнома яратиш»ни босинг 👇`,
  idle: "Бошлаш учун «✨ Таклифнома яратиш»ни босинг 👇",
  help:
    "💬 Қандай буюртма қилинади:\n1. «✨ Таклифнома яратиш» → дизайнни танланг.\n2. Исмлар, сана ва жойни ёзинг — намунани дарров кўрасиз.\n3. Kaspi орқали тўлаб, чекни юборинг — ҳавола келади.\n\nСавол бўлса — «📞 Боғланиш» 👇",
  contact: "📞 Боғланиш",

  back: "⬅️ Орқага",
  unknown: "Тушунмадим 🙂",
  pressButton: "Илтимос, тугмалардан бирини босинг 👇",
  needLetters: "Илтимос, ҳарфлар билан ёзинг ✍️",
  sendText: "Илтимос, жавобни матн билан ёзинг ✍️",
  oldButton: "Бу тугма эскирган 👇",
  tooLong: (max: number) => `Жуда узун 🙂 ${max} белгигача ёзинг.`,
  ok: "👌",
  error: "😔 Хатолик юз берди. Бироздан кейин қайта уриниб кўринг.",

  category: {
    ask: "Қайси тўйга таклифнома керак? 👇",
    nikoh: "💍 Никоҳ тўйи",
    nahorgi: "🍚 Наҳорги ош",
    sunnat: "👦 Суннат тўйи",
    yubiley: "🎂 Юбилей",
  },

  format: {
    ask: "Қайси турдаги таклифнома? 👇",
    animated: (price: string) => `✨ Анимацияли — ${price}`,
    scroll: (price: string) => `📜 Варақланадиган — ${price}`,
    simple: (price: string) => `📄 Оддий — ${price}`,
    info: "ℹ️ Фарқи нимада?",
    infoText:
      "✨ Анимацияли — таклифнома чиройли анимация билан очилади.\n\n📜 Варақланадиган — бир нечта бўлим, бармоқ билан пастга варақлаб кўрилади.\n\n📄 Оддий — битта қисқа ва чиройли саҳифа.\n\nУчала турда ҳам мусиқа нархга киритилган.",
    names: { animated: "Анимацияли", scroll: "Варақланадиган", simple: "Оддий" },
  },

  catalog: {
    photoCredit: (author: string, license: string, source: string) => `Сурат: ${author} · ${license}\n${source}`,
    caption: (n: number, name: string, _format: string, price: string) => `№${n} · ${name}\n${price}`,
    /** Каталог в чате: альбом из 3 обложек, под ним строка на каждый дизайн */
    pageTitle: "Дизайнни танланг 👇\n«👁» — телефонда очиб кўриш.",
    line: (mark: string, n: number, name: string, price: string, photo: boolean) => `${mark} №${n} ${name} — ${price}${photo ? " · 📷 расм қўйса бўлади" : ""}`,
    pick: (mark: string) => `${mark} Шуни танлайман`,
    view: (mark: string) => `${mark} 👁 Намуна`,
    range: (from: number, to: number, total: number) => `${from}–${to} / ${total}`,
    chosen: (n: number, name: string) => `✅ Танланди: №${n} ${name}`,
    /** Строка под подписью у дизайнов, куда клиент может поставить своё фото */
    withPhoto: "📷 Расмингизни қўйса бўлади",
    demo: "👁 Намуна",
    buy: "🛒 Сотиб олиш",
    hint: "◀ ▶ — бошқа дизайнлар. «👁 Намуна» — телефонда очиб кўринг.",
  },

  form: {
    groom: "🤵 Куёвнинг исми?\nМасалан: Азиз",
    bride: "👰 Келиннинг исми?\nМасалан: Мадина",
    relationNikoh: "Тўй кимники? 👇",
    relationsNikoh: { farzand: "Фарзандларимиз", nabira: "Набираларимиз", ozimiz: "Ўзимизники" } as Partial<Record<Relation, string>>,
    hosts: "👨‍👩‍👧 Ким таклиф қиляпти?\nМасалан: Каримовлар оиласи",
    sideAsk: "Куёв томони — юқорида киритилган оила. Келин томони оиласини ҳам қўшамизми?",
    sideYes: "✍️ Ҳа, ёзаман",
    sideNo: "➡️ Йўқ, шарт эмас",
    sideBride: "Келин томони оиласи?\nМасалан: Юсуповлар оиласи",
    personNahorgi: "🍚 Наҳорги ош кимнинг тўйи муносабати билан?\nИсмини ёзинг. Масалан: Жасурбек",
    personYubiley: "🎂 Юбилярнинг исми?\nМасалан: Мукаррам опа",
    age: "🎂 Нечи ёшга тўлади?\nРақам билан ёзинг. Масалан: 60",
    badAge: "Ёшни рақам билан ёзинг 🙂\nМасалан: 60",
    personSunnat: "👦 Ўғил боланинг исми?\nМасалан: Муҳаммадали\nИккита бўлса: Абдураҳмонжон ва Абдуллоҳжон",
    relationPerson: (name: string) => `${name} сизга ким бўлади? 👇`,
    relations,
    cause: "Қайси тўй муносабати билан? 👇",
    causes: { nikoh: "💍 Никоҳ тўйи", sunnat: "👦 Суннат тўйи" },
  },

  event: {
    readyVenues: "🏛 Тайёр тўйхоналар",
    mapChoice: "🗺 Харитадан танлаш",
    linkChoice: "🔗 2GIS / Google Maps ҳаволаси",
    manualChoice: "✍️ Бошқа жой",
    manualPrompt: "🏛 Жой номини ёзинг. Бошқа шаҳар ёки хонадон ҳам бўлиши мумкин.",
    openPlace: "🗺 2GIS да очиш",
    venuesPrompt: "Тўйхонани танланг ёки бошқа саҳифани очинг. Бошқа жойни ҳам киритиш мумкин.",
    linkPrompt: "2GIS ёки Google Maps да жойни очинг, «Улашиш» орқали ҳаволасини шу ерга юборинг.",
    mapPrompt: "📎 → Локация орқали байрам жойини қидиринг ёки харитада белгини ўша жойга суринг. Ўзингиз турган жойни эмас, тадбир жойини танланг. Ёки 2GIS дан жой ҳаволасини юборинг.",
    kinds: eventKinds,
    date: (kind: string) => `📅 ${kind} қайси куни?\nКунни танланг 👇`,
    pastDate: "Ўтган кунни танлаб бўлмайди 🙂 Бугун ёки кейинги кунни танланг.",
    monthYear: (monthIndex: number, year: number) => `${t.months[monthIndex]} ${year}`,
    weekdays: [...t.weekdaysShort] as string[],
    sameDay: (kind: string, date: string) => `📅 ${kind} ҳам ${date} куними?`,
    sameDayYes: "✅ Ҳа, шу куни",
    sameDayNo: "📅 Бошқа кун",
    time: (kind: string) => `🕐 ${kind} соат нечада бошланади? 👇`,
    timeOther: "✍️ Бошқа вақт",
    timeCustom: "Вақтни ёзинг.\nМасалан: 18:30",
    pastTime: "Бу вақт ўтиб кетди, бошқа вақт танланг.",
    badTime: "Вақт нотўғри 🙂 Соат ва дақиқани ёзинг.\nМасалан: 18:30",
    venue: (kind: string) => `🏛 ${kind} қаерда ўтади?\nМасалан: «Наврўз» тўйхонаси ёки Каримовлар хонадони`,
    address: "🏠 Манзил?\nМасалан: Сайрам, Амир Темур кўчаси 45",
    location: "🗺 Тадбир жойини қандай белгилаймиз? Тайёр жой, харитадаги нуқта, ҳавола ёки қўлда киритишни танланг.",
    sendLocation: "📍 Локация юбориш",
    skip: "⏭ Ўтказиб юбориш",
    badLocation: "Тадбир жойини харитадан танланг ёки 2GIS / Google Maps ҳаволасини юборинг. Харитасиз давом этиш учун «⏭ Ўтказиб юбориш».",
    locationSaved: "✅ Жой сақланди.",
    more: (list: string) => `Қўшилган тадбирлар:\n${list}\n\nЯна тадбир қўшасизми? 👇`,
    addNahorgi: "🍚 Наҳорги ош",
    addKelinSalom: "🌸 Келин салом",
    addBazm: "🎊 Тўй базми",
    noMore: "✅ Йўқ, тамом",
    maxReached: "Энг кўпи 3 та тадбир бўлади. Давом этамиз 👇",
    line: (i: number, kind: string, date: string, time: string) => `${i}. ${kind} — ${date}, ${time}`,
  },

  text: {
    more: "🔄 Бошқа вариантлар",
    ask: (options: string) => `✍️ Таклифнома матнини танланг:\n\n${options}`,
    option: (i: number, greeting: string, body: string) => `${i}) ${greeting}\n${body}`,
    pick: (i: number) => `${i}-матн`,
    own: "✍️ Ўз матнимни ёзаман",
    ownAsk: "Матнингизни ёзинг (600 белгигача) ✍️",
    tooLong: (n: number) => `Матн узун: ${n} белги. 600 тадан ошмасин — бироз қисқартириб, қайта юборинг 🙏`,
  },

  pricing: {
    note: (a: string, b: string, c: string) => `Нарх фақат турига боғлиқ: ${a} / ${b} / ${c} ₸. Мусиқа, тадбирлар сони ва қўшимча имкониятлар (масалан, жавоблар) — бепул.`,
  },

  rsvp: {
    ask: "Меҳмонлар \"Келаман / Келолмайман\" деб жавоб бера олсинми?\nШунда неча киши келишини олдиндан биласиз.",
    yes: "✅ Ҳа",
    no: "❌ Йўқ",
    reviewOn: "Меҳмонлар жавоби: ҳа",
    reviewOff: "Меҳмонлар жавоби: йўқ",
    edit: "✏️ Жавоблар",
    answers: "📝 Жавоблар",
    howButton: "❓ Бу қандай ишлайди?",
    how: "Меҳмонлар таклифномада «Келаман» ёки «Келолмайман» тугмасини босади.\n\nЖавобларни бу ерда кўрасиз:\nМеню → Менинг таклифномаларим → 📝 Жавоблар\n\nЖавоблар тўловдан кейин сақланади.",
    digest: (replies: number, coming: number, people: number, declined: number) => `Бугун ${replies} киши жавоб берди: ${coming} келади (жами ${people} киши), ${declined} келолмайди`,
    empty: "Ҳозирча жавоб йўқ.",
    head: (replies: number, people: number, declined: number) => `📝 Жавоблар: ${replies}\nКелади: ${people} киши\nКелолмайди: ${declined}`,
    lineYes: (name: string, guests: number) => `✅ ${name} — ${guests} киши`,
    lineNo: (name: string) => `❌ ${name}`,
    more: (n: number) => `…яна ${n} та жавоб`,
  },

  photo: {
    ask: "📷 Таклифномага расмларингизни қўшасизми?\nМасалан, фотосессиядан 1–3 та расм.\nРасм бўлмаса, чиройли тайёр сурат қўямиз.",
    yes: "✅ Ҳа",
    no: "❌ Йўқ",
    example: "❓ Мисол",
    exampleText: (url: string) => `Мана, расм қаерда туришини кўринг 👇\n${url}\n\nСизнинг расмингиз шу жойда туради.`,
    uploadAsk: "Расмларни шу ерга юборинг: 1 тадан 3 тагача 📤\nОддий расм ёки файл бўлиб юборса ҳам бўлади (20 МБ гача).",
    accepted: (n: number) => `📷 Расмлар: ${n} та ✅\nЯна юборинг ёки «Тайёр»ни босинг.`,
    done: "✅ Тайёр",
    again: "🔄 Қайтадан",
    saving: "⏳ Расмни сақлаяпмиз…",
    full: (max: number) => `${max} та расм қабул қилинди — бу етарли 🙂`,
    needPhoto: "Расм юборинг, илтимос 🙏 (ёки «Тайёр»ни босинг)",
    tooBig: "Расм катта 🙂 20 МБ гача бўлган расм юборинг.",
    badFormat: "Бу расмни очиб бўлмади 😔 Бошқа расм юборинг (JPG, PNG ёки iPhone расми).",
    saveFailed: "😔 Расмни сақлаб бўлмади. Илтимос, қайта юборинг.",
    review: (n: number) => (n ? `Расмлар: ${n} та` : "Расмлар: тайёр сурат"),
    edit: "✏️ Расмлар",
  },

  music: {
    ask: "🎵 Таклифномада қайси мусиқа янграсин?\nРўйхатдан тайёр куйни танланг ёки ўзингизга ёққан қўшиқни юборинг: «Ўз қўшиғимни юбораман» тугмасини босиб, телефонингиздаги mp3 файлни ёки Telegram'даги қўшиқни шу ерга юборинг.",
    fromList: "🎵 Рўйхатдан танлаш",
    own: "📤 Ўз қўшиғимни юбораман",
    none: "🔇 Мусиқасиз",
    listAsk: "▶️ — тинглаш, ✅ — танлаш 👇",
    play: (title: string) => `▶️ ${title}`,
    choose: "✅",
    ownAsk: "Қўшиқни Telegram'даги каналдан шу ерга юборинг (forward) ёки mp3 файл юборинг (20 МБ гача) 📤\nТелефондаги \"Музыка\" бўлимидан юбориб бўлмайди.",
    sendFile: "Овозли хабар, видео ёки қўшиқ номи эмас, қўшиқнинг ўзи керак 🙏\nҚўшиқни Telegram'даги каналдан шу ерга юборинг (forward) ёки mp3 файл юборинг. Телефондаги \"Музыка\" бўлимидан юбориб бўлмайди.",
    tooBig: (mb: string) => `Файл катта: ${mb} МБ 🙂 20 МБ гача бўлган файл юборинг.`,
    tooBigUnknown: "Файл катта 🙂 20 МБ гача бўлган файл юборинг.",
    saved: "✅ Қўшиқ қабул қилинди.",
    saveFailed: "😔 Қўшиқни сақлаб бўлмади. Илтимос, файлни қайта юборинг.",
    previewFailed: "😔 Бу куйни тинглаб бўлмади. Қайта уриниб кўринг, бошқасини танланг ёки ўз файлингизни юборинг.",
    title: (s: string) => s,
  },

  review: {
    title: "✨ Бот сиз учун танлади. Хоҳласангиз ✏️ билан ўзгартиринг:",
    design: (n: number, name: string, _format: string, price: string) => `Дизайн: №${n} ${name} · ${price}`,
    groom: (s: string) => `Куёв: ${s}`,
    bride: (s: string) => `Келин: ${s}`,
    person: (s: string) => `Исм: ${s}`,
    relation: (s: string) => `Ким бўлади: ${s}`,
    age: (n: number) => `Ёши: ${n}`,
    cause: (s: string) => `Қайси тўй: ${s}`,
    hosts: (s: string) => `Таклиф қилувчи: ${s}`,
    sideGroom: (name: string) => "Куёв томони: " + name,
    sideBride: (s: string) => `Келин томони: ${s}`,
    event: (i: number, kind: string, date: string, time: string, venue: string, address: string, map: string) =>
      `${i}. ${kind}\n   ${date}, ${time}\n   ${venue}\n   ${address}\n   ${map}`,
    hasMap: "🗺 Харита: бор",
    noMap: "🗺 Харита: йўқ",
    textPreset: (i: number, s?: string) => `Матн: ${i}-вариант${s ? `\n«${s}»` : ""}`,
    textOwn: (s: string) => `Матн: ўз матнингиз («${s}…»)`,
    musicList: (s: string) => `Мусиқа: ${s}`,
    musicOwn: (s: string) => `Мусиқа: ўз қўшиғингиз (${s})`,
    musicNone: "Мусиқа: йўқ",
    editNames: "✏️ Исмлар",
    editRelation: "✏️ Ким бўлади",
    editAge: "✏️ Ёши",
    editCause: "✏️ Қайси тўй",
    editHosts: "✏️ Таклиф қилувчи",
    editSides: "✏️ Келин томони",
    editEvent: (i: number, kind: string) => `✏️ ${i}. ${kind}`,
    editText: "✏️ Матн",
    editMusic: "✏️ Мусиқа",
    editDesign: "✏️ Дизайн",
    confirm: "✅ Ҳаммаси тўғри",
    eventMenu: (kind: string) => `${kind}: нимани ўзгартирамиз? 👇`,
    evDate: "📅 Сана",
    evTime: "🕐 Вақт",
    evVenue: "🏛 Жой",
    evAddress: "🏠 Манзил",
    evLocation: "🗺 Локация",
    evDelete: "🗑 Тадбирни ўчириш",
  },

  order: {
    catalogChanged: "Каталог янгиланган. Тур ва дизайнни қайта танланг — киритган маълумотларингиз сақланади.",
    formatLocked: "Танланган дизайн бу турга мос келмади. «✏️ Дизайн» орқали қайта танланг.",
    created: (url: string) =>
      `🎉 Тайёр! Мана таклифномангиз (ҳозирча «НАМУНА» ёзуви билан):\n${url}\n\nНамуна буюртма яратилганидан 24 соат ишлайди. Таҳрир муддатни узайтирмайди. Тўлов тасдиқлангач, шу ҳавола тўлиқ очилади.\n🎵 Мусиқани ▶/⏸ тугмаси билан ёқиб-ўчириб кўришингиз мумкин.\n✏️ Тўловгача ҳаммасини ўзгартириш мумкин.`,
    updated: (url: string) => `✅ Ўзгаришлар сақланди. Ҳавола ўша-ўша:\n${url}`,
    pay: (price: string) => `💳 Тўлаш — ${price}`,
    edit: "✏️ Ўзгартириш",
    notFound: "Буюртма топилмади 🙁",
    closed: "🔒 Ҳавола берилган — таклифнома ёпилган.\nЎзгартириш керак бўлса, эгаси қўлда қилиб беради (2 000 ₸). Боғланинг 👇",
  },

  pay: {
    /** Проверка перед оплатой: без «✅ … тўлаймиз» реквизиты не показываются */
    check: (lines: string, url: string | null, terms: string) => `🔎 Тўловдан олдин текширинг:\n\n${lines}\n\n${url ? `👁 Намуна: ${url}` : "👁 Намуна 24 соатдан кейин ёпилган. Маълумотлар юқорида — тўлагач, ҳавола тўлиқ очилади."}\n\n⚠️ Тўловдан кейин таклифномани ўзгартириб бўлмайди ва пул қайтарилмайди. Намунани текширинг 👆\n\n📄 Шартлар: ${terms}\n«✅ Ҳаммаси тўғри» тугмаси — шартларга розилик.`,
    confirmYes: "✅ Ҳаммаси тўғри, тўлаймиз",
    /** Одно сообщение после оплаты (подпись к QR): ссылка, как разослать, спасибо */
    paidPack: (url: string) => `🎉 Тўлов тасдиқланди! Таклифномангиз тайёр:\n${url}\n\n📷 QR-код: меҳмон телефон камерасини қаратса, таклифнома очилади.\n📤 Меҳмонларга пастдаги тугма билан юборинг.\n\n🙏 Раҳмат! Тўйингиз муборак бўлсин!`,
    linkPack: (url: string) => `🔗 Таклифномангиз:\n${url}\n\n📷 QR-код: меҳмон телефон камерасини қаратса, таклифнома очилади.\n📤 Меҳмонларга пастдаги тугма билан юборинг.`,
    eventPassed: "Тадбир санаси ўтиб кетган — бундай таклифномага тўлов қабул қилмаймиз. «✏️ Ўзгартириш» орқали янги санани киритинг.",
    card: (number: string) => "Карта рақами: " + number,
    copyCard: "📋 Картани нусхалаш",
    info: (amount: string, phone: string, name: string, n: number) =>
      `💳 Kaspi орқали ${amount} ўтказинг:\n📱 ${phone}\n👤 ${name}\nИзоҳга ёзинг: #${n}\n\nКейин чекни (скриншот ёки PDF) шу ерга юборинг 📎`,
    copy: "📋 Рақамни нусхалаш",
    sendReceipt: "📎 Чекни юбориш",
    receiptAsk: "📎 Чекни сурат ёки PDF файл қилиб юборинг.",
    receiptBad: "Чекни сурат ёки PDF файл қилиб юборинг 🙏",
    receiptGot: "✅ Чек қабул қилинди. Текширилмоқда — одатда 5–30 дақиқа.\nТасдиқлангач, ҳаволани шу ерга юбораман.",
    /** Чек пришёл ночью (22:00–08:00): проверим утром */
    receiptGotNight: "✅ Чек қабул қилинди.\nЭрталаб 9:00 гача текшириб, ҳаволани шу ерга юбораман 🌙",
    alreadyPaid: "Бу буюртма тўланган ✅",
    waiting: "Чекингиз текширилмоқда ⏳ Одатда 5–30 дақиқа.",
    paid: (url: string) => `🎉 Тўлов тасдиқланди! Таклифномангиз тайёр:\n${url}`,
    qrCaption: "📷 QR-код: телефон камерасини қаратсангиз, таклифнома очилади.",
    shareIntro: "👇 Бу хабарни меҳмонларга юборинг (WhatsApp, Telegram):",
    shareButton: "📤 Меҳмонларга юбориш",
    thanks: "🙏 Раҳмат! Тўйингиз муборак бўлсин!\nЯна таклифнома керак бўлса — пастдаги тугмани босинг 👇",
    newOrder: "🆕 Янги таклифнома",
    rejected: (n: number, reason: string) =>
      `😔 #${n} буюртма тўлови тасдиқланмади.\nСабаби: ${reason}\nТекшириб, чекни қайта юборинг.`,
    resend: "📎 Чекни қайта юбориш",
    reminder: (url: string) =>
      `👋 Таклифномангиз тайёр турибди:\n${url}\nТўлов қилсангиз, «НАМУНА» ёзуви олиб ташланади.`,
  },

  /** Сообщение для гостей — его пересылают гостям, поэтому всегда на ўзбекском */
  guest: {
    nikoh: (groom: string, bride: string) => `${groom} ва ${bride}нинг никоҳ тўйига`,
    sunnat: (person: string) => `${person}нинг суннат тўйига`,
    nahorgi: (person: string, cause: string) => `${person}нинг ${cause} муносабати билан наҳорги ошга`,
    yubiley: (person: string) => `${person}нинг юбилейига`,
    share: (what: string, date: string, url: string) =>
      `Ассалому алайкум! 🌸\nСизни ${what} лутфан таклиф этамиз.\n📅 ${date}\n\nТаклифнома: ${url}`,
  },

  dashboard: {
    denied: "Бу ҳисоботга рухсат йўқ. Бот билан шахсий чатда очинг.",
    favoriteAdd: "🤍 Севимлиларга", favoriteRemove: "❤️ Севимлидан олиш", favoriteList: "❤️ Севимлилар", favoriteEmpty: "Ҳозирча севимли дизайн йўқ. Каталогдан қўшинг.", favoriteSaved: "Сақланди. Рўйхат: /favorites", favoriteRemoved: "Севимлилардан олинди", unavailable: "Дизайн сақланган, аммо янги буюртма учун вақтинча мавжуд эмас.",
  },
  panel: {
    title: "📊 Dashboard",
    views: { general: "📈 Умумий", revenue: "💰 Даромад", orders: "🧾 Буюртмалар", designs: "🎨 Дизайнлар", partners: "🤝 Ҳамкорлар", music: "🎵 Мусиқа" },
    periods: { today: "Бугун", week: "Ҳафта", month: "Ой", all: "Ҳаммаси" },
    labels: { clients: "Мижозлар келди", created: "Буюртма яратилди", paid: "Тўланди", revenue: "Даромад", average: "Ўртача чек", waiting: "Чек текширувини кутмоқда" },
    byFormat: "Тариф бўйича:",
    byOccasion: "Тадбир бўйича:",
    empty: "Ҳозирча маълумот йўқ",
    showPaid: "✅ Фақат тўланганлар",
    showAll: "📋 Ҳаммаси",
    styles: { milk: "🥛 Сутли", gold: "✨ Олтин", floral: "🌸 Гулли", national: "🏺 Миллий", dark: "🌙 Тўқ", photo: "📷 Суратли" },
    musicList: "Рўйхатдан", musicOwn: "Ўз қўшиғи", musicNone: "Мусиқасиз",
    partner: {
      empty: "Ҳозирча ҳамкор йўқ",
      notReady: "Ҳамкорлар бўлими база янгилангач ишлайди.",
      add: "➕ Янги ҳамкор",
      scanned: "Сканерлади", started: "Буюртма бошлади", paid: "Тўлади", due: "Тўланиши керак", paidOut: "Тўланган",
      undelivered: (n: number) => `⚠️ ${n} та хабар етмади: ҳамкор ботда /start босмаган`,
      rateValue: "Ставка",
      qr: "🔗 Ҳавола ва QR", rate: "✏️ Ставка",
      pay: (amount: string) => `✅ Тўланди — ${amount}`,
      payConfirm: (name: string, amount: string) => `${name} учун ${amount} тўланганини тасдиқлайсизми?`,
      payYes: "✅ Ҳа, тўланди",
      paidDone: (name: string, amount: string) => `✅ ${name}: ${amount} тўланди деб белгиланди.`,
      payStale: "Сумма ўзгарган ёки аллақачон белгиланган. Ҳамкорни қайта очинг.",
      askName: "Ҳамкорнинг исми?",
      askContact: "Telegram username ёки рақамли ID?\nМасалан: @username ёки 123456789",
      badContact: "Тушунмадим 🙂 @username ёки рақамли ID ёзинг.",
      askRate: "Битта тўланган буюртма учун ставка? Тугмани босинг ёки суммани ёзинг.",
      badRate: "Суммани рақам билан ёзинг. Масалан: 1000",
      rateSaved: (amount: string) => `✅ Янги ставка: ${amount}. Кейинги тўловлардан бошлаб ишлайди.`,
    },
  },
  /** v2, часть 9: языки приглашения */
  langs: {
    names: { ru: "Русча", kk: "Қозоқча", uz: "Ўзбекча" } as Record<string, string>,
    review: (list: string) => `🌐 Тиллар: Ўзбекча${list ? ` · ${list}` : ""}`,
    edit: "🌐 Тиллар",
    ask: (kk: boolean) => `🌐 Тиллар\n\nЎзбек тили доим бор. Меҳмонлар ${kk ? "рус ёки қозоқ" : "рус"} тилида ўқиши учун қўшинг — меҳмон ўзи танлайди. Нархи ўзгармайди.`,
    on: (name: string) => `✅ ${name}`,
    off: (name: string) => `➕ ${name}`,
    example: (name: string) => `👁 Мисол · ${name}`,
    ownButton: (name: string) => `✍️ Ўз матнингиз · ${name}`,
    ownAsk: (name: string) => `✍️ Ўз матнингизни ${name.toLowerCase()} ёзинг (600 белгигача).\nЁзмасангиз, бу тилда ҳам ўзбекча матн кўринади.`,
    done: "✅ Тайёр",
    mainAsk: "Таклифнома қайси тилда очилсин?",
    mainHint: "Меҳмоннинг телефони танланган тилларидан бирида бўлса — ўша тилда очилади.",
    main: (name: string) => `Асосий тил: ${name.toLowerCase()}`,
  },
  /** v2, часть 10: напоминания не купившим и отзыв после тадбира */
  care: {
    nudges: [
      "🌸 Таклифномангиз сизни кутяпти!\nТўхтаган жойингиздан бир неча дақиқада тугатиш мумкин.",
      "💌 Меҳмонларга чиройли таклифнома юборишни унутмадингизми?\nҲаммаси сақланган — давом этсангиз бўлди.",
      "✨ Каталогда сизга ёқадиган дизайнлар бор.\nТанланг — таклифнома 5 дақиқада тайёр.",
      "🤍 Тўйингиз яқинлашяпти — меҳмонлар учун таклифнома тайёр турсин.\nБу охирги эслатма, бошқа безовта қилмаймиз.",
    ],
    cont: "▶️ Давом этиш",
    catalog: "👁 Каталог",
    stop: "🔕 Бошқа юборманг",
    stopped: "Яхши, бошқа эслатма юбормаймиз 🤝",
    reviewAsk: (names: string) => `🌸 ${names} — тўйингиз муборак бўлсин!\nТаклифнома ёқдими? Баҳоланг 👇`,
    stars: ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"],
    reviewText: "Раҳмат! Хоҳласангиз, бир-икки сўз ёзинг — бизга жуда муҳим ✍️",
    reviewSkip: "⏭ Ёзмайман",
    reviewThanks: "Раҳмат! Фикрингиз сақланди 🙏",
    shareAsk: "Раҳмат! 🥰 Ёққан бўлса, ботимизни яқинларингизга юборинг — уларга ҳам асқатади.",
    shareButton: "📤 Ботни улашиш",
    shareText: "Онлайн таклифнома 5 дақиқада — мусиқа, харита ва меҳмонлар жавоби билан 💌",
  },
  partner: {
    paidNotice: (amount: string) => `Сизнинг кодингиз орқали янги буюртма тўланди ✅ +${amount}`,
    stats: (s: { link: string; scanned: number; started: number; paid: number; earned: string; paidOut: string; due: string }) =>
      `🤝 Сизнинг натижаларингиз\n\nСканерлади: ${s.scanned}\nБуюртма бошлади: ${s.started}\nТўлади: ${s.paid}\n\nЖами ишланган: ${s.earned}\nТўланган: ${s.paidOut}\nТўланиши керак: ${s.due}\n\nҲаволангиз:\n${s.link}`,
  },
  admin: {
    card: (o: { n: number; amount: string; format: string; design: string; names: string; date: string; client: string; url: string }) =>
      `🧾 Янги чек\n\n💰 КУТИЛГАН СУММА: ${o.amount}\n🔢 ИЗОҲДА: #${o.n}\nЧекдаги сумма ва рақам шу билан бир хилми — текширинг.\n\nТури: ${o.format}\nДизайн: ${o.design}\nИсмлар: ${o.names}\nСана: ${o.date}\nМижоз: ${o.client}\n${o.url}`,
    approve: "✅ Тасдиқлаш",
    reject: "❌ Рад этиш",
    reasonAsk: "Сабабини танланг 👇",
    reasons: { money: "Пул келмади", sum: "Сумма нотўғри", other: "Бошқа чек" } as Record<string, string>,
    approved: (n: number) => `✅ #${n} тасдиқланди. Мижозга ҳавола юборилди.`,
    approvedFailed: (n: number) =>
      `⚠️ #${n} тасдиқланди, лекин мижозга ҳавола етиб бормади (ботни блоклаган бўлиши мумкин). Мижозга ўзингиз ёзинг: ҳавола «/find ${n}» да.`,
    rejectedDone: (n: number, reason: string) => `❌ #${n} рад этилди: ${reason}`,
    notAdmin: "Бу тугма фақат админлар учун.",
    already: "Бу буюртма аллақачон кўриб чиқилган.",
    remind: (n: number, minutes: number) => `⏰ #${n} чеки ${minutes} дақиқадан бери кутмоқда.`,
    ordersWaiting: "⏳ Тасдиқ кутаётганлар:",
    ordersNone: "Тасдиқ кутаётган чек йўқ ✅",
    ordersRecent: "🕘 Охирги буюртмалар:",
    orderLine: (n: number, names: string, status: string, amount: string, url: string) =>
      `#${n} · ${names} · ${amount}\n${status}\n${url}`,
    findUsage: "Қидириш: /find исм, #рақам ёки ҳавола",
    findNone: "Ҳеч нарса топилмади.",
    stats: (s: {
      orders: { today: number; week: number; month: number; total: number };
      revenue: { today: string; week: string; month: string; total: string };
      byStatus: string;
      bySource: string;
    }) =>
      `📊 Статистика\n\nБуюртмалар: бугун ${s.orders.today} · ҳафта ${s.orders.week} · ой ${s.orders.month} · жами ${s.orders.total}\nТушум: бугун ${s.revenue.today} · ҳафта ${s.revenue.week} · ой ${s.revenue.month} · жами ${s.revenue.total}\n\nҲолат бўйича:\n${s.byStatus}\n\nҚаердан келган:\n${s.bySource}`,
    sourceLine: (source: string, users: number, paid: number) => `${source}: ${users} киши, ${paid} та тўлов`,
  },

  role: {
    panel: "🖥 Панель",
    partnerTitle: "🤝 InviteIZI ҳамкори",
    menu: "🤝 Ҳамкор менюси",
    partnerHome: (name: string, pending: boolean) =>
      `🤝 InviteIZI ҳамкори\n${name}${pending ? "\n\n⏳ Тасдиқ кутилмоқда. QR ишлайди, тўловлар ҳисобланади." : ""}`,
    /** Ссылка join_: язык ещё не выбран — текст на двух языках */
    joinHello: "🤝 Сиз InviteIZI ҳамкорисиз!\n🤝 Вы партнёр InviteIZI!\n\nТилни танланг · Выберите язык",
    joinHello3: "🤝 Сиз InviteIZI ҳамкорисиз!\n🤝 Вы партнёр InviteIZI!\n🤝 Сіз InviteIZI серіктесісіз!\n\nТилни танланг · Выберите язык · Тілді таңдаңыз",
    askPhone: "📱 Рақамингизни юборинг — пастдаги тугмани босинг 👇",
    phoneButton: "📱 Рақамни юбориш",
    badPhone: "Пастдаги «📱 Рақамни юбориш» тугмасини босинг 👇",
    askKaspi: "💳 Тўловлар қайси Kaspi'га ўтказилсин?\nТелефон ёки карта рақамини ёзинг. Шу рақам бўлса — пастдаги тугмани босинг 👇",
    badKaspi: "Рақамни тўлиқ ёзинг. Масалан: +7 701 123 45 67 ёки карта рақами (16 та рақам).",
    joined: "✅ Тайёр! Энди сиз InviteIZI ҳамкорисиз.",
    joinUsed: "Бу ҳавола аллақачон ишлатилган. Янгисини сизни таклиф қилган одамдан сўранг.",
    joinExpired: "Ҳаволанинг муддати тугаган (7 кун). Янгисини сизни таклиф қилган одамдан сўранг.",
    joinNone: "Ҳавола нотўғри.",
    joinTaken: "Бу ҳамкор бошқа Telegram аккаунтига уланган. Саволингиз бўлса — 📞 Боғланиш.",
    joinShare: (link: string) => `Ассалому алайкум! 🤝\nСиз InviteIZI ҳамкорисиз.\nШу ҳаволани босинг — Telegram'да ҳамкор менюси очилади:\n${link}`,
    schedule: { daily: "ҳар куни", weekly: "ҳар душанба", monthly: "ҳар ойнинг 1-куни" } as Record<string, string>,
    rateLine: (rate: string) => `Ставкангиз: ${rate} — ҳар бир тўловдан`,
    payDay: (when: string) => `Тўлов куни: ${when}`,
    onHold: (amount: string) => `Тасдиқ кутилмоқда: ${amount}`,
    countOnly: "Бу QR фақат ҳисоб учун — тўлов йўқ.",
    /** v2, часть 7: вечер 20:00, день выплаты, выплата пришла */
    evening: (s: { count: number; lines: string; you: string; pending: boolean; payDay: string }) =>
      [
        `🌙 Бугун сизнинг QR орқали ${s.count} та тўлов:`,
        s.lines,
        ...(s.you ? ["", `Сизга: ${s.you}${s.pending ? " (тасдиқдан кейин)" : ""}`, `Тўлов куни: ${s.payDay}`] : []),
      ].join("\n"),
    evLine: (n: number, who: string, amount: string) => `№${n} ${who} ${amount}`,
    tomorrow: "эртага",
    weekdays: ["якшанба", "душанба", "сешанба", "чоршанба", "пайшанба", "жума", "шанба"],
    months: ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"],
    payToday: (owner: string, amount: string, count: number) => `💰 Бугун ${owner} сизга ${amount} ўтказади (${count} та тўлов).`,
    paidOut: (amount: string) => `✅ ${amount} ўтказилди. Kaspi'ни текширинг.`,
    gotIt: "👍 Олдим",
    thanks: "Раҳмат! 🤝",
    /** v2, часть 8: статистика партнёра */
    periods: { w: "Ҳафта", m: "Ой", a: "Ҳаммаси" } as Record<string, string>,
    statsText: (s: { period: string; scanned: number; paid: number; earned: string; paidOut: string; due: string; link: string }) =>
      `📊 Статистика · ${s.period}\n\nQR сканерлади: ${s.scanned}\nТўлов: ${s.paid}\n\nЖами ишланган: ${s.earned}\nТўланган: ${s.paidOut}\nТўланиши керак: ${s.due}\n\nҲаволангиз:\n${s.link}`,
    /** QR и постер A4 (v2, часть 6). На постере — без эмодзи: шрифт постера их не рисует */
    qrCaption: (name: string, link: string) => `🔳 ${name}\n${link}\n\nПостер A4 (PDF ва PNG) — пастдаги тугма 👇`,
    refLink: (link: string) => `🔗 Ҳаволангиз:\n${link}\n\nБу ҳаволани WhatsApp'да юборсангиз ҳам бўлади — буюртмалар сизга ёзилади.`,
    copyLink: "📋 Нусха олиш",
    posterUz: "📄 Постер · ўзбекча",
    posterRu: "📄 Постер · русча",
    posterKk: "📄 Постер · қозоқча",
    posterReady: (name: string) => `📄 ${name} — постер A4. PDF — чоп этиш учун, PNG — телефонга.`,
    poster: {
      title: "Онлайн таклифнома — 5 дақиқада",
      sub: "Мусиқа · харита · меҳмонлар жавоби",
      scan: "QR'ни сканерланг",
      pricePre: "",
      pricePost: " дан",
      sample: "Намуна",
    },
    stats: "📊 Статистика",
    qr: "🔳 QR ва постер",
    payouts: "💰 Тўловларим",
    self: "✨ Ўзимга таклифнома",
    payoutsText: (s: { earned: string; paidOut: string; due: string }) => `💰 Тўловларим\n\nЖами ишланган: ${s.earned}\nТўланган: ${s.paidOut}\nТўланиши керак: ${s.due}`,
    claimed: (url: string, amount: string) => `🎉 Таклифномангиз тайёр!\n${url}\n\nНархи: ${amount}\nТўлаш учун пастдаги тугмани босинг 👇`,
    claimUsed: "Бу ҳавола аллақачон ишлатилган. Саволингиз бўлса — 📞 Боғланиш.",
    claimClosed: "Бу буюртма аллақачон тўланган ёки ёпилган.",
    claimNone: "Ҳавола нотўғри ёки эскирган.",
    clientShare: (s: { url: string; amount: string; bot: string }) =>
      `Ассалому алайкум! 🌸\nТаклифномангиз тайёр (НАМУНА) — аввал кўриб чиқинг:\n${s.url}\n\n⚠️ Тўловдан кейин ўзгартириб бўлмайди, пул қайтарилмайди.\n\nНархи: ${s.amount}\nҲаммаси тўғри бўлса, буюртмани ботда очинг ва «✅ Ҳаммаси тўғри, тўлаймиз» тугмасини босинг — тўлов маълумотлари ўша ерда чиқади:\n${s.bot}`,
  },

  my: {
    empty: "Ҳозирча таклифномангиз йўқ. «✨ Таклифнома яратиш» тугмасини босинг 👇",
    item: (n: number, title: string, status: string, url: string) => `#${n} · ${title}\n${status}\n${url}`,
    statuses,
    link: "🔗 Ҳавола",
  },
};

export type BotTexts = typeof uz;
