import localFont from "next/font/local";
import { designVars } from "../types";

// Здесь Cormorant используется курсивом: цифра и имя — герои, в отличие от прямой монограммы №1.
// Прямое начертание тоже подключаем — с одним курсивом turbopack не собирает шрифт
const display = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond[wght].woff2",
      weight: "300.0 700.0",
      style: "normal",
    },
    {
      path: "../../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond-Italic[wght].woff2",
      weight: "300.0 700.0",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--pg-display",
});

const body = localFont({
  preload: false,
  variable: "--pg-body",
  src: [
    { path: "../../../assets/fonts/web/Lora-Regular.woff2", weight: "400 700", style: "normal" },
    { path: "../../../assets/fonts/web/Lora-Italic.woff2", weight: "400 700", style: "italic" },
  ],
  display: "swap",
});

export const fontClasses = `${display.variable} ${body.variable}`;

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
