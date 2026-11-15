import type { ComponentType } from "react";
import type { TemplateProps } from "./themes/types";
import type { InvitationData, Occasion } from "@/lib/types";
import { pilotSamples } from "@/lib/pilot-samples";
import { longSamples, sampleFor } from "@/lib/samples";
import { ON_SALE, ON_SALE_IDS } from "./catalog";

export type { TemplateProps };
export const FORMATS = ["animated", "scroll", "simple"] as const;
export type Format = (typeof FORMATS)[number];

/** Цена формата, ₸ (музыка входит в цену) */
export const PRICES: Record<Format, number> = { animated: 8_000, scroll: 6_000, simple: 5_000 };

/** Внешний вид дизайна (распределены по обложкам): для панели владельца */
export const DESIGN_STYLES = ["milk", "gold", "floral", "national", "dark", "photo"] as const;
export type DesignStyle = (typeof DESIGN_STYLES)[number];

export type DesignModule = { default: ComponentType<TemplateProps> };

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
  extra: Partial<RawDesign> = {},
): RawDesign {
  return {
    id,
    number,
    occasion,
    format,
    withPhoto,
    sample: ["kabutar-salom", "yelpigich-ziynat", "samarqand-kitob", "qosh-uzuk", "saodat-kaliti"].includes(id)
      ? { ...sampleFor(id, occasion), groom: "Давронбек", bride: "Нозима" }
      : sampleFor(id, occasion),
    cover: cover(id),
    ...extra,
  };
}

