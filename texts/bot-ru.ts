/**
 * Тексты БОТА на русском. Ключи — те же, что в bot-uz.ts (`satisfies BotTexts`).
 * Названия дизайнов — на узбекском (из texts/uz-cyrl.ts): их видят гости.
 * Раздел guest не используется — сообщение для гостей всегда на узбекском (uz.guest).
 */
import type { OrderStatus } from "@/lib/domain";
import type { EventKind, Relation } from "@/lib/types";
import { uz, type BotTexts } from "./bot-uz";

const eventKinds: Record<EventKind, string> = {
  nahorgi: "Наҳорги ош (утренний плов)",
  nikohMarosim: "Никоҳ (обряд)",
  nikohBazm: "Свадебный вечер",
  kelinSalom: "Келин салом",
  sunnatBazm: "Суннат той (вечер)",
  yubileyBazm: "Юбилей (вечер)",
};

const statuses: Record<OrderStatus, string> = {
  draft: "📝 Черновик",
  preview: "👁 Не оплачено (НАМУНА)",
  awaiting_payment: "💳 Ждём оплату",
  receipt_sent: "⏳ Чек проверяется",
  active: "✅ Оплачено, работает",
  archived: "📦 Срок истёк",
  rejected: "❌ Оплата не подтверждена",
};

const relations: Record<Relation, string> = {
  farzand: "Наш ребёнок",
  ogil: "Наш сын",
  qiz: "Наша дочь",
  nabira: "Наш внук / внучка",
  uka: "Наш младший брат",
  ona: "Наша мама",
  ota: "Наш папа",
  ozimiz: "Мы сами",
};

const monthsRu = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

