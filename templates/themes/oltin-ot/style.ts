import { Merriweather, Playfair } from "next/font/google";
import { designVars } from "../types";

// Playfair (новая версия семейства) — в ней есть cyrillic-ext с ў қ ғ ҳ.
// Ось opsz: на крупных кеглях контраст штрихов растёт сам — имя выглядит «гравированным».
const display = Playfair({
  variable: "--ot-display",
  axes: ["opsz"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

const body = Merriweather({
  variable: "--ot-body",
  axes: ["opsz"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

export const fontClasses = `${display.variable} ${body.variable}`;

/** Нежный голубой бархат, молоко, золото, синяя эмаль */
export const MILK = "#F9F5EC";
export const VELVET = "#A9C1DD";
export const VELVET_LIGHT = "#D3E0EF";
export const VELVET_DEEP = "#7896BF";
export const INK = "#1D3256";
export const ENAMEL = "#2F4C7C";

export const vars = designVars(
  {
    primary: INK,
    primaryDark: "#14243F",
    gold: "#B8892F",
    goldLight: "#F3D58A",
    paper: MILK,
    ink: INK,
    muted: "#5A6C8C",
    accent: VELVET,
  },
  { display: "var(--ot-display)", accent: "var(--ot-display)", body: "var(--ot-body)" },
);
