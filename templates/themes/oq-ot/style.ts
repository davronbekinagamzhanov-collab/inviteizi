import { Alegreya_Sans } from "next/font/google";
import localFont from "next/font/local";
import { designVars } from "../types";

const display = localFont({
  variable: "--oo-display",
  src: [
    { path: "../../../assets/fonts/Lora-Regular.ttf", weight: "400 700", style: "normal" },
    { path: "../../../assets/fonts/Lora-Italic.ttf", weight: "400 700", style: "italic" },
  ],
  display: "swap",
});

const body = Alegreya_Sans({
  variable: "--oo-body",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

export const fontClasses = `${display.variable} ${body.variable}`;

/** Слоновая кость, королевский синий, золото, мягкий голубой */
export const IVORY = "#F7F1E6";
export const ROYAL = "#1F3A6E";
export const SKY = "#DCE6F2";

export const vars = designVars(
  {
    primary: ROYAL,
    primaryDark: "#132650",
    gold: "#B8892F",
    goldLight: "#F3D58A",
    paper: IVORY,
    ink: "#1C2B4A",
    muted: "#5B6883",
    accent: SKY,
  },
  { display: "var(--oo-display)", accent: "var(--oo-display)", body: "var(--oo-body)" },
);
