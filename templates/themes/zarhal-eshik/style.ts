import localFont from "next/font/local";

import { designVars } from "../types";
const display=localFont({ preload: false,src:[{path:"../../../assets/fonts/google/cormorantgaramond/CormorantGaramond[wght].woff2",weight:"300.0 700.0",style:"normal"}],display:"swap",variable:"--ze-display"});
const body=localFont({ preload: false,src:[{path:"../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2",weight:"400",style:"normal"}],display:"swap",variable:"--ze-body"});
export const fonts=`${display.variable} ${body.variable}`;
export const vars=designVars({primary:"#6d573a",primaryDark:"#443420",paper:"#fffaf1",ink:"#433728",muted:"#806e58",gold:"#ae8953",goldLight:"#e9d5a8"},{display:"var(--ze-display)",accent:"var(--ze-display)",body:"var(--ze-body)"});
