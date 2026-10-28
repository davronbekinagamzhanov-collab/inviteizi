import { Playfair, PT_Serif } from "next/font/google";
import { designVars } from "../types";
const display=Playfair({variable:"--ar-display",weight:["400","500"],style:["normal","italic"],subsets:["cyrillic","cyrillic-ext"]});
const body=PT_Serif({variable:"--ar-body",weight:["400"],subsets:["cyrillic","cyrillic-ext"]});
export const fonts=`${display.variable} ${body.variable}`;
export const vars=designVars({primary:"#864d53",primaryDark:"#653c43",paper:"#fff8f2",ink:"#633e43",muted:"#947b77",gold:"#b18b63",goldLight:"#ead4b4",accent:"#b58c88"},{display:"var(--ar-display)",accent:"var(--ar-display)",body:"var(--ar-body)"});
