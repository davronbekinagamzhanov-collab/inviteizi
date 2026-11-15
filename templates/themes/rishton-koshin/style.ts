import localFont from "next/font/local";

import { designVars } from "../types";
const display = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/google/podkova/Podkova[wght].woff2", weight: "400.0 800.0", style: "normal" },
  ],
  display: "swap",
  variable: "--rk-display",
});
const body = localFont({
  preload: false,
  src: [{ path: "../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  variable: "--rk-body",
});
export const fonts = `${display.variable} ${body.variable}`;
export const vars = designVars(
  {
    primary: "#306f75",
    primaryDark: "#205259",
    paper: "#fbf8ee",
    ink: "#284b4b",
    muted: "#6d7e74",
    gold: "#af8a50",
    goldLight: "#e4ce9e",
    accent: "#8cae9c",
  },
  { display: "var(--rk-display)", accent: "var(--rk-display)", body: "var(--rk-body)" },
);
