import { Gentium_Book_Plus, Marck_Script, Viaoda_Libre } from "next/font/google";
import type { CSSProperties } from "react";
import { designVars } from "../types";

// Имена и цифры. Marck Script (из каталога) не знает қ ғ ҳ, поэтому имена — Viaoda Libre:
// высокий контрастный шрифт с «каплями» на концах, похож на шёлковую нить.
const display = Viaoda_Libre({
  variable: "--ir-display",
  weight: "400",
  subsets: ["cyrillic", "cyrillic-ext"],
});

// Marck Script — только для «ва» между именами (в этом слове нет ў қ ғ ҳ)
const script = Marck_Script({
  variable: "--ir-script",
  weight: "400",
  subsets: ["cyrillic"],
});

const body = Gentium_Book_Plus({
  variable: "--ir-body",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

export const fontClasses = `${display.variable} ${script.variable} ${body.variable}`;

/** Лавандовый шёлк */
export const SILK = "#E9E2F0"; // основной тон рўмола
export const SILK_LIGHT = "#F6F2F9"; // блик на складке
export const SILK_SHADOW = "#D3C7E1"; // тень складки
export const PLUM = "#3A2B4B"; // текст — тёмная слива
export const MUTED = "#665878";

/** Серебристое золото: стопы для SVG-градиентов */
export const SILVER_GOLD = ["#857152", "#B09C77", "#EFE6D2", "#B3A27E", "#7E6B4D"] as const;

export const vars: CSSProperties = {
  ...designVars(
    {
      primary: PLUM,
      primaryDark: "#291E36",
      gold: "#9C8862",
      goldLight: "#E6DBC2",
      paper: SILK,
      ink: PLUM,
      muted: MUTED,
    },
    { display: "var(--ir-display)", accent: "var(--ir-script)", body: "var(--ir-body)" },
  ),
  // тёмный край золотого градиента — тоже серебристый, а не рыжий
  "--c-gold-deep": "#7A684B",
} as CSSProperties;
