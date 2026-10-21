import { Forum, Lora, Prata } from "next/font/google";

// Шрифты «Парды». Все с cyrillic-ext: ў қ ғ ҳ
export const pardaDisplay = Prata({
  variable: "--f-parda-display",
  weight: "400",
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

// Заглавные «как на театральной афише»
export const pardaAccent = Forum({
  variable: "--f-parda-accent",
  weight: "400",
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

export const pardaBody = Lora({
  variable: "--f-parda-body",
  style: ["normal", "italic"],
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
});

export const pardaFontVars = `${pardaDisplay.variable} ${pardaAccent.variable} ${pardaBody.variable}`;
