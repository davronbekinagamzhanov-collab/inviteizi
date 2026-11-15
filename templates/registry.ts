import type { ComponentType } from "react";
import type { TemplateProps } from "./themes/types";
import type { InvitationData, Occasion } from "@/lib/types";
import { pilotSamples } from "@/lib/pilot-samples";
import { longSamples, sampleFor } from "@/lib/samples";

export type { TemplateProps };
export const FORMATS = ["animated", "scroll", "simple"] as const;
export type Format = typeof FORMATS[number];

/** Цена формата, ₸ (музыка входит в цену) */
export const PRICES: Record<Format, number> = { animated: 8_000, scroll: 6_000, simple: 5_000 };

/** Внешний вид дизайна (распределены по обложкам): для панели владельца */
export const DESIGN_STYLES = ["milk", "gold", "floral", "national", "dark", "photo"] as const;
export type DesignStyle = (typeof DESIGN_STYLES)[number];

type Loader = () => Promise<{ default: ComponentType<TemplateProps> }>;

/**
 * Один ДИЗАЙН = своя картина/украшение, раскладка, шрифты, открытие и анимация.
 * Номера 1–60 — из каталога «План проекта/10_…», 61+ — новые дизайны (план 2026-10-23).
 */
export type Design = {
  id: string; // адрес демо: /demo/oq-ot
  number: number;
  occasion: Occasion;
  format: Format;
  style: DesignStyle;
  /** В дизайне есть фото (Pixabay), а не только орнаменты кодом */
  withPhoto: boolean;
  /** Дизайн умеет показывать фото клиента: бот спрашивает «расмларингизни қўшасизми?» */
  clientPhotos?: boolean;
  /** Тёмный фон (бархат) — в каталоге таких немного */
  dark?: boolean;
  /** Пример данных для демо */
  sample: InvitationData;
  /** Превью для каталога бота (public/covers/<id>.webp, 1080×1920) */
  cover: string;
  /** Картина дизайна в public/ (если она подключается по наличию файла) */
  art?: string;
  // Код дизайна загружается только когда его открыли (шрифты и анимации других дизайнов не грузятся)
  load: Loader;
};

const cover = (id: string) => `/covers/${id}.webp`;
/** Миниатюра обложки 480 px для каталога (готовый WebP, scripts/make-cover-thumbs.mjs) */
export const thumbOf = (cover: string) => cover.replace("/covers/", "/covers/thumb/");

type RawDesign = Omit<Design, "style">;

/** Новый дизайн: данные демо берутся по тадбиру */
function design(
  id: string,
  number: number,
  occasion: Occasion,
  format: Format,
  withPhoto: boolean,
  load: Loader,
  extra: Partial<RawDesign> = {},
): RawDesign {
  return { id, number, occasion, format, withPhoto, sample: ["kabutar-salom", "yelpigich-ziynat", "samarqand-kitob", "qosh-uzuk", "saodat-kaliti"].includes(id) ? { ...sampleFor(id, occasion), groom: "Давронбек", bride: "Нозима" } : sampleFor(id, occasion), cover: cover(id), load, ...extra };
}

