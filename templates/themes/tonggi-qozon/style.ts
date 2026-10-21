import { Alegreya, PT_Serif } from "next/font/google";
import { designVars } from "../types";

const display = Alegreya({
  variable: "--tq-display",
  weight: ["500", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

const body = PT_Serif({
  variable: "--tq-body",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

export const fontClasses = `${display.variable} ${body.variable}`;

/** Рассветный крем, шафран, гранат, тёплый коричневый */
export const CREAM = "#FBF4E8";
export const SAFFRON = "#D9A441";
export const POMEGRANATE = "#8E2A2A";

export const vars = designVars(
  {
    primary: POMEGRANATE,
    primaryDark: "#5E1A1A",
    // «золото» этого дизайна — шафрановое
    gold: "#C68A2E",
    goldLight: "#F6D58E",
    paper: CREAM,
    ink: "#3A2618",
    muted: "#7A604A",
    accent: SAFFRON,
  },
  { display: "var(--tq-display)", accent: "var(--tq-display)", body: "var(--tq-body)" },
);