const rawDesigns: RawDesign[] = [
  // Jubilee candidates: new IDs stay unlisted until separate owner-approved activation.
  design("umr-durdonasi", 163, "yubiley", "animated", true, {
    clientPhotos: true,
    art: "/art/yubiley-collection/umr-durdonasi.webp",
  }),
  design("qadr-surati", 164, "yubiley", "simple", true, {
    clientPhotos: true,
    art: "/art/yubiley-collection/qadr-surati.webp",
  }),
  // Unlisted sunnat collection, pending artistic acceptance.
  design("zarhal-duo", 159, "sunnat", "animated", true, {
    clientPhotos: false,
    art: "/art/sunnat-collection/zarhal-duo.webp",
  }),
  design("moviy-ayvon", 160, "sunnat", "scroll", true, {
    clientPhotos: false,
    art: "/art/sunnat-collection/moviy-ayvon.webp",
  }),
  design("tulpor-quvonchi", 161, "sunnat", "simple", true, {
    clientPhotos: true,
    art: "/art/sunnat-collection/tulpor-quvonchi.webp",
  }),
  design("kashta-tilagi", 162, "sunnat", "simple", true, {
    clientPhotos: false,
    art: "/art/sunnat-collection/kashta-tilagi.webp",
  }),

  // Unlisted collection candidates; activate only in a separately approved integration release.
  design("bog-nasimi", 157, "nahorgi", "simple", true, {
    clientPhotos: true,
    art: "/art/nahorgi-collection/bog-nasimi.webp",
  }),
  design("tong-naqshi", 158, "nahorgi", "simple", true, {
    clientPhotos: false,
    art: "/art/nahorgi-collection/tong-naqshi.webp",
  }),
  // Preview numbers 155/156 (mehr-fasli/qutlug-nihol) retired by owner; do not reuse.
  // Two ordinary, unlisted morning previews. ACCEPTED, catalogue order and prices stay unchanged.
  design("sahar-sabosi", 153, "nahorgi", "animated", true, {
    clientPhotos: false,
    art: "/art/celebrations/sahar-sabosi-hero.webp",
  }),
  design("subhi-safo", 154, "nahorgi", "scroll", true, {
    clientPhotos: false,
    art: "/art/celebrations/subhi-safo-hero.webp",
  }),
  // Private VIP previews: deliberately absent from ACCEPTED and catalogue order.
  design("vip-ipak-ziyosi", 151, "nikoh", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-ipak-ziyosi/ceremony-1.webp",
  }),
  design("vip-zarbof", 152, "nikoh", "animated", true, {
    clientPhotos: false,
    art: "/vip/vip-zarbof/1.webp",
  }),
  design("vip-visol-nuri", 149, "nikoh", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-visol-nuri/1.webp",
  }),
  design("vip-zarrin-ahd", 150, "nikoh", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-zarrin-ahd/1.webp",
  }),
  design("vip-marvarid", 145, "nikoh", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-marvarid/hero.webp",
  }),
  design("vip-bogi-visol", 146, "nikoh", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-bogi-visol/hero.webp",
  }),
  design("vip-oq-tulpor", 147, "sunnat", "animated", true, {
    clientPhotos: false,
    art: "/vip/vip-oq-tulpor/hero.webp",
  }),
  design("vip-umr-ziyosi", 148, "yubiley", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-umr-ziyosi/hero.webp",
  }),
  design("vip-suzana", 144, "nikoh", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-suzana/hero.webp",
  }),
  design("vip-osmon", 143, "nikoh", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-osmon/hero.webp",
  }),
  design("vip-tilla-muhr", 142, "nikoh", "animated", true, {
    clientPhotos: true,
    art: "/vip/vip-tilla-muhr/hero.webp",
  }),
  // ── Пилоты ──
  {
    id: "oltin-monogramma",
    number: 1,
    occasion: "nikoh",
    format: "animated",
    withPhoto: false,
    sample: pilotSamples["oltin-monogramma"],
    cover: cover("oltin-monogramma"),
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
  },

  // ── Никоҳ ──
  design("ganch-peshtoq", 61, "nikoh", "animated", false),
  design("zarhal-eshik", 62, "nikoh", "animated", false),
  design("atlas-tolqin", 63, "nikoh", "animated", false),
  design("anor-bogi", 64, "nikoh", "animated", true),
  design("bodom-guli", 65, "nikoh", "animated", true, {
    art: "/art/bodom-guli.webp",
  }),
  design("samarqand-kitob", 66, "nikoh", "animated", true, {
    art: "/art/samarqand-kitob.webp",
  }),
  design("ipak-romol", 67, "nikoh", "simple", false),
  design("rishton-koshin", 68, "nikoh", "simple", false),
  design("atirgul", 69, "nikoh", "simple", true, { art: "/art/atirgul.webp" }),
  design("shohona-baxmal", 70, "nikoh", "scroll", false, {
    dark: true,
  }),

  // ── Наҳорги ош ──
  design("tandir-nuri", 71, "nahorgi", "animated", true),
  design("dasturxon", 72, "nahorgi", "animated", true, {
    art: "/art/dasturxon.webp",
  }),
  design("non-muhr", 73, "nahorgi", "animated", false),
  design("tonggi-choy", 74, "nahorgi", "scroll", true, {
    art: "/art/tonggi-choy.webp",
  }),
  design("paxta-gul", 75, "nahorgi", "scroll", false),

  // ── Суннат ──
  design("oltin-ot", 76, "sunnat", "animated", false),

  // Партия 4: пять пустых сочетаний тадбира/формата, без повторения готовых композиций.
  design("oq-chinni", 77, "nahorgi", "simple", false),
  design("doppicha", 78, "sunnat", "simple", false),
  design("sayram-hovli", 79, "sunnat", "scroll", false),
  design("zarvaraq", 80, "yubiley", "simple", false),
  design("umr-daraxti", 81, "yubiley", "scroll", true, {
    clientPhotos: false,
    art: "/art/yubiley-collection/umr-daraxti.webp",
  }),
  design("marvarid-satr", 82, "nikoh", "simple", true, {
    art: "/art/bodom-guli.webp",
  }),
  design("gulbog-sahifa", 83, "nikoh", "scroll", true, {
    art: "/art/gulbog-sahifa.webp",
  }),
  design("suzani-yol", 84, "nikoh", "scroll", false),
  design("bugdoy-boshoq", 85, "nahorgi", "simple", false),
  design("lola-ehtirom", 86, "yubiley", "scroll", true, {
    art: "/art/lola-ehtirom.webp",
  }),
  design("zarhal-lavha", 87, "yubiley", "animated", false),
  design("adras-nishon", 88, "sunnat", "simple", false),
  design("mis-kafgir", 89, "nahorgi", "simple", false),
  design("rayhon-sahari", 90, "nahorgi", "scroll", false),
  design("visol-rishta", 91, "nikoh", "animated", false),
  design("uzum-hovli", 92, "nikoh", "scroll", false),
  design("sopol-navo", 93, "nikoh", "scroll", false),
  design("girih-nur", 94, "nikoh", "animated", false),
  design("siyoh-duo", 95, "nikoh", "animated", false),
  design("kabutar-salom", 96, "nikoh", "animated", true, {
    art: "/art/atirgul.webp",
  }),
  design("shirin-tilak", 97, "nikoh", "scroll", false),
  design("minor-satr", 98, "nikoh", "scroll", false),
  design("kumush-taroq", 99, "nikoh", "scroll", false),
  design("shabnam-visol", 100, "nikoh", "animated", false),
  design("visol-soati", 101, "nikoh", "animated", false),
  design("dutor-navosi", 102, "nikoh", "scroll", true, {
    art: "/art/gulbog-sahifa.webp",
  }),
  design("tut-qogozi", 103, "nikoh", "scroll", false),
  design("qosh-uzuk", 104, "nikoh", "animated", false),
  design("yelpigich-ziynat", 105, "nikoh", "animated", true, {
    art: "/art/bodom-guli.webp",
  }),
  design("saodat-kaliti", 106, "nikoh", "animated", false),
  // Final expansion: six new identities, all existing numbers and IDs retained.
  design("sunnat-muqova", 107, "sunnat", "animated", false),
  design("sunnat-nasab", 108, "sunnat", "scroll", false),
  design("sahar-ipagi", 109, "nahorgi", "animated", false),
  design("sahar-maktubi", 110, "nahorgi", "simple", false),
  design("umr-sahifalari", 111, "yubiley", "scroll", true, {
    art: "/art/lola-ehtirom.webp",
  }),
  design("ehtirom-kartasi", 112, "yubiley", "simple", false),
  // «Натуральные» пилоты: настоящие фото, рукописные акценты, фото клиента (02.11.2026)
  design("muhr", 113, "nikoh", "animated", false, { clientPhotos: true }),
  design("ipak", 114, "nikoh", "animated", false, { clientPhotos: true }),
  design("bog", 115, "sunnat", "scroll", false, { clientPhotos: true }),
  design("tong-dasturxon", 116, "nahorgi", "scroll", false),
  // ── «Гулли рамка»: акварельные цветы с краёв + карточка в центре, без фото (03.11.2026) ──
  design("gul-doira", 117, "nikoh", "animated", false),
  design("girih-barg", 118, "nikoh", "animated", false),
  design("muhrli-maktub", 119, "nikoh", "animated", false),
  design("tonggi-piyola", 120, "nahorgi", "animated", false),
  design("lola-bodom", 121, "sunnat", "animated", false),
  design("bordo-guldasta", 122, "yubiley", "simple", true, {
    clientPhotos: false,
    art: "/art/yubiley-collection/bordo-guldasta.webp",
  }),
  // Батч 3 (123–138): структуры S1–S7, docs/design/batch3.md
  design("choy-maktub", 123, "nahorgi", "simple", false),
  design("oq-maktub", 127, "nikoh", "simple", false),
  design("hurmat-maktub", 138, "yubiley", "simple", false),
  design("tong-varaq", 126, "nahorgi", "scroll", false),
  design("nur-varaq", 130, "nikoh", "scroll", false, { clientPhotos: true }),
  design("islimi-varaq", 131, "nikoh", "scroll", false),
  design("non-albom", 124, "nahorgi", "simple", false),
  design("ipak-albom", 128, "nikoh", "simple", false, {
    clientPhotos: true,
  }),
  design("xotira-albom", 132, "nikoh", "scroll", false, {
    clientPhotos: true,
  }),
  design("qozon-tongi", 125, "nahorgi", "animated", false),
  design("visol-hikoya", 133, "nikoh", "animated", false, {
    clientPhotos: true,
  }),
  design("ganch-darvoza", 134, "sunnat", "animated", false),
  design("doppi-kitob", 135, "sunnat", "scroll", false),
  design("umr-kitobi", 137, "yubiley", "scroll", false),
  design("suzani-medalyon", 129, "nikoh", "simple", false, {
    clientPhotos: true,
  }),
  design("lola-medalyon", 136, "sunnat", "simple", false, {
    clientPhotos: true,
  }),
  // «Пятно» (v2, 05.11.2026): акварельное пятно на белой бумаге, структура templates/themes/patno
  design("suvbuyoq-tuman", 139, "nikoh", "scroll", false),
  design("suvbuyoq-zumrad", 140, "nikoh", "scroll", false),
  design("suvbuyoq-upa", 141, "nikoh", "scroll", false),
];

