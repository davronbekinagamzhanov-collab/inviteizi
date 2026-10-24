import { Piazzolla, Podkova } from "next/font/google";
import type { CSSProperties } from "react";
import { designVars } from "../types";

// Podkova — тёплый брусковый шрифт с мягкими, «лепными» засечками: плотный, как корочка нона.
// По каталогу был Kurale, но в нём нет буквы ҳ (браузер подставлял Times) — заменён.
// cyrillic-ext — в нём ў қ ғ ҳ
const display = Podkova({
  variable: "--tn-display",
  weight: ["400", "500", "600"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

// Piazzolla — книжный текст с оптическим размером (opsz): мелкий кегль плотнее, крупный тоньше
const body = Piazzolla({
  variable: "--tn-body",
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

export const fontClasses = `${display.variable} ${body.variable}`;

/** Молоко, песок, тёплый янтарь, глина тандира */
export const MILK = "#FBF5EA";
export const MILK_LIGHT = "#FEFAF3";
export const SAND = "#F2E4CC";
export const SAND_DEEP = "#E6CFA9";
export const AMBER = "#D98E2E";
export const CLAY = "#6A3A20";
export const CLAY_DARK = "#3A2114";
export const INK = "#41291A";

/** Янтарное «золото» для текста: тёмный мёд → блик → тёмный мёд (на молоке читается) */
export const AMBER_TEXT: CSSProperties = {
  background: "linear-gradient(100deg, #9A5A16 0%, #C47C26 30%, #E6AE58 50%, #C47C26 68%, #8E5014 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

export const vars = {
  ...designVars(
    {
      primary: CLAY,
      primaryDark: CLAY_DARK,
      // «золото» этого дизайна — янтарное, как корочка нона
      gold: "#C07A28",
      goldLight: "#F6D79A",
      paper: MILK,
      ink: INK,
      muted: "#7F6249",
      accent: AMBER,
    },
    { display: "var(--tn-display)", accent: "var(--tn-display)", body: "var(--tn-body)" },
  ),
  "--c-gold-deep": "#94561A",
} as CSSProperties;
