import { Cormorant_Garamond, PT_Serif } from "next/font/google";
import { designVars } from "../types";
const display=Cormorant_Garamond({variable:"--ze-display",weight:["500","600"],subsets:["cyrillic","cyrillic-ext"]});
const body=PT_Serif({variable:"--ze-body",weight:["400"],subsets:["cyrillic","cyrillic-ext"]});
export const fonts=`${display.variable} ${body.variable}`;
export const vars=designVars({primary:"#6d573a",primaryDark:"#443420",paper:"#fffaf1",ink:"#433728",muted:"#806e58",gold:"#ae8953",goldLight:"#e9d5a8"},{display:"var(--ze-display)",accent:"var(--ze-display)",body:"var(--ze-body)"});
