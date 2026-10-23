/**
 * Все тексты, которые видят клиенты и гости. Только ўзбекча, кирилл.
 * Хотим поправить фразу — правим здесь, и она меняется во всех шаблонах.
 * Перед запуском тексты проверяют носители языка (старшие в семье).
 */
import type { EventKind, InvitationData, Occasion, Relation } from "@/lib/types";

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

/** «Кем приходится»: набирамиз, ўғлимиз… (с маленькой буквы, в середине фразы) */
const relations: Record<Relation, string> = {
  farzand: "фарзандимиз",
  ogil: "ўғлимиз",
  qiz: "қизимиз",
  nabira: "набирамиз",
  uka: "укамиз",
  ona: "онамиз",
  ota: "отамиз",
};

/** Если виновников торжества двое («Абдураҳмонжон ва Абдуллоҳжон») — множественное число */
const relationsPlural: Record<Relation, string> = {
  farzand: "фарзандларимиз",
  ogil: "ўғилларимиз",
  qiz: "қизларимиз",
  nabira: "набираларимиз",
  uka: "укаларимиз",
  ona: "оналаримиз",
  ota: "оталаримиз",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Родительный падеж: «Мадина» → «Мадинанинг» */
const gen = (name: string) => `${name}нинг`;

/** «набирамиз Муҳаммадалининг» */
function whose(d: InvitationData) {
  const many = / ва /.test(d.person ?? "");
  const rel = (many ? relationsPlural : relations)[d.relation ?? "farzand"];
  return `${rel} ${gen(d.person ?? "")}`;
}

const occasionTitles: Record<Occasion, string> = {
  nikoh: "Никоҳ тўйи",
  sunnat: "Суннат тўйи",
  nahorgi: "Наҳорги ош",
  yubiley: "Юбилей",
};

const eventTitles: Record<EventKind, string> = {
  nahorgi: "Наҳорги ош",
  nikohMarosim: "Никоҳ маросими",
  nikohBazm: "Никоҳ базми",
  kelinSalom: "Келин салом",
  sunnatBazm: "Суннат тўйи базми",
  yubileyBazm: "Юбилей базми",
};

type InviteText = { id: string; greeting: string; body: string };

/**
 * Готовые тексты приглашения по тадбиру. Клиент выбирает один в боте или пишет свой.
 * Первый в списке — по умолчанию.
 */
function inviteTexts(d: InvitationData): InviteText[] {
  const firstIsNahorgi = d.events[0]?.kind === "nahorgi";
  switch (d.occasion) {
    case "nikoh": {
      const couple = `${d.groom} ва ${gen(d.bride ?? "")}`;
      return [
        {
          id: "classic",
          greeting: "Ҳурматли меҳмон!",
          body: `Сизни фарзандларимиз ${couple} никоҳ тўйларига бағишланган базмимизга лутфан таклиф этамиз.`,
        },
        {
          id: "royal",
          greeting: "Азиз ва қадрли меҳмонлар!",
          body: `Ҳаётимизнинг энг қувончли кунида — фарзандларимиз ${couple} никоҳ тўйига Сизни ва оилангизни лутфан таклиф этамиз.`,
        },
        {
          id: "short",
          greeting: "Ҳурматли меҳмонлар!",
          body: "Фарзандларимизнинг никоҳ тўйига Сизни ва оилангизни лутфан таклиф этамиз.",
        },
        {
          id: "warm",
          greeting: "Азиз меҳмонлар!",
          body: `Икки қалб бирлашадиган ушбу муборак кунда ${couple} тўй дастурхонининг тўрида Сизни кўришдан бахтиёр бўламиз.`,
        },
      ];
    }
    case "sunnat":
      return [
        {
          id: "classic",
          greeting: "Азиз меҳмонимиз!",
          body: firstIsNahorgi
            ? `Сизни ${whose(d)} суннат тўйи муносабати билан ёзиладиган наҳорги ошга лутфан таклиф этамиз.`
            : `Сизни ${whose(d)} суннат тўйига лутфан таклиф этамиз.`,
        },
        {
          id: "warm",
          greeting: "Ҳурматли меҳмонлар!",
          body: `${cap(whose(d))} суннат тўйи — оиламизнинг энг қутлуғ кунларидан бири. Шу кунни Сиз билан бирга нишонлашни истаймиз.`,
        },
      ];
    case "nahorgi":
      return [
        {
          id: "classic",
          greeting: "Ҳурматли меҳмон!",
          body: `Сизни ${whose(d)} ${occasionTitles[d.cause ?? "nikoh"].toLowerCase()} муносабати билан бериладиган наҳорги ошга лутфан таклиф этамиз.`,
        },
        {
          id: "morning",
          greeting: "Азиз ва қадрли меҳмонлар!",
          body: `${cap(whose(d))} ${occasionTitles[d.cause ?? "nikoh"].toLowerCase()} муносабати билан тонгги наҳорги ош дастурхонимизга Сизни лутфан таклиф этамиз.`,
        },
      ];
    case "yubiley":
      return [
        {
          id: "classic",
          greeting: "Қадрли меҳмонлар!",
          body: `${cap(whose(d))} ${d.age} ёшлик муборак юбилейи муносабати билан ташкил этиладиган базмга Сизни лутфан таклиф этамиз.`,
        },
      ];
  }
}

export const t = {
  site: {
    title: "InviteIZI — онлайн таклифномалар",
    description: "Чиройли, мусиқали тўй таклифномаси. Битта ҳавола — барча меҳмонлар учун.",
  },

  /** Страница /catalog — все дизайны по тадбирам */
  catalog: {
    title: "Таклифнома дизайнлари",
    lead: "Дизайнни танланг ва телефонда очиб кўринг. Буюртма — Telegram бот орқали.",
    open: "Кўриш",
    watermark: "«НАМУНА» билан",
    number: (n: number) => `№${n}`,
    photo: "Сурат билан",
    ornament: "Нақш билан",
  },

  /** Названия дизайнов каталога */
  designs: {
    "oltin-monogramma": "Олтин монограмма",
    sapfir: "Сапфир",
    "oq-ot": "Оқ от",
    "tonggi-qozon": "Тонгги қозон",
    "pion-guldasta": "Пион гулдаста",
    "ganch-peshtoq": "Ганч пештоқ",
    "zarhal-eshik": "Зарҳал эшик",
    "atlas-tolqin": "Атлас тўлқини",
    "anor-bogi": "Анор боғи",
    "bodom-guli": "Бодом гули",
    "samarqand-kitob": "Самарқанд",
    "ipak-romol": "Ипак рўмол",
    "rishton-koshin": "Риштон кошин",
    atirgul: "Атиргул",
    "shohona-baxmal": "Шоҳона бахмал",
    "tandir-nuri": "Тандир нури",
    dasturxon: "Дастурхон",
    "non-muhr": "Нон муҳри",
    "tonggi-choy": "Тонгги чой",
    "paxta-gul": "Пахта гул",
    "oltin-ot": "Олтин от",
  } as Record<string, string>,

  formats: {
    animated: "Анимацияли",
    simple: "Оддий",
  },
  price: (tenge: number) => `${tenge.toLocaleString("ru-RU").replace(/ /g, " ")} ₸`,

  months,
  weekdays,
  weekdaysShort,
  occasionTitles,
  eventTitles,

  /** Экран открытия (конверт, занавес…) */
  opening: {
    tapToOpen: "Очиш учун босинг",
    invitation: "Таклифнома",
    welcome: "Хуш келибсиз",
  },

  cover: {
    inviteEyebrow: "Тўйга таклиф этамиз",
    and: "&",
    andWord: "ва",
    scrollHint: "Пастга суринг",
  },

  /** Текст приглашения: свой текст клиента или готовый вариант */
  invite(d: InvitationData): Omit<InviteText, "id"> {
    if (d.customText) return { greeting: "", body: d.customText };
    const list = inviteTexts(d);
    return list.find((x) => x.id === d.textId) ?? list[0];
  },

  /** Наҳорги ош: «Ўғлимиз Жасурбекнинг никоҳ тўйи муносабати билан» */
  causeLine: (d: InvitationData) =>
    `${cap(whose(d))} ${occasionTitles[d.cause ?? "nikoh"].toLowerCase()} муносабати билан`,

  /** Юбилей: «Онамиз Мукаррам опанинг 60 ёшлик юбилейи» */
  // неразрывный пробел: «60 ёшлик» не разрывается между строками
  jubileeLine: (d: InvitationData) => `${cap(whose(d))} ${d.age} ёшлик юбилейи`,
  ageLabel: "ёш",

  /** Суннат: «набирамиз» над именем мальчика */
  relationWord: (r: Relation) => cap(relations[r]),

  countdown: {
    title: {
      nikoh: "Тўйгача қолди",
      sunnat: "Тўйгача қолди",
      nahorgi: "Наҳорги ошгача қолди",
      yubiley: "Юбилейгача қолди",
    } satisfies Record<Occasion, string>,
    days: "кун",
    hours: "соат",
    minutes: "дақиқа",
    seconds: "сония",
    today: "Қутлуғ кун келди!",
  },

  date: {
    title: {
      nikoh: "Тўй санаси",
      sunnat: "Тўй санаси",
      nahorgi: "Сана ва вақт",
      yubiley: "Юбилей санаси",
    } satisfies Record<Occasion, string>,
    time: "Соат",
    year: "йил",
    /** «14 ноябр, 2026 йил» */
    long: (day: number, monthIndex: number, year: number) =>
      `${day} ${months[monthIndex]}, ${year} йил`,
    /** «14.11.2026» */
    short: (day: number, monthIndex: number, year: number) =>
      `${String(day).padStart(2, "0")}.${String(monthIndex + 1).padStart(2, "0")}.${year}`,
    /** «Шанба, соат 18:00» */
    dayAndTime: (weekdayIndex: number, time: string) => `${weekdays[weekdayIndex]}, соат ${time}`,
    monthYear: (monthIndex: number, year: number) => `${months[monthIndex]} ${year}`,
    /** «06:00» → «6:00» (так пишут на пригласительных) */
    clock: (time: string) => time.replace(/^0(\d)/, "$1"),
    /** «эрталаб соат 6:00» */
    morningAt: (time: string) => `эрталаб соат ${time.replace(/^0(\d)/, "$1")}`,
    /** «соат 18:00» */
    at: (time: string) => `соат ${time}`,
  },

  venue: {
    title: "Ўтказилиш жойи",
    programTitle: "Тўй дастури",
    openMap: "Харитада очиш",
  },

  /** «Чин юракдан» — тёплые слова в конце */
  heart: {
    title: "Чин юракдан",
    text: {
      nikoh:
        "Сизнинг иштирокингиз ва эзгу тилакларингиз — оиламиз учун энг қимматли совға. Ушбу қутлуғ кунда ёнимизда бўлсангиз, бахтиёр бўламиз.",
      sunnat:
        "Ушбу қутлуғ кунда дуоларингиз ва ташрифингиз биз учун энг азиз совға бўлади. Қувончимизга шерик бўлинг!",
      nahorgi:
        "Тонгги дастурхонимиз Сизнинг ташрифингиз билан тўкис бўлади. Дуоларингиз — биз учун энг азиз совға.",
      yubiley:
        "Ушбу муборак кунда ёнимизда бўлишингиз — биз учун катта бахт ва ҳурмат. Дуо ва эзгу тилакларингизни интизорлик билан кутамиз.",
    } satisfies Record<Occasion, string>,
  },

  /** Никоҳ: две семьи */
  sides: {
    groom: "Куёв томони",
    bride: "Келин томони",
  },

  /** Оқ фотиҳа — короткое благословение в рамке */
  blessing: {
    title: "Оқ фотиҳа",
    text: {
      nikoh: "Илоҳим, ёшларимизнинг бахти бутун, умри узоқ, хонадони файзли бўлсин. Омин!",
      sunnat: "Илоҳим, фарзандимиз соғ-омон улғайсин, умри узоқ, бахти бутун бўлсин. Омин!",
      nahorgi: "Дастурхонимиз доимо тўкин, хонадонимиз файзли, дийдорлашувимиз бардавом бўлсин. Омин!",
      yubiley: "Илоҳим, азизимизнинг умри узоқ, саломатлиги мустаҳкам, бахти бутун бўлсин. Омин!",
    } satisfies Record<Occasion, string>,
  },

  hosts: {
    thanks: "Ташрифингиздан мамнун бўламиз!",
    respectDeep: "Ҳурмат ва эҳтиром билан",
    respect: "Ҳурмат билан",
    waiting: "Кутиб қоламиз!",
    closing: "Сизни интизорлик билан кутамиз!",
  },

  music: {
    play: "Мусиқани ёқиш",
    pause: "Мусиқани ўчириш",
  },

  watermark: "НАМУНА",
  watermarkNote: "Тўловдан сўнг бу ёзув олиб ташланади",

  /**
   * Свои слова дизайнов (если общих не хватило). Каждый дизайнер правит ТОЛЬКО свою строку.
   */
  design: {
    "ganch-peshtoq": {}, // тексты ganch-peshtoq
    "zarhal-eshik": {}, // тексты zarhal-eshik
    "atlas-tolqin": {}, // тексты atlas-tolqin
    "anor-bogi": {}, // тексты anor-bogi
    "bodom-guli": {}, // тексты bodom-guli
    "samarqand-kitob": {}, // тексты samarqand-kitob
    "ipak-romol": {}, // тексты ipak-romol
    "rishton-koshin": {}, // тексты rishton-koshin
    "atirgul": {}, // тексты atirgul
    "shohona-baxmal": {}, // тексты shohona-baxmal
    "tandir-nuri": {}, // тексты tandir-nuri
    "dasturxon": {}, // тексты dasturxon
    "non-muhr": {}, // тексты non-muhr
    "tonggi-choy": {}, // тексты tonggi-choy
    "paxta-gul": {}, // тексты paxta-gul
    "oltin-ot": {}, // тексты oltin-ot
  },

  footer: {
    madeWith: "InviteIZI орқали яратилди",
  },
} as const;

export type Texts = typeof t;
