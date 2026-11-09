import localFont from "next/font/local";
const display=localFont({ preload: false,src:[{path:"../../../assets/fonts/google/libertinusserif/LibertinusSerif-Regular.woff2",style:"normal",weight:"400"},{path:"../../../assets/fonts/google/libertinusserif/LibertinusSerif-Italic.woff2",style:"italic",weight:"400"}],variable:"--grand-display",display:"swap"});
const text=localFont({ preload: false,src:"../../../assets/fonts/google/ptsans/PT_Sans-Web-Regular.woff2",variable:"--grand-text",display:"swap"});
export const fonts=`${display.variable} ${text.variable}`;
