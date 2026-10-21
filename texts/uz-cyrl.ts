/**
 * Все тексты, которые видят клиенты и гости. Только ўзбекча, кирилл.
 * Хотим поправить фразу — правим здесь, и она меняется во всех шаблонах.
 * Перед запуском тексты проверяют носители языка (старшие в семье).
 */

const months = [
  "январ",
  "феврал",
  "март",
  "апрел",
  "май",
  "июн",
  "июл",
  "август",
  "сентябр",
  "октябр",
  "ноябр",
  "декабр",
] as const;

// Неделя начинается с понедельника (Душанба)
const weekdays = [
  "Душанба",
  "Сешанба",
  "Чоршанба",
  "Пайшанба",
  "Жума",
  "Шанба",
  "Якшанба",
] as const;

const weekdaysShort = ["Ду", "Се", "Чо", "Па", "Жу", "Ша", "Як"] as const;

/** Имена пары в родительном падеже: «Азиз ва Мадинанинг» */
function coupleGenitive(groom: string, bride: string) {
  return `${groom} ва ${bride}нинг`;
}

export const t = {
  site: {
    title: "InviteIZI — онлайн тўй таклифномаси",
    description: "Чиройли, мусиқали тўй таклифномаси. Битта ҳавола — барча меҳмонлар учун.",
    home: {
      heading: "Онлайн тўй таклифномалари",
      lead: "Қоғозсиз, чиройли, мусиқали. Битта ҳаволани барча меҳмонларга юборасиз.",
      demosTitle: "Намуналар",
      watermarkPreview: "«НАМУНА» билан",
      designNumber: (n: number) => `№${n}`,
    },
  },

  /** Названия тем и цветов для каталога */
  themes: {
    "oltin-muhr": "Олтин муҳр",
    parda: "Парда",
    urama: "Ўрама",
  },
  colors: {
    bordo: "Бордо ва олтин",
    zumrad: "Зумрад",
    tun: "Тун",
    qirmizi: "Қирмизи бахмал",
    binafsha: "Бинафша",
    lojuvard: "Лажувард",
    firuza: "Феруза",
  },
  tiers: {
    premium: "Премиум",
    ekonom: "Эконом",
  },

  months,
  weekdays,
  weekdaysShort,

  /** Экран открытия (конверт, занавес, свиток…) */
  opening: {
    tapToOpen: "Очиш учун босинг",
    invitation: "Тўйга таклифнома",
  },

  cover: {
    eyebrow: "Никоҳ тўйи",
    and: "&",
    scrollHint: "Пастга суринг",
  },

  /** Готовые варианты текста приглашения. Клиент выберет один в боте. */
  inviteTexts: [
    {
      id: "classic",
      greeting: "Ҳурматли меҳмонлар!",
      body: (groom: string, bride: string) =>
        `Ҳаётимизнинг энг қувончли кунида — фарзандларимиз ${coupleGenitive(groom, bride)} никоҳ тўйи муносабати билан ташкил этиладиган базмга Сизни ва оилангизни лутфан таклиф этамиз.`,
    },
    {
      id: "short",
      greeting: "Ассалому алайкум!",
      body: (groom: string, bride: string) =>
        `Сизни фарзандларимиз ${coupleGenitive(groom, bride)} никоҳ тўйига таклиф қиламиз. Қувончимизга шерик бўлинг!`,
    },
    {
      id: "warm",
      greeting: "Азиз ва қадрли меҳмонлар!",
      body: (groom: string, bride: string) =>
        `Икки қалб бирлашадиган ушбу муборак кунда ${coupleGenitive(groom, bride)} тўйи дастурхонининг тўрида Сизни кўришдан бахтиёр бўламиз.`,
    },
  ],

  countdown: {
    title: "Тўйгача қолди",
    days: "кун",
    hours: "соат",
    minutes: "дақиқа",
    seconds: "сония",
    today: "Тўй куни келди!",
  },

  date: {
    title: "Тўй санаси",
    /** «14 ноябр, 2026 йил» */
    long: (day: number, monthIndex: number, year: number) =>
      `${day} ${months[monthIndex]}, ${year} йил`,
    /** «Шанба, соат 18:00» */
    dayAndTime: (weekdayIndex: number, time: string) =>
      `${weekdays[weekdayIndex]}, соат ${time}`,
    monthYear: (monthIndex: number, year: number) => `${months[monthIndex]} ${year}`,
  },

  venue: {
    title: "Тўй манзили",
    openMap: "Харитада очиш",
  },

  hosts: {
    title: "Ҳурмат билан",
    closing: "Сизни интизорлик билан кутамиз!",
  },

  music: {
    play: "Мусиқани ёқиш",
    pause: "Мусиқани ўчириш",
  },

  watermark: "НАМУНА",

  footer: {
    madeWith: "InviteIZI орқали яратилди",
  },
} as const;

export type Texts = typeof t;
