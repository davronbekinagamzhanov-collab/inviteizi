import localFont from "next/font/local";

import { designVars } from "../types";
const display=localFont({src:[{path:"../../../assets/fonts/google/playfair/Playfair[opsz,wdth,wght].woff2",weight:"300.0 900.0",style:"normal"},{path:"../../../assets/fonts/google/playfair/Playfair-Italic[opsz,wdth,wght].woff2",weight:"300.0 900.0",style:"italic"}],display:"swap",variable:"--ar-display"});
const body=localFont({src:[{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2",weight:"400",style:"normal"}],display:"swap",variable:"--ar-body"});
export const fonts=`${display.variable} ${body.variable}`;
export const vars=designVars({primary:"#864d53",primaryDark:"#653c43",paper:"#fff8f2",ink:"#633e43",muted:"#947b77",gold:"#b18b63",goldLight:"#ead4b4",accent:"#b58c88"},{display:"var(--ar-display)",accent:"var(--ar-display)",body:"var(--ar-body)"});
