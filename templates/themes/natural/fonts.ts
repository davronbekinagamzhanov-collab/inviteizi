import localFont from "next/font/local";

/** Строгие заголовки и имена: Cormorant Garamond (ў қ ғ ҳ есть) */
export const serif = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond[wght].woff2",
      style: "normal",
      weight: "300 700",
    },
    {
      path: "../../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond-Italic[wght].woff2",
      style: "italic",
      weight: "300 700",
    },
  ],
  display: "swap",
  variable: "--n-serif",
});

/** Текст для чтения (пожилым гостям тоже): Lora */
export const text = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/Lora-Regular.woff2", style: "normal", weight: "400 700" },
    { path: "../../../assets/fonts/web/Lora-Italic.woff2", style: "italic", weight: "400 700" },
  ],
  display: "swap",
  variable: "--n-text",
});

/** Рукописные акценты: Great Vibes (нет қ ғ ҳ) */
export const script = localFont({
  preload: false,
  src: "../../../assets/fonts/web/google/greatvibes/GreatVibes-Regular.woff2",
  display: "swap",
  variable: "--n-script",
});

/** Запасной рукописный с полным узбекским алфавитом: Bad Script */
export const scriptAlt = localFont({
  preload: false,
  src: "../../../assets/fonts/web/google/badscript/BadScript-Regular.woff2",
  display: "swap",
  variable: "--n-script-alt",
});

export const naturalFonts = `${serif.variable} ${text.variable} ${script.variable} ${scriptAlt.variable}`;
