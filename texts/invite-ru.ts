/**
 * Пригласительное на русском (v2, часть 9): только то, что видит гость на странице /{slug} и /demo.
 * Имена не склоняем (узбекские имена в русском склоняются по-разному): имя стоит после тире
 * в именительном падеже — «на свадьбу наших детей — Азиз и Мадина».
 * Ключи совпадают с texts/uz-cyrl.ts; полноту проверяет texts/invite-i18n.test.ts.
 */
import type { EventKind, InvitationData, Occasion, Relation } from "@/lib/types";

const months = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;
const monthsNom = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;
// Неделя с понедельника, как в uz
const weekdays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"] as const;
const weekdaysShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

/** «нашего внука» — кого (после «свадьба / суннат-той …») */
const relGen: Record<Relation, string> = {
  farzand: "нашего ребёнка",
  ogil: "нашего сына",
  qiz: "нашей дочери",
  nabira: "нашего внука",
  uka: "нашего младшего брата",
  ona: "нашей мамы",
  ota: "нашего папы",
  ozimiz: "",
};
const relGenPlural: Record<Relation, string> = {
  farzand: "наших детей",
  ogil: "наших сыновей",
  qiz: "наших дочерей",
  nabira: "наших внуков",
  uka: "наших младших братьев",
  ona: "наших мам",
  ota: "наших пап",
  ozimiz: "",
};
/** «Наш внук» — над именем */
const relNom: Record<Relation, string> = {
  farzand: "Наш ребёнок",
  ogil: "Наш сын",
  qiz: "Наша дочь",
  nabira: "Наш внук",
  uka: "Наш младший брат",
  ona: "Наша мама",
  ota: "Наш папа",
  ozimiz: "",
};
const relNomPlural: Record<Relation, string> = {
  farzand: "Наши дети",
  ogil: "Наши сыновья",
  qiz: "Наши дочери",
  nabira: "Наши внуки",
  uka: "Наши младшие братья",
  ona: "Наши мамы",
  ota: "Наши папы",
  ozimiz: "",
};

/** Узбекское «ва» в имени («Абдураҳмонжон ва Абдуллоҳжон») → «и» */
const and = (s?: string) => (s ?? "").replace(/ ва /g, " и ");
const many = (d: InvitationData) => / ва /.test(d.person ?? "");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «нашего внука — Муҳаммадали»; для «ўзимизники» — просто имя */
function whose(d: InvitationData) {
  const rel = (many(d) ? relGenPlural : relGen)[d.relation ?? "farzand"];
  return rel ? `${rel} — ${and(d.person)}` : and(d.person);
}

const occasionTitles: Record<Occasion, string> = {
  nikoh: "Свадьба",
  sunnat: "Суннат-той",
  nahorgi: "Утренний плов",
  yubiley: "Юбилей",
};
/** Повод наҳорги ош в нужном падеже: «по случаю свадьбы», «перед свадьбой», «отметим свадьбу», «радость — свадьба» */
const causeForms: Record<Exclude<Occasion, "nahorgi">, { nom: string; gen: string; acc: string; ins: string }> = {
  nikoh: { nom: "свадьба", gen: "свадьбы", acc: "свадьбу", ins: "свадьбой" },
  sunnat: { nom: "суннат-той", gen: "суннат-тоя", acc: "суннат-той", ins: "суннат-тоем" },
  yubiley: { nom: "юбилей", gen: "юбилея", acc: "юбилей", ins: "юбилеем" },
};

const eventTitles: Record<EventKind, string> = {
  nahorgi: "Утренний плов",
  nikohMarosim: "Никах",
  nikohBazm: "Свадебный вечер",
  kelinSalom: "Келин салом",
  sunnatBazm: "Торжество суннат-тоя",
  yubileyBazm: "Юбилейный вечер",
};

type InviteText = { id: string; greeting: string; body: string };