const rawDesigns: RawDesign[] = [
  // ── Пилоты ──
  {
    id: "oltin-monogramma",
    number: 1,
    occasion: "nikoh",
    format: "animated",
    withPhoto: false,
    sample: pilotSamples["oltin-monogramma"],
    cover: cover("oltin-monogramma"),
    load: () => import("./themes/oltin-monogramma/OltinMonogramma"),
  },
  {
    id: "sapfir",
    number: 23,
    occasion: "nikoh",
    format: "simple",
    withPhoto: false,
    dark: true,
    sample: pilotSamples.sapfir,
    cover: cover("sapfir"),
    load: () => import("./themes/sapfir/Sapfir"),
  },
  {
    id: "oq-ot",
    number: 31,
    occasion: "sunnat",
    format: "animated",
    withPhoto: false,
    sample: pilotSamples["oq-ot"],
    cover: cover("oq-ot"),
    art: "/art/oq-ot.png",
    load: () => import("./themes/oq-ot/OqOt"),
  },
  {
    id: "tonggi-qozon",
    number: 41,
    occasion: "nahorgi",
    format: "animated",
    withPhoto: false,
    sample: pilotSamples["tonggi-qozon"],
    cover: cover("tonggi-qozon"),
    art: "/art/tonggi-qozon.png",
    load: () => import("./themes/tonggi-qozon/TonggiQozon"),
  },
  {
    id: "pion-guldasta",
    number: 51,
    occasion: "yubiley",
    format: "animated",
    withPhoto: false,
    sample: pilotSamples["pion-guldasta"],
    cover: cover("pion-guldasta"),
    art: "/art/pion.png",
    load: () => import("./themes/pion-guldasta/PionGuldasta"),
  },

  // ── Никоҳ ──
  design("ganch-peshtoq", 61, "nikoh", "animated", false, () => import("./themes/ganch-peshtoq/Design")),
  design("zarhal-eshik", 62, "nikoh", "animated", false, () => import("./themes/zarhal-eshik/Design")),
  design("atlas-tolqin", 63, "nikoh", "animated", false, () => import("./themes/atlas-tolqin/Design")),
  design("anor-bogi", 64, "nikoh", "animated", true, () => import("./themes/anor-bogi/Design")),
  design("bodom-guli", 65, "nikoh", "animated", true, () => import("./themes/bodom-guli/Design"), {art:"/art/bodom-guli.webp"}),
  design("samarqand-kitob", 66, "nikoh", "animated", true, () => import("./themes/samarqand-kitob/Design"), {art:"/art/samarqand-kitob.webp"}),
  design("ipak-romol", 67, "nikoh", "simple", false, () => import("./themes/ipak-romol/Design")),
  design("rishton-koshin", 68, "nikoh", "simple", false, () => import("./themes/rishton-koshin/Design")),
  design("atirgul", 69, "nikoh", "simple", true, () => import("./themes/atirgul/Design"), {art:"/art/atirgul.webp"}),
  design("shohona-baxmal", 70, "nikoh", "scroll", false, () => import("./themes/shohona-baxmal/Design"), { dark: true }),

  // ── Наҳорги ош ──
  design("tandir-nuri", 71, "nahorgi", "animated", true, () => import("./themes/tandir-nuri/Design")),
  design("dasturxon", 72, "nahorgi", "animated", true, () => import("./themes/dasturxon/Design"), {art:"/art/dasturxon.webp"}),
  design("non-muhr", 73, "nahorgi", "animated", false, () => import("./themes/non-muhr/Design")),
  design("tonggi-choy", 74, "nahorgi", "scroll", true, () => import("./themes/tonggi-choy/Design"), {art:"/art/tonggi-choy.webp"}),
  design("paxta-gul", 75, "nahorgi", "scroll", false, () => import("./themes/paxta-gul/Design")),

  // ── Суннат ──
  design("oltin-ot", 76, "sunnat", "animated", false, () => import("./themes/oltin-ot/Design")),

  // Партия 4: пять пустых сочетаний тадбира/формата, без повторения готовых композиций.
  design("oq-chinni", 77, "nahorgi", "simple", false, () => import("./themes/oq-chinni/Design")),
  design("doppicha", 78, "sunnat", "simple", false, () => import("./themes/doppicha/Design")),
  design("sayram-hovli", 79, "sunnat", "scroll", false, () => import("./themes/sayram-hovli/Design")),
  design("zarvaraq", 80, "yubiley", "simple", false, () => import("./themes/zarvaraq/Design")),
  design("umr-daraxti", 81, "yubiley", "scroll", false, () => import("./themes/umr-daraxti/Design")),
  design("marvarid-satr", 82, "nikoh", "simple", true, () => import("./themes/marvarid-satr/Design"), {art:"/art/bodom-guli.webp"}),
  design("gulbog-sahifa", 83, "nikoh", "scroll", true, () => import("./themes/gulbog-sahifa/Design"), {art:"/art/gulbog-sahifa.webp"}),
  design("suzani-yol", 84, "nikoh", "scroll", false, () => import("./themes/suzani-yol/Design")),
  design("bugdoy-boshoq", 85, "nahorgi", "simple", false, () => import("./themes/bugdoy-boshoq/Design")),
  design("lola-ehtirom", 86, "yubiley", "scroll", true, () => import("./themes/lola-ehtirom/Design"), {art:"/art/lola-ehtirom.webp"}),
  design("zarhal-lavha", 87, "yubiley", "animated", false, () => import("./themes/zarhal-lavha/Design")),
  design("adras-nishon", 88, "sunnat", "simple", false, () => import("./themes/adras-nishon/Design")),
  design("mis-kafgir", 89, "nahorgi", "simple", false, () => import("./themes/mis-kafgir/Design")),
  design("rayhon-sahari", 90, "nahorgi", "scroll", false, () => import("./themes/rayhon-sahari/Design")),
  design("visol-rishta", 91, "nikoh", "animated", false, () => import("./themes/visol-rishta/Design")),
  design("uzum-hovli", 92, "nikoh", "scroll", false, () => import("./themes/uzum-hovli/Design")),
  design("sopol-navo", 93, "nikoh", "scroll", false, () => import("./themes/sopol-navo/Design")),
  design("girih-nur", 94, "nikoh", "animated", false, () => import("./themes/girih-nur/Design")),
  design("siyoh-duo", 95, "nikoh", "animated", false, () => import("./themes/siyoh-duo/Design")),
  design("kabutar-salom", 96, "nikoh", "animated", true, () => import("./themes/kabutar-salom/Design"), {art:"/art/atirgul.webp"}),
  design("shirin-tilak", 97, "nikoh", "scroll", false, () => import("./themes/shirin-tilak/Design")),
  design("minor-satr", 98, "nikoh", "scroll", false, () => import("./themes/minor-satr/Design")),
  design("kumush-taroq", 99, "nikoh", "scroll", false, () => import("./themes/kumush-taroq/Design")),
  design("shabnam-visol", 100, "nikoh", "animated", false, () => import("./themes/shabnam-visol/Design")),
  design("visol-soati", 101, "nikoh", "animated", false, () => import("./themes/visol-soati/Design")),
  design("dutor-navosi", 102, "nikoh", "scroll", true, () => import("./themes/dutor-navosi/Design"), {art:"/art/gulbog-sahifa.webp"}),
  design("tut-qogozi", 103, "nikoh", "scroll", false, () => import("./themes/tut-qogozi/Design")),
  design("qosh-uzuk", 104, "nikoh", "animated", false, () => import("./themes/qosh-uzuk/Design")),
  design("yelpigich-ziynat", 105, "nikoh", "animated", true, () => import("./themes/yelpigich-ziynat/Design"), {art:"/art/bodom-guli.webp"}),
  design("saodat-kaliti", 106, "nikoh", "animated", false, () => import("./themes/saodat-kaliti/Design")),
  // Final expansion: six new identities, all existing numbers and IDs retained.
  design("sunnat-muqova", 107, "sunnat", "animated", false, () => import("./themes/sunnat-muqova/Design")),
  design("sunnat-nasab", 108, "sunnat", "scroll", false, () => import("./themes/sunnat-nasab/Design")),
  design("sahar-ipagi", 109, "nahorgi", "animated", false, () => import("./themes/sahar-ipagi/Design")),
  design("sahar-maktubi", 110, "nahorgi", "simple", false, () => import("./themes/sahar-maktubi/Design")),
  design("umr-sahifalari", 111, "yubiley", "scroll", true, () => import("./themes/umr-sahifalari/Design"), {art:"/art/lola-ehtirom.webp"}),
  design("ehtirom-kartasi", 112, "yubiley", "simple", false, () => import("./themes/ehtirom-kartasi/Design")),
  // «Натуральные» пилоты: настоящие фото, рукописные акценты, фото клиента (02.11.2026)
  design("muhr", 113, "nikoh", "animated", false, () => import("./themes/muhr/Design"), { clientPhotos: true }),
  design("ipak", 114, "nikoh", "animated", false, () => import("./themes/ipak/Design"), { clientPhotos: true }),
  design("bog", 115, "sunnat", "scroll", false, () => import("./themes/bog/Design"), { clientPhotos: true }),
  design("tong-dasturxon", 116, "nahorgi", "scroll", false, () => import("./themes/tong-dasturxon/Design")),
  // ── «Гулли рамка»: акварельные цветы с краёв + карточка в центре, без фото (03.11.2026) ──
  design("gul-doira", 117, "nikoh", "animated", false, () => import("./themes/gul-doira/Design")),
  design("girih-barg", 118, "nikoh", "animated", false, () => import("./themes/girih-barg/Design")),
  design("muhrli-maktub", 119, "nikoh", "animated", false, () => import("./themes/muhrli-maktub/Design")),
  design("tonggi-piyola", 120, "nahorgi", "animated", false, () => import("./themes/tonggi-piyola/Design")),
  design("lola-bodom", 121, "sunnat", "animated", false, () => import("./themes/lola-bodom/Design")),
  design("bordo-guldasta", 122, "yubiley", "simple", false, () => import("./themes/bordo-guldasta/Design")),
  // Батч 3 (123–138): структуры S1–S7, docs/design/batch3.md
  design("choy-maktub", 123, "nahorgi", "simple", false, () => import("./themes/choy-maktub/Design")),
  design("oq-maktub", 127, "nikoh", "simple", false, () => import("./themes/oq-maktub/Design")),
  design("hurmat-maktub", 138, "yubiley", "simple", false, () => import("./themes/hurmat-maktub/Design")),
  design("tong-varaq", 126, "nahorgi", "scroll", false, () => import("./themes/tong-varaq/Design")),
  design("nur-varaq", 130, "nikoh", "scroll", false, () => import("./themes/nur-varaq/Design"), { clientPhotos: true }),
  design("islimi-varaq", 131, "nikoh", "scroll", false, () => import("./themes/islimi-varaq/Design")),
  design("non-albom", 124, "nahorgi", "simple", false, () => import("./themes/non-albom/Design")),
  design("ipak-albom", 128, "nikoh", "simple", false, () => import("./themes/ipak-albom/Design"), { clientPhotos: true }),
  design("xotira-albom", 132, "nikoh", "scroll", false, () => import("./themes/xotira-albom/Design"), { clientPhotos: true }),
  design("qozon-tongi", 125, "nahorgi", "animated", false, () => import("./themes/qozon-tongi/Design")),
  design("visol-hikoya", 133, "nikoh", "animated", false, () => import("./themes/visol-hikoya/Design"), { clientPhotos: true }),
  design("ganch-darvoza", 134, "sunnat", "animated", false, () => import("./themes/ganch-darvoza/Design")),
  design("doppi-kitob", 135, "sunnat", "scroll", false, () => import("./themes/doppi-kitob/Design")),
  design("umr-kitobi", 137, "yubiley", "scroll", false, () => import("./themes/umr-kitobi/Design")),
  design("suzani-medalyon", 129, "nikoh", "simple", false, () => import("./themes/suzani-medalyon/Design"), { clientPhotos: true }),
  design("lola-medalyon", 136, "sunnat", "simple", false, () => import("./themes/lola-medalyon/Design"), { clientPhotos: true }),
  // «Пятно» (v2, 05.11.2026): акварельное пятно на белой бумаге, структура templates/themes/patno
  design("suvbuyoq-tuman", 139, "nikoh", "animated", false, () => import("./themes/suvbuyoq-tuman/Design")),
  design("suvbuyoq-zumrad", 140, "nikoh", "animated", false, () => import("./themes/suvbuyoq-zumrad/Design")),
  design("suvbuyoq-upa", 141, "nikoh", "animated", false, () => import("./themes/suvbuyoq-upa/Design")),

];