const STYLE_OF: Record<DesignStyle, string[]> = {
  milk: [
    "subhi-safo",
    "vip-marvarid",
    "suvbuyoq-tuman",
    "suvbuyoq-zumrad",
    "suvbuyoq-upa",
    "umr-kitobi",
    "tong-varaq",
    "hurmat-maktub",
    "oq-maktub",
    "choy-maktub",
    "sahar-ipagi",
    "sahar-maktubi",
    "ehtirom-kartasi",
    "zarhal-eshik",
    "atlas-tolqin",
    "non-muhr",
    "marvarid-satr",
    "bugdoy-boshoq",
    "shirin-tilak",
    "visol-soati",
    "tut-qogozi",
  ],
  gold: [
    "vip-zarrin-ahd",
    "vip-tilla-muhr",
    "oltin-monogramma",
    "oltin-ot",
    "zarhal-lavha",
    "qosh-uzuk",
    "zarvaraq",
    "saodat-kaliti",
  ],
  floral: [
    "umr-durdonasi",
    "sahar-sabosi",
    "vip-umr-ziyosi",
    "bordo-guldasta",
    "lola-bodom",
    "tonggi-piyola",
    "muhrli-maktub",
    "gul-doira",
    "girih-barg",
    "umr-sahifalari",
    "pion-guldasta",
    "ipak-romol",
    "paxta-gul",
    "visol-rishta",
    "kabutar-salom",
    "umr-daraxti",
    "rayhon-sahari",
    "siyoh-duo",
    "shabnam-visol",
    "uzum-hovli",
  ],
  national: [
    "zarhal-duo",
    "moviy-ayvon",
    "kashta-tilagi",
    "tong-naqshi",
    "vip-zarbof",
    "vip-oq-tulpor",
    "vip-suzana",
    "doppi-kitob",
    "ganch-darvoza",
    "islimi-varaq",
    "sunnat-muqova",
    "sunnat-nasab",
    "ganch-peshtoq",
    "rishton-koshin",
    "oq-ot",
    "sayram-hovli",
    "doppicha",
    "adras-nishon",
    "suzani-yol",
    "sopol-navo",
    "girih-nur",
    "dutor-navosi",
    "minor-satr",
    "kumush-taroq",
    "mis-kafgir",
    "oq-chinni",
    "tonggi-qozon",
    "yelpigich-ziynat",
  ],
  dark: ["sapfir", "shohona-baxmal"],
  photo: [
    "qadr-surati",
    "tulpor-quvonchi",
    "bog-nasimi",
    "vip-ipak-ziyosi",
    "vip-visol-nuri",
    "vip-bogi-visol",
    "vip-osmon",
    "lola-medalyon",
    "suzani-medalyon",
    "visol-hikoya",
    "qozon-tongi",
    "xotira-albom",
    "ipak-albom",
    "non-albom",
    "nur-varaq",
    "muhr",
    "ipak",
    "bog",
    "tong-dasturxon",
    "tandir-nuri",
    "atirgul",
    "dasturxon",
    "bodom-guli",
    "samarqand-kitob",
    "tonggi-choy",
    "gulbog-sahifa",
    "lola-ehtirom",
    "anor-bogi",
  ],
};

