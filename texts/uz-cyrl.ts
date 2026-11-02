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
  ozimiz: "",
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
  ozimiz: "",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Родительный падеж: «Мадина» → «Мадинанинг» */
const gen = (name: string) => `${name}нинг`;

/** «набирамиз Муҳаммадалининг» */
function whose(d: InvitationData) {
  const many = / ва /.test(d.person ?? "");
  const rel = (many ? relationsPlural : relations)[d.relation ?? "farzand"];
  return rel ? `${rel} ${gen(d.person ?? "")}` : gen(d.person ?? "");
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
      // «фарзандларимиз Азиз ва Мадинанинг»; для «ўзимизники» — просто имена
      const own = d.relation === "ozimiz";
      const kin = own ? "" : `${relationsPlural[d.relation ?? "farzand"]} `;
      return [
        {
          id: "classic",
          greeting: "Ҳурматли меҳмон!",
          body: `Сизни ${kin}${couple} никоҳ тўйларига бағишланган базмимизга лутфан таклиф этамиз.`,
        },
        {
          id: "royal",
          greeting: "Азиз ва қадрли меҳмонлар!",
          body: `Ҳаётимизнинг энг қувончли кунида — ${kin}${couple} никоҳ тўйига Сизни ва оилангизни лутфан таклиф этамиз.`,
        },
        {
          id: "short",
          greeting: "Ҳурматли меҳмонлар!",
          body: own
            ? "Никоҳ тўйимизга Сизни ва оилангизни лутфан таклиф этамиз."
            : `${cap(relationsPlural[d.relation ?? "farzand"])}нинг никоҳ тўйига Сизни ва оилангизни лутфан таклиф этамиз.`,
        },
        {
          id: "warm",
          greeting: "Азиз меҳмонлар!",
          body: `Икки қалб бирлашадиган ушбу муборак кунда ${couple} тўй дастурхонининг тўрида Сизни кўришдан бахтиёр бўламиз.`,
        },
        {
          id: "dua",
          greeting: "Ассалому алайкум, азиз меҳмон!",
          body: `Аллоҳнинг инояти билан ${kin}${couple} никоҳ тўйини ўтказмоқдамиз. Ёшларимизга оқ фотиҳа бериш учун тўйимизга марҳамат қилишингизни сўраймиз.`,
        },
        {
          id: "modern",
          greeting: "Қадрли дўстлар ва яқинларимиз!",
          body: `${couple} ҳаётидаги энг гўзал кунни — никоҳ тўйини Сиз билан бирга нишонлашни истаймиз. Сизни интизорлик билан кутамиз!`,
        },
        {
          id: "parents",
          greeting: "Ҳурматли қариндош-уруғлар ва дўстлар!",
          body: own
            ? `Ота-оналаримизнинг дуоси билан никоҳ тўйимизни ўтказмоқдамиз. Шу қутлуғ кунимизда Сизни ҳам ёнимизда кўришни истаймиз.`
            : `Биз, ота-оналар, ${kin}${couple} никоҳ тўйи муносабати билан Сизни қувончимизга шерик бўлишга чорлаймиз.`,
        },
        {
          id: "young",
          greeting: "Азиз меҳмонлар!",
          body: `Биз — ${d.groom} ва ${d.bride} — ҳаётимизни бир этишга аҳд қилдик. Шу қутлуғ кунимизда ёнимизда бўлишингизни чин дилдан истаймиз.`,
        },
      ];
    }
    case "sunnat": {
      const w = whose(d);
      return [
        {
          id: "classic",
          greeting: "Азиз меҳмонимиз!",
          body: firstIsNahorgi
            ? `Сизни ${w} суннат тўйи муносабати билан ёзиладиган наҳорги ошга лутфан таклиф этамиз.`
            : `Сизни ${w} суннат тўйига лутфан таклиф этамиз.`,
        },
        {
          id: "warm",
          greeting: "Ҳурматли меҳмонлар!",
          body: `${cap(w)} суннат тўйи — оиламизнинг энг қутлуғ кунларидан бири. Шу кунни Сиз билан бирга нишонлашни истаймиз.`,
        },
        {
          id: "royal",
          greeting: "Азиз ва қадрли меҳмонлар!",
          body: `Хонадонимизнинг энг қувончли кунида — ${w} суннат тўйида Сизни ва оилангизни кўришдан мамнун бўламиз.`,
        },
        {
          id: "short",
          greeting: "Ҳурматли меҳмон!",
          body: `${cap(w)} суннат тўйига марҳамат!`,
        },
        {
          id: "dua",
          greeting: "Ассалому алайкум!",
          body: `Аллоҳ насиб этиб, ${w} суннат тўйини ўтказмоқдамиз. Дуо ва оқ фотиҳангизни кутиб қоламиз.`,
        },
        {
          id: "modern",
          greeting: "Қадрли яқинларимиз!",
          body: `${cap(w)} ҳаётидаги илк катта байрам — суннат тўйи! Шу қувончли кунни Сиз билан бирга нишонлайлик.`,
        },
        {
          id: "family",
          greeting: "Ҳурматли қариндош-уруғлар ва дўстлар!",
          body: `Бутун оиламиз номидан ${w} суннат тўйига Сизни ва оилангизни лутфан таклиф этамиз.`,
        },
        {
          id: "traditional",
          greeting: "Азиз меҳмонимиз!",
          body: `${cap(w)} суннат тўйи муносабати билан ёзиладиган дастурхонимизга ташриф буюришингизни сўраймиз.`,
        },
      ];
    }
    case "nahorgi": {
      const w = whose(d);
      // «никоҳ тўйи» / «суннат тўйи»
      const cause = occasionTitles[d.cause ?? "nikoh"].toLowerCase();
      return [
        {
          id: "classic",
          greeting: "Ҳурматли меҳмон!",
          body: `Сизни ${w} ${cause} муносабати билан бериладиган наҳорги ошга лутфан таклиф этамиз.`,
        },
        {
          id: "morning",
          greeting: "Азиз ва қадрли меҳмонлар!",
          body: `${cap(w)} ${cause} муносабати билан тонгги наҳорги ош дастурхонимизга Сизни лутфан таклиф этамиз.`,
        },
        {
          id: "short",
          greeting: "Ҳурматли меҳмон!",
          body: `${cap(w)} ${cause} муносабати билан наҳорги ошга марҳамат!`,
        },
        {
          id: "dua",
          greeting: "Ассалому алайкум!",
          body: `${cap(w)} ${cause} олдидан тонгги ош дастурхонини ёзиб, дуоларингизни олмоқчимиз. Ташрифингизни интизорлик билан кутамиз.`,
        },
        {
          id: "royal",
          greeting: "Азиз ва қадрли меҳмонлар!",
          body: `Хонадонимиз қувончи — ${w} ${cause} муносабати билан бериладиган наҳорги ошга Сизни ва оилангизни лутфан таклиф этамиз.`,
        },
        {
          id: "warm",
          greeting: "Қадрли қўни-қўшни ва қариндошлар!",
          body: `Тонгда бир коса ош ва бир пиёла чой устида ${w} ${cause}ни бирга нишонлайлик. Сизни кутиб қоламиз!`,
        },
        {
          id: "family",
          greeting: "Ҳурматли меҳмонлар!",
          body: `Оиламиз номидан ${w} ${cause} муносабати билан тонгги наҳорги ошга Сизни лутфан таклиф этамиз. Ташрифингиз — биз учун шараф.`,
        },
        {
          id: "traditional",
          greeting: "Азиз меҳмонимиз!",
          body: `Эрта тонгда ${w} ${cause} шарафига ош дамлаймиз. Дастурхонимизга марҳамат қилинг!`,
        },
      ];
    }
    case "yubiley": {
      const w = whose(d);
      const age = `${d.age ?? ""} ёшлик`;
      return [
        {
          id: "classic",
          greeting: "Қадрли меҳмонлар!",
          body: `${cap(w)} ${age} муборак юбилейи муносабати билан ташкил этиладиган базмга Сизни лутфан таклиф этамиз.`,
        },
        {
          id: "royal",
          greeting: "Азиз ва қадрли меҳмонлар!",
          body: `${cap(w)} ${age} муборак тўйида Сизни ва оилангизни кўришдан бахтиёр бўламиз.`,
        },
        {
          id: "short",
          greeting: "Ҳурматли меҳмон!",
          body: `${cap(w)} ${age} юбилейига марҳамат!`,
        },
        {
          id: "dua",
          greeting: "Ассалому алайкум!",
          body: `Аллоҳ берган умр баракаси билан ${w} ${age} юбилейини нишонламоқдамиз. Дуоларингиз билан бу кунни янада файзли қилинг.`,
        },
        {
          id: "warm",
          greeting: "Қадрли яқинларимиз!",
          body: `${cap(w)} ${age} юбилейи — бутун оиламиз учун қутлуғ сана. Шу кунни Сиз билан бирга ўтказишни истаймиз.`,
        },
        {
          id: "modern",
          greeting: "Азиз дўстлар!",
          body: `${cap(w)} ${age} байрамини бирга нишонлайлик! Сизни интизорлик билан кутамиз.`,
        },
        {
          id: "children",
          greeting: "Ҳурматли меҳмонлар!",
          body: `Биз — фарзандлар ва набиралар — ${w} ${age} юбилейи базмига Сизни лутфан таклиф этамиз.`,
        },
        {
          id: "traditional",
          greeting: "Азиз меҳмонимиз!",
          body: `${cap(w)} ${d.age ?? ""} ёшга тўлиши муносабати билан ёзиладиган дастурхонимизга ташриф буюришингизни сўраймиз.`,
        },
      ];
    }
  }
}

