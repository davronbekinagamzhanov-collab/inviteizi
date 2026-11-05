/**
 * Казахский (кирилл) — ЖДЁТ ПРОВЕРКИ НОСИТЕЛЕМ.
 * Включается только флагом KAZAKH_ENABLED=true. Пока флаг выключен, эти тексты нигде не показываются.
 * Здесь: постер партнёра (v2, часть 6) и тексты приглашения (v2, часть 9).
 */
import type { PosterText } from "@/lib/poster";
import type { EventKind, InvitationData, Occasion, Relation } from "@/lib/types";

export const KK_REVIEW_PENDING = true;

/** Постер A4 партнёра — третий вариант рядом с uz и ru */
export const posterKk: PosterText = {
  title: "Онлайн шақыру — 5 минутта",
  sub: "Музыка · карта · қонақтар жауабы",
  scan: "QR-ды сканерлеңіз",
  pricePre: "",
  pricePost: " бастап",
  sample: "Үлгі",
};


// ── Пригласительное на казахском (v2, часть 9). Ключи — как в texts/uz-cyrl.ts ──

const months = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"] as const;
const weekdays = ["Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма", "Сенбі", "Жексенбі"] as const;
const weekdaysShort = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жс"] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const BACK = /[аоұыяёуэ]/;
const FRONT = /[әөүіеиюһ]/;
/** Ілік септігі по гармонии: «Мадина» → «Мадинаның», «Азиз» → «Азиздің», «Жасурбек» → «Жасурбектің» */
export function kkGen(word: string) {
  const w = word.trim();
  const lower = w.toLowerCase();
  let front = false;
  for (const ch of [...lower].reverse()) {
    if (FRONT.test(ch)) {
      front = true;
      break;
    }
    if (BACK.test(ch)) break;
  }
  const last = lower.at(-1) ?? "";
  const head = /[аәеиоөұүыіэюяуёрй]/.test(last) ? "н" : /[лмнңзж]/.test(last) ? "д" : "т";
  return `${w}${head}${front ? "ің" : "ың"}`;
}

const rel: Record<Relation, string> = { farzand: "баламыз", ogil: "ұлымыз", qiz: "қызымыз", nabira: "немереміз", uka: "ініміз", ona: "анамыз", ota: "әкеміз", ozimiz: "" };
const relPlural: Record<Relation, string> = {
  farzand: "балаларымыз",
  ogil: "ұлдарымыз",
  qiz: "қыздарымыз",
  nabira: "немерелеріміз",
  uka: "інілеріміз",
  ona: "аналарымыз",
  ota: "әкелеріміз",
  ozimiz: "",
};
const and = (s?: string) => (s ?? "").replace(/ ва /g, " және ");
const many = (d: InvitationData) => / ва /.test(d.person ?? "");

/** «немереміз Мұхаммедәлінің» */
function whose(d: InvitationData) {
  const r = (many(d) ? relPlural : rel)[d.relation ?? "farzand"];
  const name = kkGen(and(d.person));
  return r ? `${r} ${name}` : name;
}

const occasionTitles: Record<Occasion, string> = { nikoh: "Үйлену тойы", sunnat: "Сүндет той", nahorgi: "Таңғы ас", yubiley: "Мерейтой" };
/** Повод таңғы ас: «үйлену тойы» → «үйлену тойына орай» */
const cause: Record<Exclude<Occasion, "nahorgi">, string> = { nikoh: "үйлену тойы", sunnat: "сүндет тойы", yubiley: "мерейтойы" };
const eventTitles: Record<EventKind, string> = {
  nahorgi: "Таңғы ас",
  nikohMarosim: "Неке қию",
  nikohBazm: "Үйлену тойы кеші",
  kelinSalom: "Келін сәлем",
  sunnatBazm: "Сүндет той кеші",
  yubileyBazm: "Мерейтой кеші",
};

type InviteText = { id: string; greeting: string; body: string };

