import type { ComponentType } from "react";
import type { Palette, TemplateProps } from "./themes/types";
import { oltinMuhrPalettes } from "./themes/oltin-muhr/palettes";
import { pardaPalettes } from "./themes/parda/palettes";
import { uramaPalettes } from "./themes/urama/palettes";

export type { TemplateProps };
export type Tier = "premium" | "ekonom";

type Loader = () => Promise<{ default: ComponentType<TemplateProps> }>;

/**
 * Один ДИЗАЙН = своё открытие, композиция, шрифты, декор, анимации.
 * Номер — из таблицы в «План проекта/08_50_ДИЗАЙНОВ_И_МУЗЫКА.md».
 * Цвета — бонусные варианты одного дизайна, в 50 не считаются.
 */
type Design = {
  key: string; // ключ в t.themes
  tier: Tier;
  number: number;
  palettes: Record<string, Palette>;
  // Код дизайна загружается только когда его открыли (шрифты и анимации других дизайнов не грузятся)
  load: Loader;
};

export const designs: Design[] = [
  {
    key: "oltin-muhr",
    tier: "premium",
    number: 1,
    palettes: oltinMuhrPalettes,
    load: () => import("./themes/oltin-muhr/OltinMuhr"),
  },
  {
    key: "parda",
    tier: "premium",
    number: 2,
    palettes: pardaPalettes,
    load: () => import("./themes/parda/Parda"),
  },
  {
    key: "urama",
    tier: "premium",
    number: 4,
    palettes: uramaPalettes,
    load: () => import("./themes/urama/Urama"),
  },
];

/** Шаблон каталога = дизайн × цвет. Первый цвет получает короткий адрес без суффикса */
export type TemplateInfo = {
  id: string; // адрес демо: /demo/parda-binafsha
  design: Design;
  color: string; // ключ в t.colors
  swatch: string; // цвет кружка в каталоге
};

export const templates: TemplateInfo[] = designs.flatMap((design) =>
  Object.entries(design.palettes).map(([color, palette], i) => ({
    id: i === 0 ? design.key : `${design.key}-${color}`,
    design,
    color,
    swatch: palette.primary,
  })),
);

export function getTemplate(id: string) {
  return templates.find((tpl) => tpl.id === id);
}
