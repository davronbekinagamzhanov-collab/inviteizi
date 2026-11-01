
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

const body = localFont({src:[{path:"../../../assets/fonts/google/alegreyasans/AlegreyaSans-Regular.woff2",weight:"400",style:"normal"},{path:"../../../assets/fonts/google/alegreyasans/AlegreyaSans-Italic.woff2",weight:"400",style:"italic"},{path:"../../../assets/fonts/google/alegreyasans/AlegreyaSans-Medium.woff2",weight:"500",style:"normal"},{path:"../../../assets/fonts/google/alegreyasans/AlegreyaSans-MediumItalic.woff2",weight:"500",style:"italic"},{path:"../../../assets/fonts/google/alegreyasans/AlegreyaSans-Bold.woff2",weight:"700",style:"normal"},{path:"../../../assets/fonts/google/alegreyasans/AlegreyaSans-BoldItalic.woff2",weight:"700",style:"italic"}],display:"swap",variable:"--oo-body"});

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