function inviteTexts(d: InvitationData): InviteText[] {
  const firstIsNahorgi = d.events[0]?.kind === "nahorgi";
  switch (d.occasion) {
    case "nikoh": {
      const couple = `${d.groom} және ${kkGen(d.bride ?? "")}`;
      const own = d.relation === "ozimiz";
      const kin = own ? "" : `${relPlural[d.relation ?? "farzand"]} `;
      return [
        { id: "classic", greeting: "Құрметті қонақ!", body: `Сізді ${kin}${couple} үйлену тойына арналған салтанатты кешімізге шақырамыз.` },
        { id: "royal", greeting: "Аяулы да қадірлі қонақтар!", body: `Өміріміздің ең қуанышты күнінде — ${kin}${couple} үйлену тойына Сізді отбасыңызбен шақырамыз.` },
        { id: "short", greeting: "Құрметті қонақтар!", body: own ? "Үйлену тойымызға Сізді отбасыңызбен шақырамыз." : `${cap(kkGen(relPlural[d.relation ?? "farzand"]))} үйлену тойына Сізді отбасыңызбен шақырамыз.` },
        { id: "warm", greeting: "Аяулы қонақтар!", body: `Екі жүрек қосылатын осы құтты күнде ${couple} той дастарханының төрінде Сізді көруге бақытты боламыз.` },
        { id: "dua", greeting: "Ассалаумағалейкум, аяулы қонақ!", body: `Алланың рақымымен ${kin}${couple} үйлену тойын өткізгелі отырмыз. Жастарға ақ батаңызды беру үшін тойымызға келуіңізді сұраймыз.` },
        { id: "modern", greeting: "Қадірлі достар мен жақындарымыз!", body: `${couple} өміріндегі ең әдемі күнді — үйлену тойын Сізбен бірге тойлағымыз келеді. Сізді асыға күтеміз!` },
        {
          id: "parents",
          greeting: "Құрметті туыстар мен достар!",
          body: own
            ? "Ата-аналарымыздың батасымен үйлену тойымызды өткізгелі отырмыз. Осы қуанышты күні Сізді де қасымыздан көргіміз келеді."
            : `Біз, ата-аналар, ${kin}${couple} үйлену тойына орай қуанышымызды бөлісуге шақырамыз.`,
        },
        { id: "young", greeting: "Аяулы қонақтар!", body: `Біз — ${d.groom} және ${d.bride} — өмірімізді біріктіруге бел будық. Осы құтты күні қасымызда болуыңызды шын жүректен қалаймыз.` },
      ];
    }
    case "sunnat": {
      const w = whose(d);
      return [
        { id: "classic", greeting: "Аяулы қонағымыз!", body: firstIsNahorgi ? `Сізді ${w} сүндет тойына орай берілетін таңғы асқа шақырамыз.` : `Сізді ${w} сүндет тойына шақырамыз.` },
        { id: "warm", greeting: "Құрметті қонақтар!", body: `${cap(w)} сүндет тойы — отбасымыздың ең құтты күндерінің бірі. Осы күнді Сізбен бірге тойлағымыз келеді.` },
        { id: "royal", greeting: "Аяулы да қадірлі қонақтар!", body: `Шаңырағымыздың ең қуанышты күнінде — ${w} сүндет тойында Сізді отбасыңызбен көруге қуаныштымыз.` },
        { id: "short", greeting: "Құрметті қонақ!", body: `${cap(w)} сүндет тойына қош келдіңіз!` },
        { id: "dua", greeting: "Ассалаумағалейкум!", body: `Алла жазып, ${w} сүндет тойын өткізгелі отырмыз. Батаңыз бен тілегіңізді күтеміз.` },
        { id: "modern", greeting: "Қадірлі жақындарымыз!", body: `${cap(w)} өміріндегі алғашқы үлкен мереке — сүндет той! Осы қуанышты күнді бірге тойлайық.` },
        { id: "family", greeting: "Құрметті туыстар мен достар!", body: `Бүкіл отбасымыздың атынан ${w} сүндет тойына Сізді отбасыңызбен шақырамыз.` },
        { id: "traditional", greeting: "Аяулы қонағымыз!", body: `${cap(w)} сүндет тойына орай жайылатын дастарханымызға келуіңізді сұраймыз.` },
      ];
    }
    case "nahorgi": {
      const w = whose(d);
      const c = cause[d.cause ?? "nikoh"];
      return [
        { id: "classic", greeting: "Құрметті қонақ!", body: `Сізді ${w} ${c}на орай берілетін таңғы асқа шақырамыз.` },
        { id: "morning", greeting: "Аяулы да қадірлі қонақтар!", body: `${cap(w)} ${c}на орай таңғы ас дастарханымызға Сізді шақырамыз.` },
        { id: "short", greeting: "Құрметті қонақ!", body: `${cap(w)} ${c}на орай таңғы асқа қош келдіңіз!` },
        { id: "dua", greeting: "Ассалаумағалейкум!", body: `${cap(w)} ${c} алдында таңғы ас дастарханын жайып, батаңызды алғымыз келеді. Сізді асыға күтеміз.` },
        { id: "royal", greeting: "Аяулы да қадірлі қонақтар!", body: `Шаңырағымыздың қуанышы — ${w} ${c}на орай берілетін таңғы асқа Сізді отбасыңызбен шақырамыз.` },
        { id: "warm", greeting: "Қадірлі көршілер мен туыстар!", body: `Таңертең бір кесе шай мен палау басында ${w} ${c}н бірге атап өтейік. Сізді күтеміз!` },
        { id: "family", greeting: "Құрметті қонақтар!", body: `Отбасымыздың атынан ${w} ${c}на орай таңғы асқа Сізді шақырамыз. Келуіңіз — біз үшін мәртебе.` },
        { id: "traditional", greeting: "Аяулы қонағымыз!", body: `Таң ертең ${w} ${c} құрметіне палау басамыз. Дастарханымызға қош келіңіз!` },
      ];
    }
    case "yubiley": {
      const w = whose(d);
      const age = `${d.age ?? ""} жас`;
      return [
        { id: "classic", greeting: "Қадірлі қонақтар!", body: `${cap(w)} ${d.age ?? ""} жасқа толу мерейтойына орай өтетін салтанатты кешке Сізді шақырамыз.` },
        { id: "royal", greeting: "Аяулы да қадірлі қонақтар!", body: `${cap(w)} ${age} мерейтойында Сізді отбасыңызбен көруге бақыттымыз.` },
        { id: "short", greeting: "Құрметті қонақ!", body: `${cap(w)} ${age} мерейтойына қош келдіңіз!` },
        { id: "dua", greeting: "Ассалаумағалейкум!", body: `Алла берген ұзақ ғұмырдың берекесімен ${w} ${age} мерейтойын тойлағалы отырмыз. Тілектеріңізбен бұл күнді одан әрі нұрлы етіңіз.` },
        { id: "warm", greeting: "Қадірлі жақындарымыз!", body: `${cap(w)} ${age} мерейтойы — бүкіл отбасымыз үшін құтты күн. Осы күнді Сізбен бірге өткізгіміз келеді.` },
        { id: "modern", greeting: "Аяулы достар!", body: `${cap(w)} ${age} мерекесін бірге тойлайық! Сізді асыға күтеміз.` },
        { id: "children", greeting: "Құрметті қонақтар!", body: `Біз — балалары мен немерелері — ${w} ${age} мерейтойы кешіне Сізді шақырамыз.` },
        { id: "traditional", greeting: "Аяулы қонағымыз!", body: `${cap(w)} ${d.age ?? ""} жасқа толуына орай жайылатын дастарханымызға келуіңізді сұраймыз.` },
      ];
    }
  }
}

