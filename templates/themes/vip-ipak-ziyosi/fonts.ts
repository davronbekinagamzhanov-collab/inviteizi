import localFont from "next/font/local";
const display=localFont({ preload: false,src:[{path:"../../../assets/fonts/google/cormorantgaramond/CormorantGaramond[wght].woff2",weight:"300 700",style:"normal"},{path:"../../../assets/fonts/google/cormorantgaramond/CormorantGaramond-Italic[wght].woff2",weight:"300 700",style:"italic"}],variable:"--silk-display",display:"swap"});
const text=localFont({ preload: false,src:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2",variable:"--silk-text",display:"swap"});
export const fonts=`${display.variable} ${text.variable}`;
