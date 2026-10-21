import { Alegreya_SC, Kurale, Viaoda_Libre } from "next/font/google";

// Шрифты «Ўрамы». Все с cyrillic-ext: ў қ ғ ҳ
export const uramaDisplay = Viaoda_Libre({
  variable: "--f-urama-display",
  weight: "400",
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

// Каллиграфичный текст, как в старых рукописях
export const uramaBody = Kurale({
  variable: "--f-urama-body",
  weight: "400",
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

export const uramaAccent = Alegreya_SC({
  variable: "--f-urama-accent",
  weight: ["400", "700"],
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

export const uramaFontVars = `${uramaDisplay.variable} ${uramaBody.variable} ${uramaAccent.variable}`;
