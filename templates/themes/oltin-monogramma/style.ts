import { Cormorant_Garamond, PT_Serif } from "next/font/google";
import { designVars } from "../types";

// cyrillic-ext — в нём ў қ ғ ҳ
const display = Cormorant_Garamond({
  variable: "--om-display",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

const body = PT_Serif({
  variable: "--om-body",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext"],
});

export const fontClasses = `${display.variable} ${body.variable}`;

/** Слоновая кость, жемчуг, золото, шоколад */
export const PAPER = "#F8F3EA";
export const PEARL = "#EFE6D6";

export const vars = designVars(
  {
    primary: "#3B2A1E",
    primaryDark: "#2A1D14",
    gold: "#B8892F",
    goldLight: "#F3D58A",
    paper: PAPER,
    ink: "#3B2A1E",
    muted: "#7D6A58",
  },
  { display: "var(--om-display)", accent: "var(--om-display)", body: "var(--om-body)" },
);