function inviteTexts(d: InvitationData): InviteText[] {
  const firstIsNahorgi = d.events[0]?.kind === "nahorgi";
  switch (d.occasion) {
    case "nikoh": {
      const couple = `${d.groom} и ${d.bride}`;
      const own = d.relation === "ozimiz";
      const kin = own ? "" : `${relGenPlural[d.relation ?? "farzand"]} — `;
      const of = own ? `${couple}` : `${kin}${couple}`;
      return [
        { id: "classic", greeting: "Дорогой гость!", body: `Сердечно приглашаем Вас на свадебное торжество ${of}.` },
        {
          id: "royal",
          greeting: "Дорогие и уважаемые гости!",
          body: `В самый радостный день нашей жизни приглашаем Вас и Вашу семью на свадьбу ${of}.`,
        },
        {
          id: "short",
          greeting: "Дорогие гости!",
          body: own
            ? "Приглашаем Вас и Вашу семью на нашу свадьбу."
            : `Приглашаем Вас и Вашу семью на свадьбу ${relGenPlural[d.relation ?? "farzand"]}.`,
        },
        {
          id: "warm",
          greeting: "Дорогие гости!",
          body: `В этот благословенный день, когда соединяются два сердца, — ${couple} — мы будем счастливы видеть Вас за нашим свадебным дастарханом.`,
        },
        {
          id: "dua",
          greeting: "Ассаляму алейкум, дорогой гость!",
          body: `По милости Всевышнего мы проводим свадьбу ${of}. Просим Вас прийти и благословить молодых.`,
        },
        {
          id: "modern",
          greeting: "Дорогие друзья и близкие!",
          body: `Самый прекрасный день в жизни — ${couple} — хотим отпраздновать вместе с Вами. С нетерпением ждём Вас!`,
        },
        {
          id: "parents",
          greeting: "Уважаемые родные и друзья!",
          body: own
            ? "С благословения наших родителей мы проводим свадьбу. В этот счастливый день хотим видеть рядом и Вас."
            : `Мы, родители, приглашаем Вас разделить нашу радость — свадьбу ${of}.`,
        },
        {
          id: "young",
          greeting: "Дорогие гости!",
          body: `Мы — ${d.groom} и ${d.bride} — решили соединить свои судьбы. В этот счастливый день от всей души хотим, чтобы Вы были рядом.`,
        },
      ];
    }
    case "sunnat": {
      const w = whose(d);
      return [
        {
          id: "classic",
          greeting: "Дорогой гость!",
          body: firstIsNahorgi
            ? `Сердечно приглашаем Вас на утренний плов по случаю суннат-тоя ${w}.`
            : `Сердечно приглашаем Вас на суннат-той ${w}.`,
        },
        {
          id: "warm",
          greeting: "Уважаемые гости!",
          body: `Суннат-той ${w} — один из самых светлых дней нашей семьи. Хотим отпраздновать его вместе с Вами.`,
        },
        {
          id: "royal",
          greeting: "Дорогие и уважаемые гости!",
          body: `В самый радостный день нашего дома — на суннат-тое ${w} — будем рады видеть Вас и Вашу семью.`,
        },
        { id: "short", greeting: "Дорогой гость!", body: `Добро пожаловать на суннат-той ${w}!` },
        {
          id: "dua",
          greeting: "Ассаляму алейкум!",
          body: `По воле Всевышнего мы проводим суннат-той ${w}. Ждём Ваших молитв и благословения.`,
        },
        {
          id: "modern",
          greeting: "Дорогие близкие!",
          body: `Первый большой праздник в жизни ${w} — суннат-той! Давайте отметим этот радостный день вместе.`,
        },
        {
          id: "family",
          greeting: "Уважаемые родные и друзья!",
          body: `От имени всей нашей семьи приглашаем Вас и Вашу семью на суннат-той ${w}.`,
        },
        {
          id: "traditional",
          greeting: "Дорогой гость!",
          body: `Просим Вас пожаловать к нашему дастархану по случаю суннат-тоя ${w}.`,
        },
      ];
    }
    case "nahorgi": {
      const w = whose(d);
      const c = causeForms[d.cause ?? "nikoh"];
      return [
        {
          id: "classic",
          greeting: "Дорогой гость!",
          body: `Сердечно приглашаем Вас на утренний плов по случаю ${c.gen} ${w}.`,
        },
        {
          id: "morning",
          greeting: "Дорогие и уважаемые гости!",
          body: `По случаю ${c.gen} ${w} приглашаем Вас к нашему утреннему дастархану с пловом.`,
        },
        { id: "short", greeting: "Дорогой гость!", body: `Добро пожаловать на утренний плов по случаю ${c.gen} ${w}!` },
        {
          id: "dua",
          greeting: "Ассаляму алейкум!",
          body: `Перед ${c.ins} ${w} мы накрываем утренний дастархан и просим Ваших молитв. С нетерпением ждём Вас.`,
        },
        {
          id: "royal",
          greeting: "Дорогие и уважаемые гости!",
          body: `Радость нашего дома — ${c.nom} ${w}. Приглашаем Вас и Вашу семью на утренний плов.`,
        },
        {
          id: "warm",
          greeting: "Дорогие соседи и родные!",
          body: `Утром, за пиалой чая и пловом, отметим вместе ${c.acc} ${w}. Ждём Вас!`,
        },
        {
          id: "family",
          greeting: "Уважаемые гости!",
          body: `От имени нашей семьи приглашаем Вас на утренний плов по случаю ${c.gen} ${w}. Ваш приход — честь для нас.`,
        },
        {
          id: "traditional",
          greeting: "Дорогой гость!",
          body: `Ранним утром в честь ${c.gen} ${w} мы готовим плов. Добро пожаловать к нашему дастархану!`,
        },
      ];
    }
    case "yubiley": {
      const w = whose(d);
      const age = `${d.age ?? ""}-летний`;
      return [
        {
          id: "classic",
          greeting: "Дорогие гости!",
          body: `Сердечно приглашаем Вас на торжество по случаю ${d.age ?? ""}-летнего юбилея ${w}.`,
        },
        {
          id: "royal",
          greeting: "Дорогие и уважаемые гости!",
          body: `Будем счастливы видеть Вас и Вашу семью на ${age.replace(/ий$/, "ем")} юбилее ${w}.`,
        },
        { id: "short", greeting: "Дорогой гость!", body: `Добро пожаловать на ${age} юбилей ${w}!` },
        {
          id: "dua",
          greeting: "Ассаляму алейкум!",
          body: `Благодарим Всевышнего за долгие годы жизни — мы отмечаем ${age} юбилей ${w}. Сделайте этот день ещё светлее Вашими добрыми пожеланиями.`,
        },
        {
          id: "warm",
          greeting: "Дорогие близкие!",
          body: `${age.charAt(0).toUpperCase()}${age.slice(1)} юбилей ${w} — радостная дата для всей нашей семьи. Хотим провести этот день вместе с Вами.`,
        },
        {
          id: "modern",
          greeting: "Дорогие друзья!",
          body: `Давайте вместе отпразднуем ${age} юбилей ${w}! С нетерпением ждём Вас.`,
        },
        {
          id: "children",
          greeting: "Уважаемые гости!",
          body: `Мы — дети и внуки — приглашаем Вас на юбилейный вечер: ${age} юбилей ${w}.`,
        },
        {
          id: "traditional",
          greeting: "Дорогой гость!",
          body: `Просим Вас пожаловать к нашему дастархану по случаю ${d.age ?? ""}-летия ${w}.`,
        },
      ];
    }
  }
}

