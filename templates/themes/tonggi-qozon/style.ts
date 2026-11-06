import localFont from "next/font/local";

import { designVars } from "../types";

const display = localFont({ preload: false,src:[{path:"../../../assets/fonts/google/alegreya/Alegreya[wght].woff2",weight:"400.0 900.0",style:"normal"},{path:"../../../assets/fonts/google/alegreya/Alegreya-Italic[wght].woff2",weight:"400.0 900.0",style:"italic"}],display:"swap",variable:"--tq-display"});

const body = localFont({ preload: false,src:[{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2",weight:"400",style:"normal"},{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Italic.woff2",weight:"400",style:"italic"},{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Bold.woff2",weight:"700",style:"normal"},{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-BoldItalic.woff2",weight:"700",style:"italic"}],display:"swap",variable:"--tq-body"});

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
