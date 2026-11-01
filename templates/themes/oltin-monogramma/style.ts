import localFont from "next/font/local";

import { designVars } from "../types";

// cyrillic-ext — в нём ў қ ғ ҳ
const display = localFont({src:[{path:"../../../assets/fonts/google/cormorantgaramond/CormorantGaramond[wght].woff2",weight:"300.0 700.0",style:"normal"},{path:"../../../assets/fonts/google/cormorantgaramond/CormorantGaramond-Italic[wght].woff2",weight:"300.0 700.0",style:"italic"}],display:"swap",variable:"--om-display"});

const body = localFont({src:[{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2",weight:"400",style:"normal"},{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Italic.woff2",weight:"400",style:"italic"},{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Bold.woff2",weight:"700",style:"normal"},{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-BoldItalic.woff2",weight:"700",style:"italic"}],display:"swap",variable:"--om-body"});

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
