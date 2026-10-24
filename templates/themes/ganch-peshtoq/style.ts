import type { CSSProperties } from "react";
import { Cormorant_Unicase, Source_Serif_4 } from "next/font/google";
import { designVars } from "../types";

// Cormorant Upright из каталога не умеет кириллицу (в Google Fonts у него только латиница),
// поэтому display — Cormorant Unicase: строчные нарисованы как капитель, буквы похожи
// на резную надпись в ганче. cyrillic-ext — в нём ў қ ғ ҳ.
const display = Cormorant_Unicase({
  variable: "--gp-display",
  weight: ["400", "500", "600"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

// Source Serif 4 — вариативный, с оптическим размером: мелкий текст плотнее, крупный тоньше
const body = Source_Serif_4({
  variable: "--gp-body",
  style: ["normal", "italic"],
  axes: ["opsz"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

export const fontClasses = `${display.variable} ${body.variable}`;

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