/** Страница /{slug}: «Азиз ва Мадина» · «Жасурбек» · «Каримовлар оиласи» */
function pageNames(d: InvitationData): string {
  return d.groom && d.bride ? `${d.groom} ва ${d.bride}` : d.person || d.groom || d.bride || d.hosts;
}

const pageInviteTo = {
  nikoh: "Тўйга таклиф этамиз",
  sunnat: "Суннат тўйига таклиф этамиз",
  nahorgi: "Наҳорги ошга таклиф этамиз",
  yubiley: "Юбилейга таклиф этамиз",
} satisfies Record<Occasion, string>;

export const t = {
  photoCredits: {
    by: (author: string) => `Сурат: ${author}`,
    label: "Сурат:",
    adapted: "Сурат ўлчами ва кўриниши мослаштирилган.",
  },
  site: {
    title: "InviteIZI — онлайн таклифномалар",
    description: "Чиройли, мусиқали тўй таклифномаси. Битта ҳавола — барча меҳмонлар учун.",
  },

  /** Страница /catalog — все дизайны по тадбирам */
  catalog: {
    title: "Таклифнома дизайнлари",
    lead: "Дизайнни танланг ва телефонда очиб кўринг. Буюртма — Telegram бот орқали.",
    open: "Кўриш",
    number: (n: number) => `№${n}`,
    photo: "Сурат билан",
    ornament: "Нақш билан",
  },

  /** Названия дизайнов каталога */
  designs: {
    muhr: "Муҳр",
    ipak: "Ипак",
    bog: "Боғ",
    "tong-dasturxon": "Тонгги дастурхон",
    "sunnat-muqova": "Суннат муқоваси",
    "sunnat-nasab": "Оила шажараси",
    "sahar-ipagi": "Саҳар ипаги",
    "sahar-maktubi": "Саҳар мактуби",
    "umr-sahifalari": "Умр саҳифалари",
    "ehtirom-kartasi": "Эҳтиром варағи",
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
    "oq-chinni": "Оқ чинни",
    doppicha: "Дўппича",
    "sayram-hovli": "Сайрам ҳовлиси",
    zarvaraq: "Зарварақ",
    "umr-daraxti": "Умр дарахти",
    "marvarid-satr": "Марварид сатри",
    "gulbog-sahifa": "Гулбоғ саҳифаси",
    "suzani-yol": "Сўзана йўли",
    "bugdoy-boshoq": "Буғдой бошоғи",
    "lola-ehtirom": "Лола эҳтироми",
    "zarhal-lavha": "Зарҳал лавҳа",
    "adras-nishon": "Адрас нишони",
    "mis-kafgir": "Мис капгир",
    "rayhon-sahari": "Райҳон саҳари",
    "visol-rishta": "Висол риштаси",
    "uzum-hovli": "Узум ҳовлиси",
    "sopol-navo": "Сопол навоси",
    "girih-nur": "Гиреҳ нури",
    "siyoh-duo": "Сиёҳ дуоси",
    "kabutar-salom": "Кабутар саломи",
    "shirin-tilak": "Ширин тилак",
    "minor-satr": "Минор сатри",
    "kumush-taroq": "Кумуш тароқ",
    "shabnam-visol": "Шабнам висоли",
    "visol-soati": "Висол соати",
    "dutor-navosi": "Дутор навоси",
    "tut-qogozi": "Тут қоғози",
    "qosh-uzuk": "Қўш узук",
    "yelpigich-ziynat": "Елпиғич зийнати",
    "saodat-kaliti": "Саодат калити",
  } as Record<string, string>,

  formats: {
    animated: "Анимацияли",
    scroll: "Варақланадиган",
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

  /** Все готовые варианты текста для тадбира (бот показывает их клиенту на выбор) */
  inviteOptions: (d: InvitationData): InviteText[] => inviteTexts(d),

  /** Наҳорги ош: «Ўғлимиз Жасурбекнинг никоҳ тўйи муносабати билан» */
  causeLine: (d: InvitationData) =>
    `${cap(whose(d))} ${occasionTitles[d.cause ?? "nikoh"].toLowerCase()} муносабати билан`,

  /** Юбилей: «Онамиз Мукаррам опанинг 60 ёшлик юбилейи» */
  // неразрывный пробел: «60 ёшлик» не разрывается между строками
  jubileeLine: (d: InvitationData) => `${cap(whose(d))} ${d.age} ёшлик юбилейи`,
  ageLabel: "ёш",

  /** Суннат: «набирамиз» над именем мальчика */
  /** person — чтобы для двух мальчиков («А ва Б») было «Набираларимиз», а не «Набирамиз» */
  relationWord: (r: Relation, person?: string) => cap((/ ва /.test(person ?? "") ? relationsPlural : relations)[r]),
  /** Подпись «кем приходится» для кнопок и проверки данных */
  relationLabel: {
    farzand: "Фарзандимиз",
    ogil: "Ўғлимиз",
    qiz: "Қизимиз",
    nabira: "Набирамиз",
    uka: "Укамиз",
    ona: "Онамиз",
    ota: "Отамиз",
    ozimiz: "Ўзимизники",
  } satisfies Record<Relation, string>,

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

  brand: {
    badge: "InviteIZI",
    badgeLabel: "InviteIZI ботини очиш",
    footer: "InviteIZI билан яратилди",
    footerLink: "Ўз таклифномангизни яратинг",
  },
  rsvp: {
    title: "Келасизми?",
    name: "Исмингиз",
    guests: "Неча киши келади?",
    less: "Камайтириш",
    more: "Кўпайтириш",
    yes: "Келаман",
    no: "Келолмайман",
    thanksYes: "Раҳмат! Сизни кутиб қоламиз.",
    thanksNo: "Раҳмат, жавобингиз етказилди.",
    change: "Жавобни ўзгартириш",
    preview: "Бу намуна — жавоблар тўловдан кейин сақланади",
    previewThanks: "Раҳмат!",
    error: "Юборилмади. Интернетни текшириб, яна уриниб кўринг.",
    limited: "Жавоблар кўп юборилди. Бироздан сўнг уриниб кўринг.",
  },
  /**
   * «Натуральные» дизайны: рукописные слова-акценты. Рукописный шрифт (Great Vibes) не знает қ ғ ҳ —
   * в этих словах таких букв нет (проверяет тест); если появятся, дизайн сам возьмёт запасной рукописный.
   */
  natural: {
    date: "Сана",
    place: "Манзил",
    program: "Дастур",
    come: "Келинг",
    wait: "Кутамиз",
    open: "Очинг",
    family: "Оила",
    and: "ва",
    morning: "эрталаб",
    sides: "Тўй эгалари",
    playHint: "Таклифномани очиш",
    calendarAria: (date: string) => `Тадбир куни: ${date}`,
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
    "anor-bogi": {
      // тилак под оқ фотиҳа: анор — символ большой дружной семьи и достатка
      anorWish: "Ёшларимиз анор доналаридек аҳил, хонадонлари анордек тўкин-сочин бўлсин!",
    }, // тексты anor-bogi
    "bodom-guli": {
      // тилак под оқ фотиҳа: бодом гули — баҳорнинг биринчи гули, янги ҳаёт рамзи
      bodomWish: "Ёшларимизнинг ҳаёти баҳордаги бодом гулидек доимо гуллаб-яшнасин!",
    }, // тексты bodom-guli
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

  /** Страница заказа /{slug}: заголовок ссылки в мессенджерах, картинка-превью, заглушка после тўя */
  invitationPage: {
    names: pageNames,
    inviteTo: pageInviteTo,
    /** Заголовок вкладки и ссылки: «Азиз ва Мадина — Никоҳ тўйи» */
    metaTitle: (d: InvitationData) => `${pageNames(d)} — ${occasionTitles[d.occasion]}`,
    /** «Тўйга таклиф этамиз · 12 декабр, 2026 йил» */
    metaDescription: (d: InvitationData, dateText?: string) =>
      [pageInviteTo[d.occasion], dateText].filter(Boolean).join(" · "),
    loading: "Таклифнома очилмоқда…",
    expired: {
      title: "Таклифнома муддати тугади",
      body: "Тадбир ўтиб кетди. Ташрифингиз ва яхши тилакларингиз учун катта раҳмат!",
      brand: "InviteIZI — онлайн таклифномалар",
    },
  },

  footer: {
    madeWith: "InviteIZI орқали яратилди",
  },
} as const;

export type Texts = typeof t;

/** Public attribution metadata for photographs that require it, reused in bot/assets/pages. */
export const photoAttributions: Record<string,{author:string;license:string;licenseUrl:string;source:string}|undefined> = {
  "tonggi-choy": {author:"Ekaterina Kvelidze",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",source:"https://commons.wikimedia.org/wiki/File:Uzbek_tea_couple_with_traditional_coloration.jpg"},
};

/**
 * Свои заголовки для каждого дизайна: у клиентов в каталоге не должно быть
 * одинаковых «Тўйгача қолди / Тўй дастури» во всех шаблонах.
 * Дизайн берёт тексты так: `const t = designTexts("ganch-peshtoq")` — всё остальное как в `t`.
 * Нет записи — общие заголовки из `t`.
 */
type Headings = {
  countdown?: string; // «… гача қолди»
  date?: string; // «Тўй санаси»
  program?: string; // «Тўй дастури»
  venue?: string; // «Ўтказилиш жойи»
  heart?: string; // «Чин юракдан»
  blessing?: string; // «Оқ фотиҳа»
  tap?: string; // «Очиш учун босинг»
  thanks?: string; // «Ташрифингиздан мамнун бўламиз!»
  waiting?: string; // «Кутиб қоламиз!»
};

const headings: Record<string, Headings> = {
  "marvarid-satr": {program:"Азиз учрашув",waiting:"Қувончимизга шерик бўлинг!"},
  "gulbog-sahifa": {date:"Гўзал сана",countdown:"Бахтли онларгача",program:"Бахтли кун дастури",waiting:"Гулдек кунларимизга марҳамат!"},
  "suzani-yol": {date:"Қутлуғ кун",countdown:"Тўйимизгача",program:"Тўйимиз тартиби",thanks:"Ташрифингиздан мамнун бўламиз!"},
  "bugdoy-boshoq": {program:"Тонгги дастурхон",waiting:"Хонадонимизга марҳамат!"},
  "lola-ehtirom": {date:"Эъзозли сана",countdown:"Дийдорлашувгача",program:"Байрам дастури",waiting:"Дийдорингиз биз учун азиз!"},
  "oq-chinni": {program:"Тонгги учрашув",waiting:"Дастурхонимизга марҳамат!"},
  doppicha: {program:"Қувончли кунимиз",waiting:"Тўйимизга марҳамат!"},
  "sayram-hovli": {date:"Тўй куни",countdown:"Қувончли кунгача",program:"Тўй кунининг тартиби",blessing:"Эзгу дуолар",thanks:"Қувончимизга шерик бўлинг!"},
  zarvaraq: {program:"Муборак учрашув",waiting:"Ташрифингиз биз учун азиз!"},
  "umr-daraxti": {date:"Қадрли сана",countdown:"Муборак санагача",program:"Дийдорлашув дастури",blessing:"Меҳр ва дуо",waiting:"Сизни интизорлик билан кутамиз!"},
  // №1 — эталон: общие заголовки
  "oltin-monogramma": {},
  "oq-ot": { countdown: "Қутлуғ кунгача", date: "Қутлуғ сана", venue: "Тўй манзили", tap: "Пардани очинг" },
  "tonggi-qozon": { countdown: "Тонгги дастурхонгача", date: "Ош санаси", venue: "Ош манзили", tap: "Таклифномани очиш учун босинг" },
  "pion-guldasta": { countdown: "Муборак кунгача", date: "Юбилей куни", venue: "Базм манзили", tap: "Конвертни очинг" },
  "tandir-nuri": {
    countdown: "Ош кунигача қолди",
    date: "Тонгги ош куни",
    program: "Тадбир тартиби",
    venue: "Дастурхон манзили",
    blessing: "Дуо",
    tap: "Таклифномани очинг",
  },
  "ganch-peshtoq": {
    countdown: "Бахтли кунгача",
    date: "Никоҳ куни",
    program: "Тўй тартиби",
    heart: "Қалбдан сўз",
    tap: "Очиш учун енгил босинг",
  },
  "ipak-romol": {
    countdown: "Қутлуғ онгача",
    program: "Тадбирлар",
    blessing: "Эзгу тилак",
    thanks: "Ташрифингизни интизорлик билан кутамиз!",
  },
  "anor-bogi": {
    countdown: "Тўй куни яқин",
    date: "Бахтли сана",
    program: "Тўй кунлари",
    blessing: "Ниятимиз",
    tap: "Очиш учун тегининг",
    waiting: "Сизни кутамиз!",
  },
  "oltin-ot": {
    countdown: "Шаҳзодамиз тўйигача",
    program: "Тадбирлар тартиби",
    heart: "Дилдан сўз",
    blessing: "Дуо",
    tap: "Қутичани очинг",
    thanks: "Ташрифингиз — биз учун шараф!",
  },
};

const allOccasions = (s: string) => ({ nikoh: s, sunnat: s, nahorgi: s, yubiley: s }) satisfies Record<Occasion, string>;

/** Тексты для дизайна: общие `t` + свои заголовки этого дизайна */
export function designTexts(id: string): Texts {
  const h = headings[id] ?? {};
  return {
    ...t,
    countdown: { ...t.countdown, title: h.countdown ? allOccasions(h.countdown) : t.countdown.title },
    date: { ...t.date, title: h.date ? allOccasions(h.date) : t.date.title },
    venue: { ...t.venue, programTitle: h.program ?? t.venue.programTitle, title: h.venue ?? t.venue.title },
    heart: { ...t.heart, title: h.heart ?? t.heart.title },
    blessing: { ...t.blessing, title: h.blessing ?? t.blessing.title },
    opening: { ...t.opening, tapToOpen: h.tap ?? t.opening.tapToOpen },
    hosts: { ...t.hosts, thanks: h.thanks ?? t.hosts.thanks, waiting: h.waiting ?? t.hosts.waiting },
  } as unknown as Texts;
}
