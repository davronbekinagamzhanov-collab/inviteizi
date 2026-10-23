import { existsSync } from "node:fs";
import path from "node:path";
import type { ComponentType } from "react";
import type { TemplateProps } from "./themes/types";
import type { InvitationData, Occasion } from "@/lib/types";
import { pilotSamples } from "@/lib/pilot-samples";
import { longSamples, samples } from "@/lib/samples";

export type { TemplateProps };
export type Format = "animated" | "simple";

/** Цена формата, ₸ (музыка входит в цену) */
export const PRICES: Record<Format, number> = { animated: 10_000, simple: 7_000 };

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
  return { id, number, occasion, format, withPhoto, sample: samples[occasion], cover: cover(id), load, ...extra };
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
  design("bodom-guli", 65, "nikoh", "animated", true, () => import("./themes/bodom-guli/Design")),
  design("samarqand-kitob", 66, "nikoh", "animated", true, () => import("./themes/samarqand-kitob/Design")),
  design("ipak-romol", 67, "nikoh", "simple", false, () => import("./themes/ipak-romol/Design")),
  design("rishton-koshin", 68, "nikoh", "simple", false, () => import("./themes/rishton-koshin/Design")),
  design("atirgul", 69, "nikoh", "simple", true, () => import("./themes/atirgul/Design")),
  design("shohona-baxmal", 70, "nikoh", "simple", false, () => import("./themes/shohona-baxmal/Design"), { dark: true }),

  // ── Наҳорги ош ──
  design("tandir-nuri", 71, "nahorgi", "animated", true, () => import("./themes/tandir-nuri/Design")),
  design("dasturxon", 72, "nahorgi", "animated", false, () => import("./themes/dasturxon/Design")),
  design("non-muhr", 73, "nahorgi", "animated", false, () => import("./themes/non-muhr/Design")),
  design("tonggi-choy", 74, "nahorgi", "simple", true, () => import("./themes/tonggi-choy/Design")),
  design("paxta-gul", 75, "nahorgi", "simple", false, () => import("./themes/paxta-gul/Design")),

  // ── Суннат ──
  design("oltin-ot", 76, "sunnat", "animated", false, () => import("./themes/oltin-ot/Design")),
];

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
