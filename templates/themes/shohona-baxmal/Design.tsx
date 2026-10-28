"use client";

import type { TemplateProps } from "../types";
import { designVars } from "../types";
import { Cormorant_Garamond,PT_Serif } from "next/font/google";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words,useFitWords } from "../../blocks/FitWords";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { designTexts } from "@/texts/uz-cyrl";

const display=Cormorant_Garamond({variable:"--sb-display",subsets:["cyrillic","cyrillic-ext"],weight:["500","600"],style:["normal","italic"]});
const body=PT_Serif({variable:"--sb-body",subsets:["cyrillic","cyrillic-ext"],weight:["400"]});
const vars=designVars({primary:"#315c4f",primaryDark:"#26483e",gold:"#b39a64",goldLight:"#eadbb6",paper:"#faf5e9",ink:"#344b41",muted:"#798274",accent:"#beae85"},{display:"var(--sb-display)",accent:"var(--sb-display)",body:"var(--sb-body)"});
const t=designTexts("shohona-baxmal");

/** Deep green velvet on the cover, gold-stitched cornerwork and a cream event card below. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),when=inv.main.when,names=useFitWords<HTMLHeadingElement>(57);
  return <InvitationShell inv={inv} style={vars} fontsClassName={`${display.variable} ${body.variable}`} backdropClassName="bg-[#d6ded5]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="relative m-3 overflow-hidden bg-[#31584d] px-7 py-12 text-[#f5ead0]" style={{backgroundImage:"radial-gradient(ellipse at 20% 15%,#72917b55,transparent 60%),repeating-linear-gradient(90deg,transparent 0 2px,#ffffff03 2px 3px)"}}>
      <Stitches/>
      <p className="relative text-center text-[13px] tracking-[.2em] uppercase text-[#e3d2a8]">{t.opening.invitation}</p>
      <h1 ref={names} className="relative mt-10 w-full font-display leading-[1.05] [--fit:57px]"><span className="block text-left text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-5 block text-center text-[29px] italic text-[#e3d2a8]">{t.cover.andWord}</span><span className="block text-right text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1>
      <div aria-hidden className="mx-auto mt-9 h-px w-24 bg-[#c4ad75]"/><p className="relative mt-8 text-center font-display text-[28px]">{t.occasionTitles[inv.occasion]}</p>
      <p className="relative mt-4 text-center text-[19px]">{t.date.long(when.day,when.monthIndex,when.year)}</p><p className="relative mt-3 text-center text-[17px] text-[#e3d2a8]">{t.weekdays[when.weekdayIndex]} · {t.date.at(inv.main.time)}</p>
    </header>
    <main className="px-7 pt-6 pb-16">
      <Reveal className="text-center"><h2 className="font-display text-[29px] italic">{inv.text.greeting}</h2><p className="mt-4 text-[18px] leading-[1.85]">{inv.text.body}</p></Reveal>
      <Reveal className="mt-8 border-y border-gold/35 py-6 text-center"><p className="text-[17px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-4 grid grid-cols-4",box:"flex min-w-0 flex-col items-center",number:"font-display text-[37px] text-primary",label:"mt-1 text-[13px] whitespace-nowrap text-muted",today:"font-display text-[29px]"}}/></Reveal>
      <section className="mt-10"><Reveal><h2 className="mb-7 text-center font-display text-[34px]">{t.venue.programTitle}</h2></Reveal>{inv.program.map((e,i)=><Reveal key={i} className="relative mb-7 border-x border-primary/25 px-5 py-5 text-center"><span aria-hidden className="absolute inset-x-4 top-0 h-px bg-primary/25"/><span aria-hidden className="absolute inset-x-4 bottom-0 h-px bg-primary/25"/><p className="font-display text-[29px]">{e.title}</p><p className="mt-3 text-[17px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-2 font-display text-[32px]">{t.date.clock(e.time)}</p><p className="mt-4 text-[19px]">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-none border-b border-primary/50 pb-2 text-primary" iconClassName="text-primary"/></Reveal>)}</section>
      {inv.sides&&<Reveal className="mt-9 space-y-4 border-y border-primary/20 py-5 text-center text-[17px]"><p><span className="block text-muted">{t.sides.groom}</span>{inv.sides.groom}</p><p><span className="block text-muted">{t.sides.bride}</span>{inv.sides.bride}</p></Reveal>}
      <Reveal className="mt-10 text-center"><p className="font-display text-[28px] italic leading-relaxed">{inv.blessing}</p><p className="mt-8 text-[16px] text-muted">{t.hosts.respectDeep}</p><p className="mt-3 font-display text-[31px] leading-snug">{data.hosts}</p><p className="mt-6 text-[18px]">{t.hosts.waiting}</p></Reveal>
    </main><div aria-hidden className="mx-3 mb-3 h-3 border-y border-[#bcaa7b] bg-[#31584d]"/>
  </InvitationShell>;
}
function Stitches(){return <svg aria-hidden data-decor viewBox="0 0 350 650" preserveAspectRatio="none" className="pointer-events-none absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)]" fill="none" stroke="#c6af78"><rect x="2" y="2" width="346" height="646" strokeWidth=".6"/><rect x="8" y="8" width="334" height="634" strokeDasharray="2 5" strokeWidth=".5"/>{[0,1,2,3].map(i=><g key={i} transform={`translate(${i%2?350:0} ${i>1?650:0}) scale(${i%2?-1:1} ${i>1?-1:1})`}><path d="M15 75V15h60M22 59q5-28 29-27q-5 28-29 27ZM22 22q31-3 40 20q-32 4-40-20Z" strokeWidth=".8"/><path d="M22 59 48 35M23 23l35 18" strokeWidth=".4"/></g>)}</svg>;}
