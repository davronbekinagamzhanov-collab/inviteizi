import { existsSync } from "node:fs";
import path from "node:path";
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
  /** В дизайне есть фото (Pixabay), а не только орнаменты кодом */
  withPhoto: boolean;
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

/** Новый дизайн: данные демо берутся по тадбиру */
function design(
  id: string,
  number: number,
  occasion: Occasion,
  format: Format,
  withPhoto: boolean,
  load: Loader,
  extra: Partial<Design> = {},
): Design {
  return { id, number, occasion, format, withPhoto, sample: sampleFor(id, occasion), cover: cover(id), load, ...extra };
}

export const designs: Design[] = [
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
  design("marvarid-satr", 82, "nikoh", "simple", false, () => import("./themes/marvarid-satr/Design")),
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
  design("kabutar-salom", 96, "nikoh", "animated", false, () => import("./themes/kabutar-salom/Design")),
  design("shirin-tilak", 97, "nikoh", "scroll", false, () => import("./themes/shirin-tilak/Design")),
  design("minor-satr", 98, "nikoh", "scroll", false, () => import("./themes/minor-satr/Design")),
  design("kumush-taroq", 99, "nikoh", "scroll", false, () => import("./themes/kumush-taroq/Design")),
  design("shabnam-visol", 100, "nikoh", "animated", false, () => import("./themes/shabnam-visol/Design")),
  design("visol-soati", 101, "nikoh", "animated", false, () => import("./themes/visol-soati/Design")),
];

/**
 * Принятые дизайны (прошли приёмку) — только их видят клиенты в боте и на /catalog.
 * Остальные в работе: код остаётся, демо открывается по прямой ссылке, но в каталоге их нет.
 */
export const ACCEPTED = new Set([
  "oltin-monogramma", "sapfir", "oq-ot", "tonggi-qozon", "pion-guldasta",
  "tandir-nuri", "ganch-peshtoq", "ipak-romol", "oltin-ot",
  "zarhal-eshik", "rishton-koshin", "atirgul", "dasturxon",
  "atlas-tolqin", "non-muhr", "shohona-baxmal", "paxta-gul", "bodom-guli", "samarqand-kitob", "tonggi-choy",
  "oq-chinni", "doppicha", "sayram-hovli", "zarvaraq", "umr-daraxti",
  "marvarid-satr", "gulbog-sahifa", "suzani-yol", "bugdoy-boshoq", "lola-ehtirom",
  "zarhal-lavha", "adras-nishon", "mis-kafgir", "rayhon-sahari", "visol-rishta",
  "uzum-hovli", "sopol-navo", "girih-nur", "siyoh-duo", "kabutar-salom",
  "shirin-tilak", "minor-satr", "kumush-taroq", "shabnam-visol", "visol-soati",
  // "anor-bogi" — скрыт по замечанию владельца 24.10 (код остаётся)
]);

/** Дизайны для клиентов: только принятые */
export const activeDesigns = () => designs.filter((d) => ACCEPTED.has(d.id));

export function getDesign(id: string) {
  return designs.find((d) => d.id === id);
}

/** «Трудные» данные для проверки вёрстки (длинные имена, три тадбира) */
export function longSample(design: Design): InvitationData {
  return longSamples[design.occasion];
}

/** Адрес картины дизайна, если файл уже лежит в public/ (иначе дизайн рисует временный фон) */
export function existingArt(design: Design) {
  if (!design.art) return undefined;
  return existsSync(path.join(process.cwd(), "public", design.art)) ? design.art : undefined;
}