const STYLE_OF: Record<DesignStyle, string[]> = {
  milk: ["suvbuyoq-tuman", "suvbuyoq-zumrad", "suvbuyoq-upa", "umr-kitobi", "tong-varaq", "hurmat-maktub", "oq-maktub", "choy-maktub", "sahar-ipagi", "sahar-maktubi", "ehtirom-kartasi","zarhal-eshik", "atlas-tolqin", "non-muhr", "marvarid-satr", "bugdoy-boshoq", "shirin-tilak", "visol-soati", "tut-qogozi"],
  gold: ["oltin-monogramma", "oltin-ot", "zarhal-lavha", "qosh-uzuk", "zarvaraq", "saodat-kaliti"],
  floral: ["bordo-guldasta", "lola-bodom", "tonggi-piyola", "muhrli-maktub", "gul-doira", "girih-barg", "umr-sahifalari","pion-guldasta", "ipak-romol", "paxta-gul", "visol-rishta", "kabutar-salom", "umr-daraxti", "rayhon-sahari", "siyoh-duo", "shabnam-visol", "uzum-hovli"],
  national: ["doppi-kitob", "ganch-darvoza", "islimi-varaq", "sunnat-muqova", "sunnat-nasab","ganch-peshtoq", "rishton-koshin", "oq-ot", "sayram-hovli", "doppicha", "adras-nishon", "suzani-yol", "sopol-navo", "girih-nur", "dutor-navosi", "minor-satr", "kumush-taroq", "mis-kafgir", "oq-chinni", "tonggi-qozon", "yelpigich-ziynat"],
  dark: ["sapfir", "shohona-baxmal"],
  photo: ["lola-medalyon", "suzani-medalyon", "visol-hikoya", "qozon-tongi", "xotira-albom", "ipak-albom", "non-albom", "nur-varaq", "muhr", "ipak", "bog", "tong-dasturxon", "tandir-nuri", "atirgul", "dasturxon", "bodom-guli", "samarqand-kitob", "tonggi-choy", "gulbog-sahifa", "lola-ehtirom", "anor-bogi"],
};