const pageNames = (d: InvitationData) =>
  d.groom && d.bride ? `${d.groom} и ${d.bride}` : and(d.person) || d.groom || d.bride || d.hosts;
const pageInviteTo: Record<Occasion, string> = {
  nikoh: "Приглашаем на свадьбу",
  sunnat: "Приглашаем на суннат-той",
  nahorgi: "Приглашаем на утренний плов",
  yubiley: "Приглашаем на юбилей",
};

export const ru = {
  photoCredits: {
    by: (author: string) => `Фото: ${author}`,
    label: "Фото:",
    many: "Фото:",
    adapted: "Размер и вид фото адаптированы.",
  },
  months,
  weekdays,
  weekdaysShort,
  occasionTitles,
  eventTitles,
  opening: {
    tapToOpen: "Нажмите, чтобы открыть",
    tapScreen: "Нажмите на экран, чтобы открыть",
    openInvitation: "Откройте приглашение",
    invitation: "Приглашение",
    welcome: "Добро пожаловать",
  },
  cover: { inviteEyebrow: "Приглашаем на свадьбу", and: "&", andWord: "и", scrollHint: "Листайте вниз" },
  invite(d: InvitationData): { greeting: string; body: string } {
    if (d.customText) return { greeting: "", body: d.customTexts?.ru || d.customText };
    const list = inviteTexts(d);
    return list.find((x) => x.id === d.textId) ?? list[0];
  },
  inviteOptions: (d: InvitationData) => inviteTexts(d),
  causeLine: (d: InvitationData) => `По случаю ${causeForms[d.cause ?? "nikoh"].gen} ${whose(d)}`,
  jubileeLine: (d: InvitationData) => `${d.age}-летний юбилей ${whose(d)}`,
  ageLabel: "лет",
  relationWord: (r: Relation, person?: string) => (/ ва /.test(person ?? "") ? relNomPlural : relNom)[r],
  countdown: {
    title: {
      nikoh: "До свадьбы осталось",
      sunnat: "До тоя осталось",
      nahorgi: "До утреннего плова",
      yubiley: "До юбилея осталось",
    } satisfies Record<Occasion, string>,
    days: "дн.",
    hours: "час.",
    minutes: "мин.",
    seconds: "сек.",
    today: "Счастливый день настал!",
  },
  date: {
    title: {
      nikoh: "Дата свадьбы",
      sunnat: "Дата тоя",
      nahorgi: "Дата и время",
      yubiley: "Дата юбилея",
    } satisfies Record<Occasion, string>,
    time: "Время",
    year: "г.",
    long: (day: number, monthIndex: number, year: number) => `${day} ${months[monthIndex]} ${year} г.`,
    short: (day: number, monthIndex: number, year: number) =>
      `${String(day).padStart(2, "0")}.${String(monthIndex + 1).padStart(2, "0")}.${year}`,
    dayAndTime: (weekdayIndex: number, time: string) => `${weekdays[weekdayIndex]}, в ${time}`,
    monthYear: (monthIndex: number, year: number) => `${cap(monthsNom[monthIndex])} ${year}`,
    clock: (time: string) => time.replace(/^0(\d)/, "$1"),
    morningAt: (time: string) => `утром в ${time.replace(/^0(\d)/, "$1")}`,
    at: (time: string) => `в ${time}`,
  },
  venue: { title: "Место проведения", programTitle: "Программа", openMap: "Открыть на карте" },
  heart: {
    title: "От всего сердца",
    text: {
      nikoh:
        "Ваше присутствие и добрые пожелания — самый ценный подарок для нашей семьи. Будем счастливы, если в этот светлый день Вы будете рядом.",
      sunnat: "В этот светлый день Ваши молитвы и приход — самый дорогой подарок для нас. Разделите с нами радость!",
      nahorgi: "Наш утренний дастархан станет полным с Вашим приходом. Ваши молитвы — самый дорогой подарок для нас.",
      yubiley:
        "Ваше присутствие в этот благословенный день — большое счастье и честь для нас. С нетерпением ждём Ваших молитв и добрых пожеланий.",
    } satisfies Record<Occasion, string>,
  },
  sides: { groom: "Со стороны жениха", bride: "Со стороны невесты" },
  blessing: {
    title: "Благословение",
    text: {
      nikoh: "Пусть счастье молодых будет полным, жизнь — долгой, а дом — благодатным. Аминь!",
      sunnat: "Пусть наш сын растёт здоровым, живёт долго и будет счастлив. Аминь!",
      nahorgi: "Пусть наш дастархан всегда будет щедрым, дом — благодатным, а встречи — частыми. Аминь!",
      yubiley: "Пусть жизнь нашего дорогого человека будет долгой, здоровье — крепким, а счастье — полным. Аминь!",
    } satisfies Record<Occasion, string>,
  },
  hosts: {
    thanks: "Будем рады Вашему приходу!",
    respectDeep: "С уважением и почтением",
    respect: "С уважением",
    waiting: "Ждём Вас!",
    closing: "С нетерпением ждём Вас!",
  },
  music: { play: "Включить музыку", pause: "Выключить музыку" },
  brand: {
    badge: "InviteIZI",
    badgeLabel: "Открыть бот InviteIZI",
    footer: "Создано в InviteIZI",
    footerLink: "Создайте своё приглашение",
  },
  rsvp: {
    title: "Вы придёте?",
    name: "Ваше имя",
    guests: "Сколько человек придёт?",
    less: "Меньше",
    more: "Больше",
    yes: "Приду",
    no: "Не смогу",
    thanksYes: "Спасибо! Ждём Вас.",
    thanksNo: "Спасибо, ответ передан.",
    change: "Изменить ответ",
    preview: "Это пример — ответы сохраняются после оплаты",
    previewThanks: "Спасибо!",
    error: "Не отправлено. Проверьте интернет и попробуйте ещё раз.",
    limited: "Слишком много ответов. Попробуйте чуть позже.",
  },
  natural: {
    date: "Дата",
    place: "Место",
    program: "Программа",
    come: "Приходите",
    wait: "Ждём Вас",
    open: "Откройте",
    family: "Семья",
    and: "и",
    morning: "утром",
    sides: "Хозяева торжества",
    playHint: "Открыть приглашение",
    calendarAria: (date: string) => `День торжества: ${date}`,
  },
  /** Подпись «кем приходится» (кнопки, проверка данных) */
  relationLabel: {
    farzand: "Наш ребёнок",
    ogil: "Наш сын",
    qiz: "Наша дочь",
    nabira: "Наш внук",
    uka: "Наш младший брат",
    ona: "Наша мама",
    ota: "Наш папа",
    ozimiz: "Мы сами",
  } satisfies Record<Relation, string>,
  /** VIP-приглашения */
  vip: {
    privateLetter: "Особое приглашение для Вас",
    forever: "Вместе на всю жизнь",
    openMe: "Откройте меня",
    withLove: "С любовью и уважением",
    retry: "Фото не загрузилось. Нажмите ещё раз",
    loading: "Готовим приглашение…",
    saveDate: "Самый прекрасный день в наших сердцах",
    ourDay: "Один день — память на всю жизнь",
    together: "Место нашей встречи",
    scroll: "Листайте нашу историю",
    venueMood: "Фото для настроения · не настоящий зал",
  },
  b3: {
    swipeDown: "Листайте вниз",
    swipeSide: "Листайте в сторону",
    tap: "Откройте приглашение",
    album: "На память",
    prev: "Предыдущая страница",
    next: "Следующая страница",
  },
  floral: { wait: "Ждём Вас", tap: "Откройте приглашение", morning: "утром", letter: "Письмо" },
  patno: {
    date: "Дата свадьбы",
    program: "Программа",
    place: "Место",
    wait: "С нетерпением ждём Вас",
    weekAria: (date: string) => `Неделя свадьбы, день свадьбы — ${date}`,
  },
  watermark: "ПРИМЕР",
  watermarkNote: "Надпись исчезнет после оплаты",
  design: {
    "anor-bogi": { anorWish: "Пусть молодые будут дружны, как зёрна граната, а их дом — полон, как спелый гранат!" },
    "bodom-guli": { bodomWish: "Пусть жизнь молодых всегда цветёт, как миндаль весной!" },
  },
  invitationPage: {
    names: pageNames,
    inviteTo: pageInviteTo,
    metaTitle: (d: InvitationData) => `${pageNames(d)} — ${occasionTitles[d.occasion]}`,
    metaDescription: (d: InvitationData, dateText?: string) =>
      [pageInviteTo[d.occasion], dateText].filter(Boolean).join(" · "),
    loading: "Открываем приглашение…",
    expired: {
      title: "Срок приглашения истёк",
      body: "Торжество уже прошло. Большое спасибо за Ваш приход и добрые пожелания!",
      brand: "InviteIZI — онлайн-приглашения",
    },
    namunaExpired: {
      title: "Срок образца истёк",
      body: "Это неоплаченный образец. Когда владелец оплатит его в боте, по этой ссылке откроется полное приглашение.",
    },
    notFound: {
      title: "Приглашение не найдено",
      body: "Проверьте ссылку или попросите пригласившего прислать её ещё раз.",
    },
  },
  footer: { madeWith: "Создано в InviteIZI" },
  /** Первый экран без открытия: кнопка музыки */
  onePage: { answer: "Ответить", close: "Закрыть" },
  statusPoster: {
    title: {
      nikoh: "Приглашаем на нашу свадьбу",
      sunnat: "Приглашаем на суннат-той",
      nahorgi: "Приглашаем на утренний плов",
      yubiley: "Приглашаем на юбилей",
    },
    scan: "Отсканируйте, чтобы открыть приглашение",
  },
};

