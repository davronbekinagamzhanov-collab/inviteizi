import localFont from "next/font/local";
import { designVars } from "../types";
const displayFont1f5424fa=localFont({src: [{path: "../../../assets/fonts/google/playfair/Playfair[opsz,wdth,wght].woff2", weight: "400 500", style: "normal"}, {path: "../../../assets/fonts/google/playfair/Playfair-Italic[opsz,wdth,wght].woff2", weight: "400 500", style: "italic"}], display: "swap", preload: false, variable: "--ar-display"});
const bodyFont1f5424fa=localFont({src: [{path: "../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2", weight: "400", style: "normal"}], display: "swap", preload: false, variable: "--ar-body"});
export const fonts=`${displayFont1f5424fa.variable} ${bodyFont1f5424fa.variable}`;
export const vars=designVars({primary:"#864d53",primaryDark:"#653c43",paper:"#fff8f2",ink:"#633e43",muted:"#947b77",gold:"#b18b63",goldLight:"#ead4b4",accent:"#b58c88"},{display:"var(--ar-display)",accent:"var(--ar-display)",body:"var(--ar-body)"});