function styleOf(id: string): DesignStyle {
  const style = DESIGN_STYLES.find((s) => STYLE_OF[s].includes(id));
  if (!style) throw new Error(`Дизайну ${id} не назначен стиль`);
  return style;
}

export const designs: Design[] = rawDesigns.map((d) => ({ ...d, style: styleOf(d.id) }));

/**
 * Принятые дизайны (прошли приёмку) — только их видят клиенты в боте и на /catalog.
 * Остальные в работе: код остаётся, демо открывается по прямой ссылке, но в каталоге их нет.
 */
export const ACCEPTED = new Set([
  // 1, 23, 61, 70, 113, 114 — никоҳ
  "oltin-monogramma", "sapfir",   "muhr", "ipak",
  // 78, 115 — суннат
  "doppicha", "bog",
  // 116 — наҳорги ош
  "tong-dasturxon",
  // 51, 81, 87 — юбилей
  "pion-guldasta", "umr-daraxti", "zarhal-lavha",
  // 117–122 — «Гулли рамка» (03.11.2026): никоҳ ×3, наҳорги ош, суннат, юбилей
  "gul-doira", "girih-barg", "muhrli-maktub", "tonggi-piyola", "lola-bodom", "bordo-guldasta",
  // 123–138 — батч 3
   "choy-maktub", "oq-maktub", "hurmat-maktub", "tong-varaq", "nur-varaq", "non-albom", "ipak-albom", "xotira-albom", "qozon-tongi",  "ganch-darvoza", "doppi-kitob", "umr-kitobi", "suzani-medalyon", "lola-medalyon",
  // 139–141 — «Пятно» (v2): никоҳ, места 5–7 в каталоге
  "suvbuyoq-tuman", "suvbuyoq-zumrad", "suvbuyoq-upa",
  // Скрыты по решению владельца 03.11.2026 (код и строки в БД остаются — оплаченные ссылки работают),
  // список — HIDDEN_03_11 ниже. «anor-bogi» скрыт ещё 24.10.
]);