/** Свои заголовки дизайнов (ключи — как в headings из uz-cyrl.ts) */
export const ruHeadings: Record<
  string,
  Partial<
    Record<"countdown" | "date" | "program" | "venue" | "heart" | "blessing" | "tap" | "thanks" | "waiting", string>
  >
> = {
  "marvarid-satr": { program: "Дорогая встреча", waiting: "Разделите нашу радость!" },
  "gulbog-sahifa": {
    date: "Прекрасная дата",
    countdown: "До счастливых минут",
    program: "Программа счастливого дня",
    waiting: "Добро пожаловать в наши цветущие дни!",
  },
  "suzani-yol": {
    date: "Светлый день",
    countdown: "До нашей свадьбы",
    program: "Порядок торжества",
    thanks: "Будем рады Вашему приходу!",
  },
  "bugdoy-boshoq": { program: "Утренний дастархан", waiting: "Добро пожаловать в наш дом!" },
  "lola-ehtirom": {
    date: "Почётная дата",
    countdown: "До встречи",
    program: "Программа праздника",
    waiting: "Ваш приход дорог нам!",
  },
  "oq-chinni": { program: "Утренняя встреча", waiting: "Добро пожаловать к нашему дастархану!" },
  doppicha: { program: "Наш радостный день", waiting: "Добро пожаловать на наш той!" },
  "sayram-hovli": {
    date: "День тоя",
    countdown: "До радостного дня",
    program: "Порядок дня",
    blessing: "Добрые молитвы",
    thanks: "Разделите нашу радость!",
  },
  zarvaraq: { program: "Благословенная встреча", waiting: "Ваш приход дорог нам!" },
  "umr-daraxti": {
    date: "Дорогая дата",
    countdown: "До благословенной даты",
    program: "Программа встречи",
    blessing: "Любовь и молитва",
    waiting: "С нетерпением ждём Вас!",
  },
  "oltin-monogramma": {},
  "oq-ot": { countdown: "До светлого дня", date: "Светлая дата", venue: "Место тоя", tap: "Откройте занавес" },
  "tonggi-qozon": {
    countdown: "До утреннего дастархана",
    date: "Дата плова",
    venue: "Место плова",
    tap: "Нажмите, чтобы открыть приглашение",
  },
  "pion-guldasta": {
    countdown: "До праздника",
    date: "День юбилея",
    venue: "Место торжества",
    tap: "Откройте конверт",
  },
  "tandir-nuri": {
    countdown: "До утреннего плова",
    date: "День утреннего плова",
    program: "Порядок",
    venue: "Место дастархана",
    blessing: "Молитва",
    tap: "Откройте приглашение",
  },
  "ganch-peshtoq": {
    countdown: "До счастливого дня",
    date: "День никаха",
    program: "Порядок торжества",
    heart: "Слово от сердца",
    tap: "Нажмите легко, чтобы открыть",
  },
  "ipak-romol": {
    countdown: "До светлого часа",
    program: "Программа",
    blessing: "Доброе пожелание",
    thanks: "С нетерпением ждём Вашего прихода!",
  },
  "anor-bogi": {
    countdown: "Свадьба уже близко",
    date: "Счастливая дата",
    program: "Дни торжества",
    blessing: "Наше пожелание",
    tap: "Коснитесь, чтобы открыть",
    waiting: "Ждём Вас!",
  },
  "oltin-ot": {
    countdown: "До тоя нашего принца",
    program: "Порядок торжества",
    heart: "Слово от души",
    blessing: "Молитва",
    tap: "Откройте шкатулку",
    thanks: "Ваш приход — честь для нас!",
  },
};