function styleOf(id: string): DesignStyle {
  const style = DESIGN_STYLES.find((s) => STYLE_OF[s].includes(id));
  if (!style) throw new Error(`Дизайну ${id} не назначен стиль`);
  return style;
}

export const designs: Design[] = rawDesigns.map((d) => ({ ...d, style: styleOf(d.id) }));

/**
 * Дизайны в продаже — их видят клиенты в боте, Mini App и на /catalog.
 * Список и порядок задаются в одном месте: templates/catalog.ts (ON_SALE).
 * Остальные: код остаётся, демо открывается по прямой ссылке, оплаченные заказы работают.
 * «anor-bogi» скрыт ещё 24.10; HIDDEN_* ниже — история снятых с продажи.
 */
export const ACCEPTED: ReadonlySet<string> = new Set(ON_SALE_IDS);

/** Дизайн можно купить сейчас (новый заказ или смена дизайна до оплаты) */
export function isOnSale(id: string) {
  return ACCEPTED.has(id);
}

/** Скрыты из каталога сайта и бота 03.11.2026 (номера 31, 41, 62–69, 71–77, 79, 80, 82–86, 88–112). Не удалять: заказы на них открываются */
export const HIDDEN_03_11: readonly string[] = [
  "oq-ot",
  "tonggi-qozon",
  "zarhal-eshik",
  "atlas-tolqin",
  "bodom-guli",
  "samarqand-kitob",
  "ipak-romol",
  "rishton-koshin",
  "atirgul",
  "tandir-nuri",
  "dasturxon",
  "non-muhr",
  "tonggi-choy",
  "paxta-gul",
  "oltin-ot",
  "oq-chinni",
  "sayram-hovli",
  "zarvaraq",
  "marvarid-satr",
  "gulbog-sahifa",
  "suzani-yol",
  "bugdoy-boshoq",
  "lola-ehtirom",
  "adras-nishon",
  "mis-kafgir",
  "rayhon-sahari",
  "visol-rishta",
  "uzum-hovli",
  "sopol-navo",
  "girih-nur",
  "siyoh-duo",
  "kabutar-salom",
  "shirin-tilak",
  "minor-satr",
  "kumush-taroq",
  "shabnam-visol",
  "visol-soati",
  "dutor-navosi",
  "tut-qogozi",
  "qosh-uzuk",
  "yelpigich-ziynat",
  "saodat-kaliti",
  "sunnat-muqova",
  "sunnat-nasab",
  "sahar-ipagi",
  "sahar-maktubi",
  "umr-sahifalari",
  "ehtirom-kartasi",
];

