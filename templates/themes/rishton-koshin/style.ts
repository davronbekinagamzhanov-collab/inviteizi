import { Podkova, PT_Serif } from "next/font/google";
import { designVars } from "../types";
const display=Podkova({variable:"--rk-display",weight:["400","500"],subsets:["cyrillic","cyrillic-ext"]});
const body=PT_Serif({variable:"--rk-body",weight:["400"],subsets:["cyrillic","cyrillic-ext"]});
export const fonts=`${display.variable} ${body.variable}`;
export const vars=designVars({primary:"#306f75",primaryDark:"#205259",paper:"#fbf8ee",ink:"#284b4b",muted:"#6d7e74",gold:"#af8a50",goldLight:"#e4ce9e",accent:"#8cae9c"},{display:"var(--rk-display)",accent:"var(--rk-display)",body:"var(--rk-body)"});