/** Дизайн можно купить сейчас (новый заказ или смена дизайна до оплаты) */
export function isOnSale(id: string) {
  return ACCEPTED.has(id);
}

/** Скрыты из каталога сайта и бота 03.11.2026 (номера 31, 41, 62–69, 71–77, 79, 80, 82–86, 88–112). Не удалять: заказы на них открываются */
export const HIDDEN_03_11: readonly string[] = [
  "oq-ot", "tonggi-qozon", "zarhal-eshik", "atlas-tolqin", "bodom-guli", "samarqand-kitob",
  "ipak-romol", "rishton-koshin", "atirgul", "tandir-nuri", "dasturxon", "non-muhr",
  "tonggi-choy", "paxta-gul", "oltin-ot", "oq-chinni", "sayram-hovli", "zarvaraq",
  "marvarid-satr", "gulbog-sahifa", "suzani-yol", "bugdoy-boshoq", "lola-ehtirom", "adras-nishon",
  "mis-kafgir", "rayhon-sahari", "visol-rishta", "uzum-hovli", "sopol-navo", "girih-nur",
  "siyoh-duo", "kabutar-salom", "shirin-tilak", "minor-satr", "kumush-taroq", "shabnam-visol",
  "visol-soati", "dutor-navosi", "tut-qogozi", "qosh-uzuk", "yelpigich-ziynat", "saodat-kaliti",
  "sunnat-muqova", "sunnat-nasab", "sahar-ipagi", "sahar-maktubi", "umr-sahifalari", "ehtirom-kartasi"
];

