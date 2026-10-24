import { EB_Garamond, Libertinus_Serif } from "next/font/google";
import { designVars } from "../types";

// cyrillic-ext — в нём ў қ ғ ҳ
// Libertinus Serif, курсив — каллиграфичный «почерк пером» для имён и заголовков.
// (По каталогу был Great Vibes, но в нём нет ў қ ғ ҳ — проверено скриптом.)
const display = Libertinus_Serif({
  variable: "--ab-display",
  weight: ["400", "600"],
  style: ["italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

// EB Garamond — книжная антиква для текста: спокойная, «полиграфическая»
const body = EB_Garamond({
  variable: "--ab-body",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
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
