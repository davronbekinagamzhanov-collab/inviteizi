import localFont from "next/font/local";

/** «Пятно»: текст — Gentium Book Plus (ў қ ғ ҳ есть); имена — Cormorant Garamond капсом из natural/fonts (--n-serif) */
export const gentium = localFont({
  src: [
    { path: "../../../assets/fonts/google/gentiumbookplus/GentiumBookPlus-Regular.woff2", style: "normal", weight: "400" },
    { path: "../../../assets/fonts/google/gentiumbookplus/GentiumBookPlus-Italic.woff2", style: "italic", weight: "400" },
    { path: "../../../assets/fonts/google/gentiumbookplus/GentiumBookPlus-Bold.woff2", style: "normal", weight: "700" },
  ],
  display: "swap",
  variable: "--p-text",
});
