import localFont from "next/font/local";
import {designVars} from "../types";
import {looks,type MasterpieceId} from "./model";
const serif=localFont({ preload: false,src:[{path:"../../../assets/fonts/google/cormorantgaramond/CormorantGaramond[wght].woff2",weight:"300 700",style:"normal"},{path:"../../../assets/fonts/google/cormorantgaramond/CormorantGaramond-Italic[wght].woff2",weight:"300 700",style:"italic"}],variable:"--master-display",display:"swap"});
const text=localFont({ preload: false,src:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2",variable:"--master-text",display:"swap"});
export const fonts=`${serif.variable} ${text.variable}`;
export function vars(id:MasterpieceId){const p=looks[id];return designVars({primary:p.ink,primaryDark:p.ink,gold:p.accent,goldLight:p.soft,paper:p.paper,ink:p.ink,muted:p.ink},{display:"var(--master-display)",accent:"var(--master-display)",body:"var(--master-text)"});}