/** Порядок каталога по тадбирам (бот, приложение, сайт /catalog) — это витрина ON_SALE из templates/catalog.ts */
export const CATALOG_ORDER: Record<Occasion, readonly string[]> = ON_SALE;
/** Все id по порядку (для сортировки) */
export const DISPLAY_PRIORITY: readonly string[] = ON_SALE_IDS;
export function catalogPosition(d: Pick<Design, "id" | "number">) {
  const i = DISPLAY_PRIORITY.indexOf(d.id);
  return i < 0 ? 1000 + d.number : i;
}
/** Все когда-либо принятые (каталог + скрытые 03.11): код живой, заказы на них открываются */
/** Сняты из каталога после критика батча 3 (03.11.2026): 131 «Ислими варақ». Код и строка в БД остаются */
export const HIDDEN_BATCH3: readonly string[] = ["islimi-varaq"];
export const HIDDEN_NIKOH_POLISH = ["shohona-baxmal", "ganch-peshtoq", "visol-hikoya"] as const;
export const everAccepted = () =>
  designs.filter(
    (d) =>
      HIDDEN_NIKOH_POLISH.some((id) => id === d.id) ||
      ACCEPTED.has(d.id) ||
      HIDDEN_03_11.includes(d.id) ||
      HIDDEN_BATCH3.includes(d.id),
  );
export const activeDesigns = () =>
  designs.filter((d) => ACCEPTED.has(d.id)).sort((a, b) => catalogPosition(a) - catalogPosition(b));

export function getDesign(id: string) {
  return designs.find((d) => d.id === id);
}

/** «Трудные» данные для проверки вёрстки (длинные имена, три тадбира) */
export function longSample(design: Design): InvitationData {
  return longSamples[design.occasion];
}
