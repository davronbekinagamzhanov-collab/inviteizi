import localFont from "next/font/local";
import { designVars } from "../types";

// cyrillic-ext — в нём ў қ ғ ҳ
// Libertinus Serif, курсив — каллиграфичный «почерк пером» для имён и заголовков.
// (По каталогу был Great Vibes, но в нём нет ў қ ғ ҳ — проверено скриптом.)
const displayFont7f7ddb91 = localFont({src: [{path: "../../../assets/fonts/google/libertinusserif/LibertinusSerif-Italic.woff2", weight: "400", style: "italic"}, {path: "../../../assets/fonts/google/libertinusserif/LibertinusSerif-SemiBoldItalic.woff2", weight: "600", style: "italic"}], display: "swap", preload: false, variable: "--ab-display"});

// EB Garamond — книжная антиква для текста: спокойная, «полиграфическая»
const bodyFont7f7ddb91 = localFont({src: [{path: "../../../assets/fonts/google/ebgaramond/EBGaramond[wght].woff2", weight: "400 600", style: "normal"}, {path: "../../../assets/fonts/google/ebgaramond/EBGaramond-Italic[wght].woff2", weight: "400 600", style: "italic"}], display: "swap", preload: false, variable: "--ab-body"});

export const fontClasses = `${displayFont7f7ddb91.variable} ${bodyFont7f7ddb91.variable}`;

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
