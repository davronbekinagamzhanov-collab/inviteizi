import localFont from "next/font/local";

/**
 * Шрифты батча 3 (все с ў қ ғ ҳ). Каждая структура берёт свою пару — так дизайны разных
 * структур не похожи даже шрифтом. Браузер качает только те, что реально использованы на странице.
 */

/** S1 «Фото-ҳикоя»: контрастный Playfair поверх фото */
export const playfair = localFont({
  src: [
    { path: "../../../assets/fonts/google/playfair/Playfair[opsz,wdth,wght].woff2", style: "normal", weight: "300 900" },
    { path: "../../../assets/fonts/google/playfair/Playfair-Italic[opsz,wdth,wght].woff2", style: "italic", weight: "300 900" },
  ],
  display: "swap",
  variable: "--b-playfair",
});

/** S2 «Варақ», S6 «Китоб»: книжный EB Garamond */
export const garamond = localFont({
  src: [
    { path: "../../../assets/fonts/google/ebgaramond/EBGaramond[wght].woff2", style: "normal", weight: "400 800" },
    { path: "../../../assets/fonts/google/ebgaramond/EBGaramond-Italic[wght].woff2", style: "italic", weight: "400 800" },
  ],
  display: "swap",
  variable: "--b-garamond",
});

/** S3 «Мактуб»: крупный и плотный Vollkorn — читается без очков */
export const vollkorn = localFont({
  src: [
    { path: "../../../assets/fonts/google/vollkorn/Vollkorn[wght].woff2", style: "normal", weight: "400 900" },
    { path: "../../../assets/fonts/google/vollkorn/Vollkorn-Italic[wght].woff2", style: "italic", weight: "400 900" },
  ],
  display: "swap",
  variable: "--b-vollkorn",
});

/** S4 «Дарвоза»: Alegreya — каллиграфичный, но прямой */
export const alegreya = localFont({
  src: [
    { path: "../../../assets/fonts/google/alegreya/Alegreya[wght].woff2", style: "normal", weight: "400 900" },
    { path: "../../../assets/fonts/google/alegreya/Alegreya-Italic[wght].woff2", style: "italic", weight: "400 900" },
  ],
  display: "swap",
  variable: "--b-alegreya",
});

/** S5 «Альбом»: Piazzolla */
export const piazzolla = localFont({
  src: [
    { path: "../../../assets/fonts/google/piazzolla/Piazzolla[opsz,wght].woff2", style: "normal", weight: "300 800" },
    { path: "../../../assets/fonts/google/piazzolla/Piazzolla-Italic[opsz,wght].woff2", style: "italic", weight: "300 800" },
  ],
  display: "swap",
  variable: "--b-piazzolla",
});

/** S7 «Медальон»: Cormorant Unicase для подписей-капителей */
export const unicase = localFont({
  src: [
    { path: "../../../assets/fonts/google/cormorantunicase/CormorantUnicase-Regular.woff2", style: "normal", weight: "400" },
    { path: "../../../assets/fonts/google/cormorantunicase/CormorantUnicase-SemiBold.woff2", style: "normal", weight: "600" },
  ],
  display: "swap",
  variable: "--b-unicase",
});

export const b3Fonts = [playfair, garamond, vollkorn, alegreya, piazzolla, unicase].map((f) => f.variable).join(" ");
