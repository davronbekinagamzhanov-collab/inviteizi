import localFont from "next/font/local";
const display = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond[wght].woff2",
      weight: "300 700",
      style: "normal",
    },
    {
      path: "../../../assets/fonts/web/google/cormorantgaramond/CormorantGaramond-Italic[wght].woff2",
      weight: "300 700",
      style: "italic",
    },
  ],
  variable: "--occasion-display",
  display: "swap",
});
const body = localFont({
  preload: false,
  src: "../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2",
  variable: "--occasion-body",
  display: "swap",
});
const sturdy = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/libertinusserif/LibertinusSerif-Regular.woff2",
      style: "normal",
      weight: "400",
    },
    {
      path: "../../../assets/fonts/web/google/libertinusserif/LibertinusSerif-Italic.woff2",
      style: "italic",
      weight: "400",
    },
  ],
  variable: "--occasion-sturdy",
  display: "swap",
});
export const fonts = `${display.variable} ${body.variable} ${sturdy.variable}`;