const pageNames = (d: InvitationData) => (d.groom && d.bride ? `${d.groom} және ${d.bride}` : and(d.person) || d.groom || d.bride || d.hosts);
const pageInviteTo: Record<Occasion, string> = { nikoh: "Тойға шақырамыз", sunnat: "Сүндет тойға шақырамыз", nahorgi: "Таңғы асқа шақырамыз", yubiley: "Мерейтойға шақырамыз" };

export const kk = {
  photoCredits: { by: (author: string) => `Фото: ${author}`, label: "Фото:", many: "Фотолар:", adapted: "Фото өлшемі мен көрінісі бейімделген." },
  months,
  weekdays,
  weekdaysShort,
  occasionTitles,
  eventTitles,
  opening: { tapToOpen: "Ашу үшін басыңыз", invitation: "Шақыру", welcome: "Қош келдіңіз" },
  cover: { inviteEyebrow: "Тойға шақырамыз", and: "&", andWord: "және", scrollHint: "Төмен сырғытыңыз" },
  invite(d: InvitationData): { greeting: string; body: string } {
    if (d.customText) return { greeting: "", body: d.customTexts?.kk || d.customText };
    const list = inviteTexts(d);
    return list.find((x) => x.id === d.textId) ?? list[0];
  },
  inviteOptions: (d: InvitationData) => inviteTexts(d),
  causeLine: (d: InvitationData) => `${cap(whose(d))} ${cause[d.cause ?? "nikoh"]}на орай`,
  jubileeLine: (d: InvitationData) => `${cap(whose(d))} ${d.age} жас мерейтойы`,
  ageLabel: "жас",
  relationWord: (r: Relation, person?: string) => cap((/ ва /.test(person ?? "") ? relPlural : rel)[r]),
  countdown: {
    title: { nikoh: "Тойға дейін", sunnat: "Тойға дейін", nahorgi: "Таңғы асқа дейін", yubiley: "Мерейтойға дейін" } satisfies Record<Occasion, string>,
    days: "күн",
    hours: "сағат",
    minutes: "минут",
    seconds: "секунд",
    today: "Құтты күн келді!",
  },
  date: {
    title: { nikoh: "Той күні", sunnat: "Той күні", nahorgi: "Күні мен уақыты", yubiley: "Мерейтой күні" } satisfies Record<Occasion, string>,
    time: "Уақыты",
    year: "жыл",
    long: (day: number, monthIndex: number, year: number) => `${day} ${months[monthIndex]} ${year} ж.`,
    short: (day: number, monthIndex: number, year: number) => `${String(day).padStart(2, "0")}.${String(monthIndex + 1).padStart(2, "0")}.${year}`,
    dayAndTime: (weekdayIndex: number, time: string) => `${weekdays[weekdayIndex]}, сағат ${time}`,
    monthYear: (monthIndex: number, year: number) => `${cap(months[monthIndex])} ${year}`,
    clock: (time: string) => time.replace(/^0(\d)/, "$1"),
    morningAt: (time: string) => `таңғы сағат ${time.replace(/^0(\d)/, "$1")}`,
    at: (time: string) => `сағат ${time}`,
  },
  venue: { title: "Өтетін орны", programTitle: "Той бағдарламасы", openMap: "Картадан ашу" },
  heart: {
    title: "Шын жүректен",
    text: {
      nikoh: "Сіздің қатысуыңыз бен ізгі тілектеріңіз — отбасымыз үшін ең қымбат сыйлық. Осы құтты күні қасымызда болсаңыз, бақытты боламыз.",
      sunnat: "Осы құтты күні батаңыз бен келуіңіз біз үшін ең қымбат сыйлық болады. Қуанышымызды бөлісіңіз!",
      nahorgi: "Таңғы дастарханымыз Сіздің келуіңізбен толық болады. Батаңыз — біз үшін ең қымбат сыйлық.",
      yubiley: "Осы мерейлі күні қасымызда болуыңыз — біз үшін үлкен бақыт пен құрмет. Батаңыз бен ізгі тілектеріңізді асыға күтеміз.",
    } satisfies Record<Occasion, string>,
  },
  sides: { groom: "Күйеу жақ", bride: "Қалыңдық жақ" },
  blessing: {
    title: "Ақ бата",
    text: {
      nikoh: "Жастарымыздың бақыты баянды, ғұмыры ұзақ, шаңырағы берекелі болсын. Әумин!",
      sunnat: "Ұлымыз аман-есен өсіп, ғұмыры ұзақ, бақыты баянды болсын. Әумин!",
      nahorgi: "Дастарханымыз әрдайым мол, шаңырағымыз берекелі, кездесулеріміз ұзақ болсын. Әумин!",
      yubiley: "Аяулы жанымыздың ғұмыры ұзақ, денсаулығы мықты, бақыты баянды болсын. Әумин!",
    } satisfies Record<Occasion, string>,
  },
  hosts: { thanks: "Келуіңізге қуаныштымыз!", respectDeep: "Құрметпен және ізетпен", respect: "Құрметпен", waiting: "Күтеміз!", closing: "Сізді асыға күтеміз!" },
  music: { play: "Музыканы қосу", pause: "Музыканы өшіру" },
  brand: { badge: "InviteIZI", badgeLabel: "InviteIZI ботын ашу", footer: "InviteIZI-де жасалды", footerLink: "Өз шақыруыңызды жасаңыз" },
  rsvp: {
    title: "Келесіз бе?",
    name: "Атыңыз",
    guests: "Неше адам келеді?",
    less: "Азайту",
    more: "Көбейту",
    yes: "Келемін",
    no: "Келе алмаймын",
    thanksYes: "Рақмет! Сізді күтеміз.",
    thanksNo: "Рақмет, жауабыңыз жеткізілді.",
    change: "Жауапты өзгерту",
    preview: "Бұл үлгі — жауаптар төлемнен кейін сақталады",
    previewThanks: "Рақмет!",
    error: "Жіберілмеді. Интернетті тексеріп, қайта көріңіз.",
    limited: "Жауаптар тым көп. Сәл кейін көріңіз.",
  },
  natural: {
    date: "Күні",
    place: "Мекенжай",
    program: "Бағдарлама",
    come: "Келіңіз",
    wait: "Күтеміз",
    open: "Ашыңыз",
    family: "Отбасы",
    and: "және",
    morning: "таңертең",
    sides: "Той иелері",
    playHint: "Шақыруды ашу",
    calendarAria: (date: string) => `Той күні: ${date}`,
  },
  b3: { swipeDown: "Төмен сырғытыңыз", swipeSide: "Парақты сырғытыңыз", tap: "Шақыруды ашыңыз", album: "Естелікке", prev: "Алдыңғы бет", next: "Келесі бет" },
  floral: { wait: "Сізді күтеміз", tap: "Шақыруды ашыңыз", morning: "таңертең", letter: "Хат" },
  patno: { date: "Той күні", program: "Той бағдарламасы", place: "Мекенжай", wait: "Сізді асыға күтеміз", weekAria: (date: string) => `Той аптасы, той күні — ${date}` },
  watermark: "ҮЛГІ",
  watermarkNote: "Төлемнен кейін бұл жазу алынады",
  design: {
    "anor-bogi": { anorWish: "Жастарымыз анардың дәніндей тату, шаңырағы анардай толы болсын!" },
    "bodom-guli": { bodomWish: "Жастарымыздың өмірі көктемдегі бадам гүліндей әрдайым гүлдене берсін!" },
  },
  invitationPage: {
    names: pageNames,
    inviteTo: pageInviteTo,
    metaTitle: (d: InvitationData) => `${pageNames(d)} — ${occasionTitles[d.occasion]}`,
    metaDescription: (d: InvitationData, dateText?: string) => [pageInviteTo[d.occasion], dateText].filter(Boolean).join(" · "),
    loading: "Шақыру ашылуда…",
    expired: { title: "Шақырудың мерзімі бітті", body: "Той өтіп кетті. Келгеніңіз бен ізгі тілектеріңіз үшін үлкен рақмет!", brand: "InviteIZI — онлайн шақырулар" },
    notFound: { title: "Шақыру табылмады", body: "Сілтемені тексеріңіз немесе шақырған адамнан қайта жіберуін сұраңыз." },
  },
  footer: { madeWith: "InviteIZI арқылы жасалды" },
  musicHint: "Музыканы қосу",
};

