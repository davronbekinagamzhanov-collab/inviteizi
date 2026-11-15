import localFont from "next/font/local";

import { designVars } from "../types";

// cyrillic-ext — в нём ў қ ғ ҳ
// Libertinus Serif, курсив — каллиграфичный «почерк пером» для имён и заголовков.
// (По каталогу был Great Vibes, но в нём нет ў қ ғ ҳ — проверено скриптом.)
const display = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/libertinusserif/LibertinusSerif-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../../assets/fonts/web/google/libertinusserif/LibertinusSerif-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--ab-display",
});

// EB Garamond — книжная антиква для текста: спокойная, «полиграфическая»
const body = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/ebgaramond/EBGaramond[wght].woff2",
      weight: "400.0 800.0",
      style: "normal",
    },
    {
      path: "../../../assets/fonts/web/google/ebgaramond/EBGaramond-Italic[wght].woff2",
      weight: "400.0 800.0",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--ab-body",
});

export const fontClasses = `${display.variable} ${body.variable}`;

/** Пудра (фон), гранат (точечный акцент), золото, сливовый текст */
export const PAPER = "#F6EAE5";
export const PAPER_DEEP = "#EEDBD4";
export const GARNET = "#9E2338";
export const GARNET_DEEP = "#6E1626";
export const INK = "#4A2A2E";

export const vars = designVars(
  {
    primary: GARNET,
    primaryDark: GARNET_DEEP,
    gold: "#B4893A",
    goldLight: "#F2D898",
    paper: PAPER,
    ink: INK,
    muted: "#7E5F5D",
    accent: GARNET,
  },
  { display: "var(--ab-display)", accent: "var(--ab-display)", body: "var(--ab-body)" },
);