export const ru = {
  /** Профиль бота в Telegram (scripts/telegram-setup.mjs) */
  profile: {
    name: "InviteIZI — онлайн-приглашения",
    short: "Красивые онлайн-приглашения на узбекском: той, наҳорги ош, суннат, юбилей. За 5 минут, оплата Kaspi.",
    description:
      "💌 Онлайн-приглашения на узбекском: свадьба (никоҳ), наҳорги ош, суннат той, юбилей.\n✨ Красивый дизайн, музыка, карта и таймер — одна ссылка для всех гостей.\n⏱ Готово за 5 минут, оплата через Kaspi.\nНажмите «Start», чтобы начать.",
    commands: { start: "Начать", my: "Мои приглашения", favorites: "Избранные дизайны", help: "Помощь" },
    /** Только у админов: scripts/telegram-setup.mjs --admin-commands */
    adminCommands: { dashboard: "Панель управления" },
  },

  langName: "Русский",
  chooseLang: uz.chooseLang,
  langUz: uz.langUz,
  langRu: uz.langRu,
  langSaved: "✅ Язык: русский.",

  menu: {
    create: "💌 Создать приглашение",
    my: "📂 Мои приглашения",
    help: "❓ Помощь",
    lang: "🌐 Тил / Язык",
  },

  welcome: (name: string | null) =>
    `Здравствуйте${name ? `, ${name}` : ""}! 🌸\nЯ сделаю красивое приглашение на ваш той — оно открывается на телефоне.\nЧтобы начать, нажмите «💌 Создать приглашение».`,
  idle: "Чтобы начать, нажмите «💌 Создать приглашение» 👇",
  help:
    "❓ Как это работает:\n1. Выбираете той и дизайн.\n2. Пишете имена, дату и место.\n3. Смотрите образец и платите через Kaspi.\n4. Отправляете ссылку гостям.\n\nДополнительные изменения (владелец делает вручную) — 2 000 ₸. Есть вопросы — напишите 👇",
  contact: "📞 Связаться",

  back: "⬅️ Назад",
  unknown: "Не понял 🙂",
  pressButton: "Пожалуйста, нажмите одну из кнопок 👇",
  needLetters: "Пожалуйста, напишите буквами ✍️",
  sendText: "Пожалуйста, напишите ответ текстом ✍️",
  oldButton: "Эта кнопка устарела. Ответьте на последний вопрос 👇",
  tooLong: (max: number) => `Слишком длинно 🙂 Не больше ${max} знаков.`,
  ok: "👌",
  error: "😔 Произошла ошибка. Попробуйте ещё раз чуть позже.",

  category: {
    ask: "На какой той нужно приглашение? 👇",
    nikoh: "💍 Свадьба (никоҳ)",
    nahorgi: "🍚 Наҳорги ош",
    sunnat: "👦 Суннат той",
    yubiley: "🎂 Юбилей",
  },

  format: {
    ask: "Какое приглашение? 👇",
    animated: (price: string) => `✨ Анимированное — ${price}`,
    scroll: (price: string) => `📜 С прокруткой — ${price}`,
    simple: (price: string) => `📄 Простое — ${price}`,
    info: "ℹ️ В чём разница?",
    infoText:
      "✨ Анимированное — приглашение открывается красивой анимацией.\n\n📜 С прокруткой — несколько разделов, листается пальцем вниз.\n\n📄 Простое — одна короткая красивая страница.\n\nВо всех трёх музыка входит в цену.",
    names: { animated: "Анимированное", scroll: "С прокруткой", simple: "Простое" },
  },

  catalog: {
    photoCredit: (author: string, license: string, source: string) => `Фото: ${author} · ${license}\n${source}`,
    caption: (n: number, name: string, format: string, price: string) => `№${n} · ${name}\n${format} · ${price}`,
    /** Строка под подписью у дизайнов, куда клиент может поставить своё фото */
    withPhoto: "📷 Можно добавить своё фото",
    demo: "👁 Образец",
    buy: "🛒 Купить",
    hint: "◀ ▶ — другие дизайны. «👁 Образец» — откройте на телефоне.",
  },

  form: {
    groom: "🤵 Имя жениха?\nНапример: Азиз",
    bride: "👰 Имя невесты?\nНапример: Мадина",
    relationNikoh: "Чья свадьба? 👇",
    relationsNikoh: { farzand: "Наших детей", nabira: "Наших внуков", ozimiz: "Наша свадьба" } as Partial<Record<Relation, string>>,
    hosts: "👨‍👩‍👧 Кто приглашает?\nНапример: Каримовлар оиласи",
    sideAsk: "Сторона жениха — семья, указанная выше. Добавить семью невесты?",
    sideYes: "✍️ Да, напишу",
    sideNo: "➡️ Нет, не нужно",
    sideBride: "Семья невесты?\nНапример: Юсуповлар оиласи",
    personNahorgi: "🍚 По чьему тою наҳорги ош?\nНапишите имя. Например: Жасурбек",
    personYubiley: "🎂 Имя юбиляра?\nНапример: Мукаррам опа",
    age: "🎂 Сколько исполняется лет?\nНапишите цифрами. Например: 60",
    badAge: "Напишите возраст цифрами 🙂\nНапример: 60",
    personSunnat: "👦 Имя мальчика?\nНапример: Муҳаммадали\nЕсли двое: Абдураҳмонжон ва Абдуллоҳжон",
    relationPerson: (name: string) => `Кем вам приходится ${name}? 👇`,
    relations,
    cause: "По какому поводу? 👇",
    causes: { nikoh: "💍 Свадьба (никоҳ)", sunnat: "👦 Суннат той" },
  },

  event: {
    readyVenues: "🏛 Готовые тойханы",
    mapChoice: "🗺 Выбрать на карте",
    linkChoice: "🔗 Ссылка 2GIS / Google Maps",
    manualChoice: "✍️ Другое место",
    manualPrompt: "🏛 Напишите название места. Подойдёт другой город или домашний адрес.",
    openPlace: "🗺 Открыть в 2GIS",
    venuesPrompt: "Выберите тойхану или откройте другую страницу. Можно указать любое другое место.",
    linkPrompt: "Откройте место в 2GIS или Google Maps и отправьте сюда ссылку через «Поделиться».",
    mapPrompt: "📎 → Геопозиция: найдите место праздника или передвиньте метку на карте. Выбирайте место мероприятия, а не вашу текущую позицию. Можно отправить ссылку места из 2GIS.",
    kinds: eventKinds,
    date: (kind: string) => `📅 Когда ${kind}?\nВыберите день 👇`,
    pastDate: "Прошедший день выбрать нельзя 🙂 Выберите сегодня или позже.",
    monthYear: (monthIndex: number, year: number) => `${monthsRu[monthIndex]} ${year}`,
    weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    sameDay: (kind: string, date: string) => `📅 ${kind} тоже ${date}?`,
    sameDayYes: "✅ Да, в тот же день",
    sameDayNo: "📅 Другой день",
    time: (kind: string) => `🕐 Во сколько начало (${kind})? 👇`,
    timeOther: "✍️ Другое время",
    timeCustom: "Напишите время.\nНапример: 18:30",
    pastTime: "Это время уже прошло, выберите другое.",
    badTime: "Неверное время 🙂 Напишите часы и минуты.\nНапример: 18:30",
    venue: (kind: string) => `🏛 Где пройдёт ${kind}?\nНапример: «Наврўз» тўйхонаси или Каримовлар хонадони`,
    address: "🏠 Адрес?\nНапример: Сайрам, Амир Темур кўчаси 45",
    location: "🗺 Как указать место мероприятия? Выберите готовое место, точку на карте, ссылку или ручной ввод.",
    sendLocation: "📍 Отправить локацию",
    skip: "⏭ Пропустить",
    badLocation: "Выберите место мероприятия на карте или отправьте ссылку 2GIS / Google Maps. Без карты — «⏭ Пропустить».",
    locationSaved: "✅ Место сохранено.",
    more: (list: string) => `Добавлены мероприятия:\n${list}\n\nДобавить ещё одно? 👇`,
    addNahorgi: "🍚 Наҳорги ош",
    addKelinSalom: "🌸 Келин салом",
    addBazm: "🎊 Свадебный вечер",
    noMore: "✅ Нет, всё",
    maxReached: "Максимум 3 мероприятия. Продолжаем 👇",
    line: (i: number, kind: string, date: string, time: string) => `${i}. ${kind} — ${date}, ${time}`,
  },

  text: {
    more: "🔄 Другие варианты",
    ask: (options: string) => `✍️ Выберите текст приглашения (он на узбекском — его читают гости):\n\n${options}`,
    option: (i: number, greeting: string, body: string) => `${i}) ${greeting}\n${body}`,
    pick: (i: number) => `Текст ${i}`,
    own: "✍️ Напишу свой текст",
    ownAsk: "Напишите свой текст (до 600 знаков) ✍️\nГости увидят его как есть — лучше на узбекском.",
    tooLong: (n: number) => `Текст длинный: ${n} знаков. Нужно не больше 600 — сократите и пришлите снова 🙏`,
  },

  pricing: {
    note: (a: string, b: string, c: string) => `Цена зависит только от вида: ${a} / ${b} / ${c} ₸. Музыка, количество тадбиров и дополнительные возможности (например, ответы гостей) — бесплатно.`,
  },

  rsvp: {
    ask: "Разрешить гостям отвечать «Приду / Не смогу»?\nТак вы заранее узнаете, сколько человек придёт.",
    yes: "✅ Да",
    no: "❌ Нет",
    reviewOn: "Ответы гостей: да",
    reviewOff: "Ответы гостей: нет",
    edit: "✏️ Ответы",
    answers: "📝 Ответы",
    howButton: "❓ Как это работает?",
    how: "Гости нажимают в приглашении «Келаман» (приду) или «Келолмайман» (не смогу).\n\nОтветы будут здесь:\nМеню → Мои приглашения → 📝 Ответы\n\nОтветы сохраняются после оплаты.",
    digest: (replies: number, coming: number, people: number, declined: number) => `Сегодня ответов: ${replies}. Придут: ${coming} (всего ${people} чел.), не смогут: ${declined}`,
    empty: "Ответов пока нет.",
    head: (replies: number, people: number, declined: number) => `📝 Ответов: ${replies}\nПридут: ${people} чел.\nНе смогут: ${declined}`,
    lineYes: (name: string, guests: number) => `✅ ${name} — ${guests} чел.`,
    lineNo: (name: string) => `❌ ${name}`,
    more: (n: number) => `…ещё ответов: ${n}`,
  },

  photo: {
    ask: "📷 Добавить ваши фото в приглашение?\nНапример, 1–3 фото с фотосессии.\nЕсли фото нет — поставим красивую готовую картинку.",
    yes: "✅ Да",
    no: "❌ Нет",
    example: "❓ Пример",
    exampleText: (url: string) => `Вот, посмотрите, где будет фото 👇\n${url}\n\nВаше фото встанет на это место.`,
    uploadAsk: "Пришлите фото сюда: от 1 до 3 📤\nМожно обычным фото или файлом (до 10 МБ).",
    accepted: (n: number, max: number) => `✅ Фото принято (${n}/${max}).\nПришлите ещё или нажмите «Готово».`,
    done: "✅ Готово",
    again: "🔄 Заново",
    saving: "⏳ Сохраняем фото…",
    full: (max: number) => `Принято ${max} фото — этого достаточно 🙂`,
    needPhoto: "Пришлите фото, пожалуйста 🙏 (или нажмите «Готово»)",
    tooBig: "Фото слишком большое 🙂 Пришлите фото до 10 МБ.",
    badFormat: "Не получилось открыть это фото 😔 Пришлите другое (JPG, PNG или фото с iPhone).",
    saveFailed: "😔 Не удалось сохранить фото. Пожалуйста, пришлите ещё раз.",
    review: (n: number) => (n ? `Фото: ${n} шт.` : "Фото: готовая картинка"),
    edit: "✏️ Фото",
  },

  music: {
    ask: "🎵 Какая музыка будет в приглашении?\nВыберите готовую мелодию из списка или пришлите свою любимую песню: нажмите «Пришлю свою песню» и отправьте mp3-файл с телефона или песню из Telegram.",
    fromList: "🎵 Выбрать из списка",
    own: "📤 Пришлю свою песню",
    none: "🔇 Без музыки",
    listAsk: "▶️ — послушать, ✅ — выбрать 👇",
    play: (title: string) => `▶️ ${title}`,
    choose: "✅",
    ownAsk: "Перешлите песню сюда из канала в Telegram (forward) или пришлите mp3-файл (до 20 МБ) 📤\nИз раздела «Музыка» на телефоне отправить нельзя.",
    sendFile: "Нужна сама песня, а не голосовое, видео или название 🙏\nПерешлите её сюда из канала в Telegram (forward) или пришлите mp3-файл. Из раздела «Музыка» на телефоне отправить нельзя.",
    tooBig: (mb: string) => `Файл большой: ${mb} МБ 🙂 Пришлите файл до 20 МБ.`,
    tooBigUnknown: "Файл большой 🙂 Пришлите файл до 20 МБ.",
    saved: "✅ Песня получена.",
    saveFailed: "😔 Не удалось сохранить песню. Пришлите файл ещё раз, пожалуйста.",
    previewFailed: "😔 Не удалось воспроизвести этот трек. Попробуйте ещё раз, выберите другой или пришлите свой файл.",
    title: (s: string) => s,
  },

  review: {
    title: "📝 Проверьте, всё ли верно:",
    design: (n: number, name: string, format: string, price: string) => `Дизайн: №${n} ${name} (${format} · ${price})`,
    groom: (s: string) => `Жених: ${s}`,
    bride: (s: string) => `Невеста: ${s}`,
    person: (s: string) => `Имя: ${s}`,
    relation: (s: string) => `Кем приходится: ${s}`,
    age: (n: number) => `Возраст: ${n}`,
    cause: (s: string) => `Какой той: ${s}`,
    hosts: (s: string) => `Приглашают: ${s}`,
    sideGroom: (name: string) => "Сторона жениха: " + name,
    sideBride: (s: string) => `Семья невесты: ${s}`,
    event: (i: number, kind: string, date: string, time: string, venue: string, address: string, map: string) =>
      `${i}. ${kind}\n   ${date}, ${time}\n   ${venue}\n   ${address}\n   ${map}`,
    hasMap: "🗺 Карта: есть",
    noMap: "🗺 Карта: нет",
    textPreset: (i: number) => `Текст: вариант ${i}`,
    textOwn: (s: string) => `Текст: свой («${s}…»)`,
    musicList: (s: string) => `Музыка: ${s}`,
    musicOwn: (s: string) => `Музыка: ваша песня (${s})`,
    musicNone: "Музыка: нет",
    editNames: "✏️ Имена",
    editRelation: "✏️ Кем приходится",
    editAge: "✏️ Возраст",
    editCause: "✏️ Какой той",
    editHosts: "✏️ Кто приглашает",
    editSides: "✏️ Семья невесты",
    editEvent: (i: number, kind: string) => `✏️ ${i}. ${kind}`,
    editText: "✏️ Текст",
    editMusic: "✏️ Музыка",
    editDesign: "✏️ Дизайн",
    confirm: "✅ Всё верно",
    eventMenu: (kind: string) => `${kind}: что меняем? 👇`,
    evDate: "📅 Дата",
    evTime: "🕐 Время",
    evVenue: "🏛 Место",
    evAddress: "🏠 Адрес",
    evLocation: "🗺 Локация",
    evDelete: "🗑 Удалить мероприятие",
  },

  order: {
    catalogChanged: "Каталог обновился. Подтвердите формат и дизайн заново — введённые данные сохраняются.",
    formatLocked: "У созданного заказа сохраняются формат и сумма. Для другого формата создайте новое приглашение.",
    created: (url: string) =>
      `🎉 Готово! Вот ваше приглашение (пока с надписью «НАМУНА»):\n${url}\n\nДемо доступно 24 часа с создания заказа. Правки срок не продлевают. После подтверждения оплаты эта же ссылка станет полной.\n🎵 Музыку можно включить и выключить кнопкой ▶/⏸.\n✏️ До оплаты можно изменить всё.`,
    updated: (url: string) => `✅ Изменения сохранены. Ссылка та же:\n${url}`,
    pay: (price: string) => `💳 Оплатить — ${price}`,
    edit: "✏️ Изменить",
    notFound: "Заказ не найден 🙁",
    closed: "🔒 Ссылка выдана — приглашение закрыто.\nЕсли нужно что-то изменить, владелец сделает это вручную (2 000 ₸). Свяжитесь 👇",
  },

  pay: {
    card: (number: string) => "Номер карты: " + number,
    copyCard: "📋 Скопировать карту",
    info: (amount: string, phone: string, name: string, n: number) =>
      `💳 Переведите ${amount} через Kaspi:\n📱 ${phone}\n👤 ${name}\nВ комментарии: #${n}\n\nПотом пришлите сюда чек (скриншот или PDF) 📎`,
    copy: "📋 Скопировать номер",
    sendReceipt: "📎 Отправить чек",
    receiptAsk: "📎 Пришлите чек фото или PDF-файлом.",
    receiptBad: "Пришлите чек фото или PDF-файлом 🙏",
    receiptGot: "✅ Чек получен. Проверяем — обычно 5–30 минут.\nКак подтвердим, пришлю ссылку сюда.",
    alreadyPaid: "Этот заказ уже оплачен ✅",
    waiting: "Ваш чек проверяется ⏳ Обычно 5–30 минут.",
    paid: (url: string) => `🎉 Оплата подтверждена! Приглашение готово:\n${url}`,
    qrCaption: "📷 QR-код: наведите камеру телефона — откроется приглашение.",
    shareIntro: "👇 Перешлите это сообщение гостям (WhatsApp, Telegram):",
    shareButton: "📤 Отправить гостям",
    thanks: "🙏 Спасибо! Пусть той пройдёт счастливо!\nНужно ещё одно приглашение — нажмите кнопку ниже 👇",
    newOrder: "🆕 Новое приглашение",
    rejected: (n: number, reason: string) =>
      `😔 Оплата заказа #${n} не подтверждена.\nПричина: ${reason}\nПроверьте и пришлите чек ещё раз.`,
    resend: "📎 Отправить чек заново",
    reminder: (url: string) => `👋 Ваше приглашение готово:\n${url}\nПосле оплаты надпись «НАМУНА» уберём.`,
  },

  guest: uz.guest,

  dashboard: {
    denied: "Нет доступа к этому отчёту. Откройте его в личном чате с ботом.",
    favoriteAdd: "🤍 В избранное", favoriteRemove: "❤️ Убрать из избранного", favoriteList: "❤️ Избранное", favoriteEmpty: "Пока нет избранных дизайнов. Добавьте их из каталога.", favoriteSaved: "Сохранено. Список: /favorites", favoriteRemoved: "Убрано из избранного", unavailable: "Дизайн сохранён, но для нового заказа временно недоступен.",
  },
  panel: {
    title: "📊 Dashboard",
    views: { general: "📈 Общее", revenue: "💰 Доход", orders: "🧾 Заказы", designs: "🎨 Дизайны", partners: "🤝 Партнёры", music: "🎵 Музыка" },
    periods: { today: "Сегодня", week: "Неделя", month: "Месяц", all: "Всё время" },
    labels: { clients: "Пришло клиентов", created: "Создано заказов", paid: "Оплачено", revenue: "Выручка", average: "Средний чек", waiting: "Ждут проверки чека" },
    byFormat: "По тарифам:",
    byOccasion: "По тадбирам:",
    empty: "Пока нет данных",
    showPaid: "✅ Только оплаченные",
    showAll: "📋 Все",
    styles: { milk: "🥛 Молочный", gold: "✨ Золотой", floral: "🌸 Цветочный", national: "🏺 Национальный", dark: "🌙 Тёмный", photo: "📷 С фото" },
    musicList: "Из списка", musicOwn: "Своя", musicNone: "Без музыки",
    partner: {
      empty: "Партнёров пока нет",
      notReady: "Раздел партнёров заработает после обновления базы.",
      add: "➕ Новый партнёр",
      scanned: "Сканировали", started: "Начали заказ", paid: "Оплатили", due: "К выплате", paidOut: "Выплачено",
      undelivered: (n: number) => `⚠️ Не дошло сообщений: ${n}. Партнёр не нажимал /start в боте`,
      rateValue: "Ставка",
      qr: "🔗 Ссылка и QR", rate: "✏️ Ставка",
      pay: (amount: string) => `✅ Выплачено — ${amount}`,
      payConfirm: (name: string, amount: string) => `Подтвердить выплату ${amount} партнёру ${name}?`,
      payYes: "✅ Да, выплачено",
      paidDone: (name: string, amount: string) => `✅ ${name}: выплата ${amount} отмечена.`,
      payStale: "Сумма изменилась или выплата уже отмечена. Откройте партнёра заново.",
      askName: "Имя партнёра?",
      askContact: "Telegram username или числовой ID?\nНапример: @username или 123456789",
      badContact: "Не понял 🙂 Напишите @username или числовой ID.",
      askRate: "Ставка за один оплаченный заказ? Нажмите кнопку или напишите сумму.",
      badRate: "Напишите сумму цифрами. Например: 1000",
      rateSaved: (amount: string) => `✅ Новая ставка: ${amount}. Действует со следующих оплат.`,
      pack: (name: string, link: string, rate: string) => `🤝 ${name}\nСтавка: ${rate}\n${link}`,
    },
  },
  partner: {
    paidNotice: (amount: string) => `По вашему коду оплачен новый заказ ✅ +${amount}`,
    stats: (s: { link: string; scanned: number; started: number; paid: number; earned: string; paidOut: string; due: string }) =>
      `🤝 Ваши результаты\n\nСканировали: ${s.scanned}\nНачали заказ: ${s.started}\nОплатили: ${s.paid}\n\nВсего заработано: ${s.earned}\nВыплачено: ${s.paidOut}\nК выплате: ${s.due}\n\nВаша ссылка:\n${s.link}`,
  },
  admin: {
    card: (o: { n: number; amount: string; format: string; design: string; names: string; date: string; client: string; url: string }) =>
      `🧾 Новый чек — #${o.n}\nСумма: ${o.amount} (${o.format})\nДизайн: ${o.design}\nИмена: ${o.names}\nДата: ${o.date}\nКлиент: ${o.client}\n${o.url}`,
    approve: "✅ Подтвердить",
    reject: "❌ Отклонить",
    reasonAsk: "Выберите причину 👇",
    reasons: { money: "Деньги не пришли", sum: "Неверная сумма", other: "Чужой чек" } as Record<string, string>,
    approved: (n: number) => `✅ #${n} подтверждён. Клиенту отправлена ссылка.`,
    approvedFailed: (n: number) =>
      `⚠️ #${n} подтверждён, но ссылка до клиента не дошла (возможно, он заблокировал бота). Напишите клиенту сами: ссылка — в «/find ${n}».`,
    rejectedDone: (n: number, reason: string) => `❌ #${n} отклонён: ${reason}`,
    notAdmin: "Эта кнопка только для админов.",
    already: "Этот заказ уже рассмотрен.",
    remind: (n: number, minutes: number) => `⏰ Чек #${n} ждёт уже ${minutes} минут.`,
    ordersWaiting: "⏳ Ждут подтверждения:",
    ordersNone: "Чеков на проверке нет ✅",
    ordersRecent: "🕘 Последние заказы:",
    orderLine: (n: number, names: string, status: string, amount: string, url: string) =>
      `#${n} · ${names} · ${amount}\n${status}\n${url}`,
    findUsage: "Поиск: /find имя, #номер или ссылка",
    findNone: "Ничего не найдено.",
    stats: (s: {
      orders: { today: number; week: number; month: number; total: number };
      revenue: { today: string; week: string; month: string; total: string };
      byStatus: string;
      bySource: string;
    }) =>
      `📊 Статистика\n\nЗаказы: сегодня ${s.orders.today} · неделя ${s.orders.week} · месяц ${s.orders.month} · всего ${s.orders.total}\nВыручка: сегодня ${s.revenue.today} · неделя ${s.revenue.week} · месяц ${s.revenue.month} · всего ${s.revenue.total}\n\nПо статусам:\n${s.byStatus}\n\nОткуда пришли:\n${s.bySource}`,
    sourceLine: (source: string, users: number, paid: number) => `${source}: ${users} чел., ${paid} оплат`,
  },

  my: {
    empty: "Пока приглашений нет. Нажмите «💌 Создать приглашение» 👇",
    item: (n: number, title: string, status: string, url: string) => `#${n} · ${title}\n${status}\n${url}`,
    statuses,
    link: "🔗 Ссылка",
  },
} satisfies BotTexts;