export const kkHeadings: Record<string, Partial<Record<"countdown" | "date" | "program" | "venue" | "heart" | "blessing" | "tap" | "thanks" | "waiting", string>>> = {
  "marvarid-satr": { program: "Аяулы кездесу", waiting: "Қуанышымызды бөлісіңіз!" },
  "gulbog-sahifa": { date: "Әдемі күн", countdown: "Бақытты сәтке дейін", program: "Бақытты күн бағдарламасы", waiting: "Гүлдей күндерімізге қош келіңіз!" },
  "suzani-yol": { date: "Құтты күн", countdown: "Тойымызға дейін", program: "Той реті", thanks: "Келуіңізге қуаныштымыз!" },
  "bugdoy-boshoq": { program: "Таңғы дастархан", waiting: "Шаңырағымызға қош келіңіз!" },
  "lola-ehtirom": { date: "Қадірлі күн", countdown: "Кездесуге дейін", program: "Мереке бағдарламасы", waiting: "Келуіңіз біз үшін қымбат!" },
  "oq-chinni": { program: "Таңғы кездесу", waiting: "Дастарханымызға қош келіңіз!" },
  doppicha: { program: "Қуанышты күніміз", waiting: "Тойымызға қош келіңіз!" },
  "sayram-hovli": { date: "Той күні", countdown: "Қуанышты күнге дейін", program: "Той күнінің реті", blessing: "Ізгі тілектер", thanks: "Қуанышымызды бөлісіңіз!" },
  zarvaraq: { program: "Мерейлі кездесу", waiting: "Келуіңіз біз үшін қымбат!" },
  "umr-daraxti": { date: "Қымбат күн", countdown: "Мерейлі күнге дейін", program: "Кездесу бағдарламасы", blessing: "Мейір мен бата", waiting: "Сізді асыға күтеміз!" },
  "oltin-monogramma": {},
  "oq-ot": { countdown: "Құтты күнге дейін", date: "Құтты күн", venue: "Той мекенжайы", tap: "Пердені ашыңыз" },
  "tonggi-qozon": { countdown: "Таңғы дастарханға дейін", date: "Ас күні", venue: "Ас мекенжайы", tap: "Шақыруды ашу үшін басыңыз" },
  "pion-guldasta": { countdown: "Мерекеге дейін", date: "Мерейтой күні", venue: "Кеш мекенжайы", tap: "Конвертті ашыңыз" },
  "tandir-nuri": { countdown: "Таңғы асқа дейін", date: "Таңғы ас күні", program: "Шара реті", venue: "Дастархан мекенжайы", blessing: "Бата", tap: "Шақыруды ашыңыз" },
  "ganch-peshtoq": { countdown: "Бақытты күнге дейін", date: "Неке күні", program: "Той реті", heart: "Жүректен сөз", tap: "Ашу үшін жеңіл басыңыз" },
  "ipak-romol": { countdown: "Құтты сәтке дейін", program: "Шаралар", blessing: "Ізгі тілек", thanks: "Келуіңізді асыға күтеміз!" },
  "anor-bogi": { countdown: "Той жақын", date: "Бақытты күн", program: "Той күндері", blessing: "Ниетіміз", tap: "Ашу үшін түртіңіз", waiting: "Сізді күтеміз!" },
  "oltin-ot": { countdown: "Шаһзадамыздың тойына дейін", program: "Шаралар реті", heart: "Жүректен сөз", blessing: "Бата", tap: "Қобдишаны ашыңыз", thanks: "Келуіңіз — біз үшін мәртебе!" },
};
