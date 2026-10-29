import localFont from "next/font/local";

import { designVars } from "../types";

// Здесь Cormorant используется курсивом: цифра и имя — герои, в отличие от прямой монограммы №1.
// Прямое начертание тоже подключаем — с одним курсивом turbopack не собирает шрифт
const displayFont65ce76b1 = localFont({src: [{path: "../../../assets/fonts/google/cormorantgaramond/CormorantGaramond[wght].woff2", weight: "500 700", style: "normal"}, {path: "../../../assets/fonts/google/cormorantgaramond/CormorantGaramond-Italic[wght].woff2", weight: "500 700", style: "italic"}], display: "swap", preload: false, variable: "--pg-display"});

const bodyFont65ce76b1 = localFont({
  variable: "--pg-body",
  src: [
    { path: "../../../assets/fonts/Lora-Regular.ttf", weight: "400 700", style: "normal" },
    { path: "../../../assets/fonts/Lora-Italic.ttf", weight: "400 700", style: "italic" },
  ],
  display: "swap",
});

export const fontClasses = `${displayFont65ce76b1.variable} ${bodyFont65ce76b1.variable}`;

/** Пудра, бордо, золото, крем */
export const POWDER = "#F6E4E1";
export const BORDO = "#6E1E2E";
export const CREAM = "#FFF8F2";

export const vars = designVars(
  {
    primary: BORDO,
    primaryDark: "#4A1220",
    gold: "#B8892F",
    goldLight: "#F3D58A",
    paper: CREAM,
    ink: "#4A2A2E",
    muted: "#8C6A6E",
    accent: POWDER,
  },
  { display: "var(--pg-display)", accent: "var(--pg-display)", body: "var(--pg-body)" },
);
