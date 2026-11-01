
import localFont from "next/font/local";
import { designVars } from "../types";

// Playfair Display без cyrillic-ext (нет қ ғ ҳ), поэтому новая версия семейства — Playfair
const display = localFont({src:[{path:"../../../assets/fonts/google/playfair/Playfair[opsz,wdth,wght].woff2",weight:"300.0 900.0",style:"normal"},{path:"../../../assets/fonts/google/playfair/Playfair-Italic[opsz,wdth,wght].woff2",weight:"300.0 900.0",style:"italic"}],display:"swap",variable:"--sf-display"});

const body = localFont({
  variable: "--sf-body",
  src: [
    { path: "../../../assets/fonts/Lora-Regular.ttf", weight: "400 700", style: "normal" },
    { path: "../../../assets/fonts/Lora-Italic.ttf", weight: "400 700", style: "italic" },
  ],
  display: "swap",
});

export const fontClasses = `${display.variable} ${body.variable}`;

/** Сапфировый бархат и золото */
export const VELVET_TOP = "#14204A";
export const VELVET_BOTTOM = "#0E1736";

export const vars = designVars(
  {
    primary: VELVET_TOP,
    primaryDark: VELVET_BOTTOM,
    gold: "#B8892F",
    goldLight: "#F3D58A",
    paper: VELVET_BOTTOM,
    ink: "#F4EBD6",
    muted: "#C9C0AE",
  },
  { display: "var(--sf-display)", accent: "var(--sf-display)", body: "var(--sf-body)" },
);
