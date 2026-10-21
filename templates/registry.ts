import type { ComponentType } from "react";
import type { TemplateProps } from "./themes/types";
import type { InvitationData } from "@/lib/types";
import { pilotSamples } from "@/lib/pilot-samples";

export type { TemplateProps };
export type Format = "animated" | "simple";

/** Цена формата, ₸ (музыка входит в цену) */
export const PRICES: Record<Format, number> = { animated: 10_000, simple: 7_000 };

type Loader = () => Promise<{ default: ComponentType<TemplateProps> }>;

/**
 * Один ДИЗАЙН = своя картина/украшение, раскладка, шрифты, открытие и анимация.
 * Номер — из каталога в «План проекта/10_ЭТАЛОНЫ_И_60_ДИЗАЙНОВ.md».
 */
export type Design = {
  id: keyof typeof pilotSamples; // адрес демо: /demo/oq-ot
  number: number;
  format: Format;
  /** Пример данных для демо */
  sample: InvitationData;
  /** Превью для витрины (public/) */
  preview: string;
  // Код дизайна загружается только когда его открыли (шрифты и анимации других дизайнов не грузятся)
  load: Loader;
};

export const designs: Design[] = [
  {
    id: "oltin-monogramma",
    number: 1,
    format: "animated",
    sample: pilotSamples["oltin-monogramma"],
    preview: "/pilots/oltin-monogramma.webp",
    load: () => import("./themes/oltin-monogramma/OltinMonogramma"),
  },
  {
    id: "sapfir",
    number: 23,
    format: "simple",
    sample: pilotSamples.sapfir,
    preview: "/pilots/sapfir.webp",
    load: () => import("./themes/sapfir/Sapfir"),
  },
  {
    id: "oq-ot",
    number: 31,
    format: "animated",
    sample: pilotSamples["oq-ot"],
    preview: "/pilots/oq-ot.webp",
    load: () => import("./themes/oq-ot/OqOt"),
  },
  {
    id: "tonggi-qozon",
    number: 41,
    format: "animated",
    sample: pilotSamples["tonggi-qozon"],
    preview: "/pilots/tonggi-qozon.webp",
    load: () => import("./themes/tonggi-qozon/TonggiQozon"),
  },
  {
    id: "pion-guldasta",
    number: 51,
    format: "animated",
    sample: pilotSamples["pion-guldasta"],
    preview: "/pilots/pion-guldasta.webp",
    load: () => import("./themes/pion-guldasta/PionGuldasta"),
  },
];

export function getDesign(id: string) {
  return designs.find((d) => d.id === id);
}
