import localFont from "next/font/local";
import { designVars } from "../types";
const displayFontd880a14d=localFont({src: [{path: "../../../assets/fonts/google/alegreya/Alegreya[wght].woff2", weight: "500 600", style: "normal"}], display: "swap", preload: false, variable: "--ds-display"});
const bodyFontd880a14d=localFont({src: [{path: "../../../assets/fonts/google/alegreyasans/AlegreyaSans-Regular.woff2", weight: "400", style: "normal"}, {path: "../../../assets/fonts/google/alegreyasans/AlegreyaSans-Medium.woff2", weight: "500", style: "normal"}], display: "swap", preload: false, variable: "--ds-body"});
export const fonts=`${displayFontd880a14d.variable} ${bodyFontd880a14d.variable}`;
export const vars=designVars({primary:"#6b7160",primaryDark:"#454f43",paper:"#faf3e7",ink:"#4b493d",muted:"#8a806d",gold:"#ae8153",goldLight:"#e6c894",accent:"#a76849"},{display:"var(--ds-display)",accent:"var(--ds-display)",body:"var(--ds-body)"});
