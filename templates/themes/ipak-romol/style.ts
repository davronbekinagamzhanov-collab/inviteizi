import localFont from "next/font/local";

import type { CSSProperties } from "react";
import { designVars } from "../types";

// Имена и цифры. Marck Script (из каталога) не знает қ ғ ҳ, поэтому имена — Viaoda Libre:
// высокий контрастный шрифт с «каплями» на концах, похож на шёлковую нить.
const display = localFont({src:[{path:"../../../assets/fonts/google/viaodalibre/ViaodaLibre-Regular.woff2",weight:"400",style:"normal"}],display:"swap",variable:"--ir-display"});

/** Буквы, которых нет в Marck Script (узбекские и казахские): такое слово набираем шрифтом имён */
export const MISSING_IN_SCRIPT = /[қғҳәңөұүһіҚҒҲӘҢӨҰҮҺІ]/;

// Marck Script — только для «ва» между именами (в этом слове нет ў қ ғ ҳ; казахское «және» — шрифтом имён)
const script = localFont({src:[{path:"../../../assets/fonts/google/marckscript/MarckScript-Regular.woff2",weight:"400",style:"normal"}],display:"swap",variable:"--ir-script"});

const body = localFont({src:[{path:"../../../assets/fonts/google/gentiumbookplus/GentiumBookPlus-Regular.woff2",weight:"400",style:"normal"},{path:"../../../assets/fonts/google/gentiumbookplus/GentiumBookPlus-Italic.woff2",weight:"400",style:"italic"},{path:"../../../assets/fonts/google/gentiumbookplus/GentiumBookPlus-Bold.woff2",weight:"700",style:"normal"},{path:"../../../assets/fonts/google/gentiumbookplus/GentiumBookPlus-BoldItalic.woff2",weight:"700",style:"italic"}],display:"swap",variable:"--ir-body"});

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
