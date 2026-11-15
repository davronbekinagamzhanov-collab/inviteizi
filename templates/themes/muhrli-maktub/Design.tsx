"use client";
/** «Муҳрли мактуб»: blush paper folio opens sideways into a blossom wedding garden. */
import {parseWeddingDate} from "@/lib/wedding-date";
import {designVars,type TemplateProps} from "../types";
import {t} from "@/texts/uz-cyrl";
import {CardText,FloralInvitation} from "../floral/kit";
import {WeddingOpening} from "../nikoh-envelope/Opening";
import {melody} from "../muhr/melody";
import s from "./muhrli-maktub.module.css";
const vars={...designVars({primary:"#a7836f",primaryDark:"#4b3b3a",gold:"#a7836f",goldLight:"#efe1d8",paper:"#fbf6f3",ink:"#4b3b3a",muted:"#8b7771"}),"--f-paper":"#fbf6f3","--f-ink":"#4b3b3a","--f-line":"#a7836f","--f-card":"#fffdfb","--n-paper":"#fbf6f3","--n-ink":"#4b3b3a","--n-accent":"#a7836f"} as React.CSSProperties;
export default function MuhrliMaktub({data,mode}:TemplateProps){
 const e=data.events[0],w=e?parseWeddingDate(e.date,e.time):null;
 const date=w?t.date.short(w.day,w.monthIndex,w.year):"";
 return <FloralInvitation data={data} mode={mode} cfg={{melody,opening:"custom",overlayMs:1750,vars,pageColor:"#fbf6f3",backdrop:"bg-[#efe3dc]",music:"bg-[#fbf6f3]/75 text-[#4b3b3a] ring-[#a7836f]/35",rsvp:{paper:"#fffdfb",ink:"#4b3b3a",line:"#e6d3c8",soft:"#f6ebe5",accent:"#8e4f45",font:"var(--n-text)",radius:"18px",buttonRadius:"999px"},assets:[],heart:true,look:s,
 hero:(_on,inv)=><><div className={s.garden}>{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/art/nikoh-envelope/maktub-garden.webp" alt="" fetchPriority="high"/></div><div className={s.card}><CardText data={data} inv={inv} monogram={false}/></div></>,
 overlay:(start,started)=><WeddingOpening kind="maktub" data={data} date={date} started={started} onOpen={start}/>,
 finale:<div className={s.gardenFinal}>{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/art/nikoh-envelope/maktub-garden.webp" alt="" loading="lazy"/></div>
 }}/>;
}
