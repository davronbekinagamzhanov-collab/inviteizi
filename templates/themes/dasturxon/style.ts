import { Alegreya, Alegreya_Sans } from "next/font/google";
import { designVars } from "../types";
const display=Alegreya({variable:"--ds-display",weight:["500","600"],subsets:["cyrillic","cyrillic-ext"]});
const body=Alegreya_Sans({variable:"--ds-body",weight:["400","500"],subsets:["cyrillic","cyrillic-ext"]});
export const fonts=`${display.variable} ${body.variable}`;
export const vars=designVars({primary:"#6b7160",primaryDark:"#454f43",paper:"#faf3e7",ink:"#4b493d",muted:"#8a806d",gold:"#ae8153",goldLight:"#e6c894",accent:"#a76849"},{display:"var(--ds-display)",accent:"var(--ds-display)",body:"var(--ds-body)"});
