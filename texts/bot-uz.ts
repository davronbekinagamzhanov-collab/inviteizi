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
  langName: "Ўзбекча",
  chooseLang: "Тилни танланг / Выберите язык 👇",
  langUz: "🇺🇿 Ўзбекча",
  langRu: "🇷🇺 Русский",
  langSaved: "✅ Тил: ўзбекча.",

  menu: {
    create: "💌 Таклифнома яратиш",
    my: "📂 Менинг таклифномаларим",
    help: "❓ Ёрдам",
    lang: "🌐 Тил / Язык",
  },

  welcome: (name: string | null) =>
    `Ассалому алайкум${name ? `, ${name}` : ""}! 🌸\nМен тўйингиз учун телефонда очиладиган чиройли таклифнома тайёрлаб бераман.\nБошлаш учун «💌 Таклифнома яратиш» тугмасини босинг.`,
  idle: "Бошлаш учун «💌 Таклифнома яратиш» тугмасини босинг 👇",
  help:
    "❓ Қандай ишлайди:\n1. Тўйни ва дизайнни танлайсиз.\n2. Исмлар, сана ва жойни ёзасиз.\n3. Намунани кўриб, Kaspi орқали тўлайсиз.\n4. Ҳаволани меҳмонларга юборасиз.\n\nДизайнни қўлда ўзгартириш — 2 000 ₸. Савол бўлса — ёзинг 👇",
  contact: "📞 Боғланиш",

  back: "⬅️ Орқага",
  unknown: "Тушунмадим 🙂",
  pressButton: "Илтимос, тугмалардан бирини босинг 👇",
  sendText: "Илтимос, жавобни матн билан ёзинг ✍️",
  oldButton: "Бу тугма эскирган. Охирги саволга жавоб беринг 👇",
  tooLong: (max: number) => `Жуда узун 🙂 ${max} белгигача ёзинг.`,
  ok: "👌",

  category: {
    ask: "Қайси тўйга таклифнома керак? 👇",
    nikoh: "💍 Никоҳ",
    nahorgi: "🍚 Наҳорги ош",
    sunnat: "🎉 Суннат",
  },

  format: {
    ask: "Қайси турдаги таклифнома? 👇",
    animated: (price: string) => `✨ Анимацияли — ${price}`,
    simple: (price: string) => `📄 Оддий — ${price}`,
    info: "ℹ️ Фарқи нимада?",
    infoText:
      "✨ Анимацияли: очилиш эффекти ва варақлаш.\n📄 Оддий: битта саҳифа, юмшоқ пайдо бўлади.\nИккаласида ҳам мусиқа бор.",
    names: { animated: "Анимацияли", simple: "Оддий" },
  },

  catalog: {
    caption: (n: number, name: string, format: string, price: string) => `№${n} · ${name}\n${format} · ${price}`,
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
    sideAsk: "Келин томони оиласини ҳам ёзасизми?\nМасалан: Юсуповлар оиласи",
    sideYes: "✍️ Ҳа, ёзаман",
    sideNo: "Йўқ",
    sideBride: "Келин томони оиласи?\nМасалан: Юсуповлар оиласи",
    personNahorgi: "🍚 Наҳорги ош кимнинг тўйи муносабати билан?\nИсмини ёзинг. Масалан: Жасурбек",
    personSunnat: "👦 Ўғил боланинг исми?\nМасалан: Муҳаммадали\nИккита бўлса: Абдураҳмонжон ва Абдуллоҳжон",
    relationPerson: (name: string) => `${name} сизга ким бўлади? 👇`,
    relations,
    cause: "Қайси тўй муносабати билан? 👇",
    causes: { nikoh: "💍 Никоҳ тўйи", sunnat: "🎉 Суннат тўйи" },
  },

  event: {
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
    badTime: "Вақт нотўғри 🙂 Соат ва дақиқани ёзинг.\nМасалан: 18:30",
    venue: (kind: string) => `🏛 ${kind} қаерда ўтади?\nМасалан: «Наврўз» тўйхонаси ёки Каримовлар хонадони`,
    address: "🏠 Манзил?\nМасалан: Сайрам, Амир Темур кўчаси 45",
    location:
      "🗺 Харитадаги жойни юборинг: пастдаги «📍 Локация юбориш» тугмасини босинг.\nЁки 2GIS / Google Maps ҳаволасини ташланг.",
    sendLocation: "📍 Локация юбориш",
    skip: "⏭ Ўтказиб юбориш",
    badLocation: "Локация юборинг ёки 2GIS / Google Maps ҳаволасини ташланг 🙂\nКерак бўлмаса — «⏭ Ўтказиб юбориш».",
    locationSaved: "✅ Жой сақланди.",
    more: (list: string) => `Ҳозирги тадбирлар:\n${list}\n\nЯна тадбир қўшасизми? 👇`,
    addNahorgi: "🍚 Наҳорги ош",
    addKelinSalom: "🌸 Келин салом",
    addBazm: "🎊 Тўй базми",
    noMore: "✅ Йўқ, тамом",
    maxReached: "Энг кўпи 3 та тадбир бўлади. Давом этамиз 👇",
    line: (i: number, kind: string, date: string, time: string) => `${i}. ${kind} — ${date}, ${time}`,
  },

  text: {
    ask: (options: string) => `✍️ Таклифнома матнини танланг:\n\n${options}`,
    option: (i: number, greeting: string, body: string) => `${i}) ${greeting}\n${body}`,
    pick: (i: number) => `${i}-матн`,
    own: "✍️ Ўз матнимни ёзаман",
    ownAsk: "Матнингизни ёзинг (600 белгигача) ✍️",
    tooLong: (n: number) => `Матн узун: ${n} белги. 600 тадан ошмасин — бироз қисқартириб, қайта юборинг 🙏`,
  },

  music: {
    ask: "🎵 Таклифномада қандай мусиқа бўлсин? 👇",
    fromList: "🎵 Рўйхатдан танлаш",
    own: "📤 Ўз қўшиғимни юбораман",
    none: "🔇 Мусиқасиз",
    listAsk: "▶️ — тинглаш, ✅ — танлаш 👇",
    play: (title: string) => `▶️ ${title}`,
    choose: "✅",
    ownAsk: "Қўшиқни файл қилиб юборинг (20 МБ гача) 📤\nТелеграмдаги қўшиқни шу ерга улашсангиз ҳам бўлади.",
    sendFile: "Қўшиқ номини эмас, қўшиқнинг ўзини файл қилиб юборинг 🙏",
    tooBig: (mb: string) => `Файл катта: ${mb} МБ 🙂 20 МБ гача бўлган файл юборинг.`,
    saved: "✅ Қўшиқ қабул қилинди.",
    title: (s: string) => s,
  },

  review: {
    title: "📝 Текшириб чиқинг:",
    design: (n: number, name: string, format: string, price: string) => `Дизайн: №${n} ${name} (${format} · ${price})`,
    groom: (s: string) => `Куёв: ${s}`,
    bride: (s: string) => `Келин: ${s}`,
    person: (s: string) => `Исм: ${s}`,
    relation: (s: string) => `Ким бўлади: ${s}`,
    cause: (s: string) => `Сабаб: ${s}`,
    hosts: (s: string) => `Таклиф қилувчи: ${s}`,
    sideBride: (s: string) => `Келин томони: ${s}`,
    event: (i: number, kind: string, date: string, time: string, venue: string, address: string, map: string) =>
      `${i}. ${kind}\n   ${date}, ${time}\n   ${venue}\n   ${address}\n   ${map}`,
    hasMap: "🗺 Харита: бор",
    noMap: "🗺 Харита: йўқ",
    textPreset: (i: number) => `Матн: ${i}-вариант`,
    textOwn: (s: string) => `Матн: ўз матнингиз («${s}…»)`,
    musicList: (s: string) => `Мусиқа: ${s}`,
    musicOwn: (s: string) => `Мусиқа: ўз қўшиғингиз (${s})`,
    musicNone: "Мусиқа: йўқ",
    editNames: "✏️ Исмлар",
    editRelation: "✏️ Ким бўлади",
    editCause: "✏️ Сабаб",
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
    created: (url: string) =>
      `🎉 Тайёр! Мана таклифномангиз (ҳозирча «НАМУНА» ёзуви билан):\n${url}\n\nТўловдан кейин ёзув олиб ташланади ва мусиқа ёқилади.`,
    updated: (url: string) => `✅ Ўзгаришлар сақланди. Ҳавола ўша-ўша:\n${url}`,
    pay: (price: string) => `💳 Тўлаш — ${price}`,
    edit: "✏️ Ўзгартириш",
    notFound: "Буюртма топилмади 🙁",
  },

  pay: {
    info: (amount: string, phone: string, name: string, n: number) =>
      `💳 Kaspi орқали ${amount} ўтказинг:\n📱 ${phone}\n👤 ${name}\nИзоҳга ёзинг: #${n}\n\nКейин чекни (скриншот ёки PDF) шу ерга юборинг 📎`,
    copy: "📋 Рақамни нусхалаш",
    sendReceipt: "📎 Чекни юбориш",
    receiptAsk: "📎 Чекни сурат ёки PDF файл қилиб юборинг.",
    receiptBad: "Чекни сурат ёки PDF файл қилиб юборинг 🙏",
    receiptGot: "✅ Чек қабул қилинди. Текширилмоқда — одатда 5–30 дақиқа.\nТасдиқлангач, ҳаволани шу ерга юбораман.",
    alreadyPaid: "Бу буюртма тўланган ✅",
    waiting: "Чекингиз текширилмоқда ⏳ Одатда 5–30 дақиқа.",
    paid: (url: string) => `🎉 Тўлов тасдиқланди! Таклифномангиз тайёр:\n${url}`,
    qrCaption: "QR-код: телефон камерасида очса, таклифнома очилади.",
    shareIntro: "👇 Бу хабарни меҳмонларга юборинг (WhatsApp, Telegram):",
    shareButton: "📤 Меҳмонларга юбориш",
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

  admin: {
    card: (o: { n: number; amount: string; format: string; design: string; names: string; date: string; client: string; url: string }) =>
      `🧾 Янги чек — #${o.n}\nСумма: ${o.amount} (${o.format})\nДизайн: ${o.design}\nИсмлар: ${o.names}\nСана: ${o.date}\nМижоз: ${o.client}\n${o.url}`,
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

  my: {
    empty: "Ҳозирча таклифномангиз йўқ. «💌 Таклифнома яратиш» тугмасини босинг 👇",
    item: (n: number, title: string, status: string, url: string) => `#${n} · ${title}\n${status}\n${url}`,
    statuses,
    link: "🔗 Ҳавола",
    slugAsk: (url: string) =>
      `Ҳозирги ҳавола:\n${url}\n\nЯнги номини лотин ҳарфларида ёзинг.\nМасалан: aziz-madina`,
    slugTaken: (s: string) => `«${s}» банд 🙁 Бошқасини ёзинг.\nМасалан: ${s}-toy`,
    slugBad: "Фақат лотин ҳарфлари, рақамлар ва «-».\nМасалан: aziz-madina",
    slugChanged: (url: string) => `✅ Янги ҳавола:\n${url}\nЭски ҳавола энди очилмайди.`,
  },
};

export type BotTexts = typeof uz;
