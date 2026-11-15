import localFont from "next/font/local";

import { designVars } from "../types";
const display = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/google/alegreya/Alegreya[wght].woff2", weight: "400.0 900.0", style: "normal" },
  ],
  display: "swap",
  variable: "--ds-display",
});
const body = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/alegreyasans/AlegreyaSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    { path: "../../../assets/fonts/web/google/alegreyasans/AlegreyaSans-Medium.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--ds-body",
});
export const fonts = `${display.variable} ${body.variable}`;
export const vars = designVars(
  {
    primary: "#6b7160",
    primaryDark: "#454f43",
    paper: "#faf3e7",
    ink: "#4b493d",
    muted: "#8a806d",
    gold: "#ae8153",
    goldLight: "#e6c894",
    accent: "#a76849",
  },
  { display: "var(--ds-display)", accent: "var(--ds-display)", body: "var(--ds-body)" },
);