/**
 * Порядок каталога — ОДИН список на тадбир (бот, приложение, сайт /catalog).
 * Первым — сильнейший за 8 000 ₸; цены смешаны, чтобы сразу было видно недорогие (5 000 и 6 000 ₸).
 * Никоҳ: 113, 114 и сильнейший 8 000 первыми, места 5–7 — «Пятна» (139–141).
 */
export const CATALOG_ORDER: Record<Occasion, readonly string[]> = {
  nikoh: [
    "muhr", "ipak", "gul-doira", "suzani-medalyon",
    "suvbuyoq-tuman", "suvbuyoq-zumrad", "suvbuyoq-upa",
    "nur-varaq", "girih-barg", "oq-maktub", "xotira-albom", "muhrli-maktub", "ipak-albom",
     "oltin-monogramma", "sapfir",
  ],
  sunnat: ["ganch-darvoza", "bog", "lola-medalyon", "lola-bodom", "doppi-kitob", "doppicha"],
  nahorgi: ["qozon-tongi", "tong-dasturxon", "non-albom", "tonggi-piyola", "tong-varaq", "choy-maktub"],
  // 06.11: два последних подняты наверх по просьбе владельца
  yubiley: ["umr-daraxti", "bordo-guldasta", "zarhal-lavha", "umr-kitobi", "hurmat-maktub", "pion-guldasta"],
};
/** Все id по порядку (для сортировки) */
export const DISPLAY_PRIORITY: readonly string[] = Object.values(CATALOG_ORDER).flat();
export function catalogPosition(d: Pick<Design,"id"|"number">) {
  const i = DISPLAY_PRIORITY.indexOf(d.id);
  return i < 0 ? 1000 + d.number : i;
}
/** Все когда-либо принятые (каталог + скрытые 03.11): код живой, заказы на них открываются */
/** Сняты из каталога после критика батча 3 (03.11.2026): 131 «Ислими варақ». Код и строка в БД остаются */
export const HIDDEN_BATCH3: readonly string[] = ["islimi-varaq"];
export const HIDDEN_NIKOH_POLISH = ["shohona-baxmal","ganch-peshtoq","visol-hikoya"] as const;
export const everAccepted = () => designs.filter((d) => HIDDEN_NIKOH_POLISH.some(id=>id===d.id) || ACCEPTED.has(d.id) || HIDDEN_03_11.includes(d.id) || HIDDEN_BATCH3.includes(d.id));
export const activeDesigns = () => designs.filter((d) => ACCEPTED.has(d.id)).sort((a,b)=>catalogPosition(a)-catalogPosition(b));

export function getDesign(id: string) {
  return designs.find((d) => d.id === id);
}

/** «Трудные» данные для проверки вёрстки (длинные имена, три тадбира) */
export function longSample(design: Design): InvitationData {
  return longSamples[design.occasion];
}
