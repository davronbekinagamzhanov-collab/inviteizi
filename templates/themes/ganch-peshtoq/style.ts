import type { CSSProperties } from "react";
import localFont from "next/font/local";
import { designVars } from "../types";

// Cormorant Upright из каталога не умеет кириллицу (в Google Fonts у него только латиница),
// поэтому display — Cormorant Unicase: строчные нарисованы как капитель, буквы похожи
// на резную надпись в ганче. cyrillic-ext — в нём ў қ ғ ҳ.
const displayFontd79ae39b = localFont({src: [{path: "../../../assets/fonts/google/cormorantunicase/CormorantUnicase-Regular.woff2", weight: "400", style: "normal"}, {path: "../../../assets/fonts/google/cormorantunicase/CormorantUnicase-Medium.woff2", weight: "500", style: "normal"}, {path: "../../../assets/fonts/google/cormorantunicase/CormorantUnicase-SemiBold.woff2", weight: "600", style: "normal"}], display: "swap", preload: false, variable: "--gp-display"});

// Source Serif 4 — вариативный, с оптическим размером: мелкий текст плотнее, крупный тоньше
const bodyFontd79ae39b = localFont({src: [{path: "../../../assets/fonts/google/sourceserif4/SourceSerif4[opsz,wght].woff2", weight: "200.0 900.0", style: "normal"}, {path: "../../../assets/fonts/google/sourceserif4/SourceSerif4-Italic[opsz,wght].woff2", weight: "200.0 900.0", style: "italic"}], display: "swap", preload: false, variable: "--gp-body"});

export const fontClasses = `${displayFontd79ae39b.variable} ${bodyFontd79ae39b.variable}`;

/** Ганч: белый гипс, углублённый фон резьбы, тени, тёплый свет из проёма */
export const PLASTER = "#F7F4EE"; // поверхность ганча
export const SURFACE = "#FBF9F5"; // выпуклый узор (самое светлое)
export const GROUND = "#E6DED0"; // углублённый фон резьбы
export const SHADE = "#B5A68F"; // тень рельефа
export const INK = "#46392D"; // текст: тёплый камень
export const GLOW = "#FFE6B0"; // тёплый свет

export const vars = {
  ...designVars(
    {
      primary: INK,
      primaryDark: "#2F261E",
      gold: "#B08A45",
      goldLight: "#F0DCA4",
      paper: PLASTER,
      ink: INK,
      muted: "#7F705E",
    },
    { display: "var(--gp-display)", accent: "var(--gp-display)", body: "var(--gp-body)" },
  ),
  "--c-gold-deep": "#8C6A2C",
} as CSSProperties;
