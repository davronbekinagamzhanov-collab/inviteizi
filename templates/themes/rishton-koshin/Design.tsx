"use client";

import type { TemplateProps } from "../types";
import { Words,useFitWords } from "../../blocks/FitWords";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { designTexts } from "@/texts/uz-cyrl";
import { fonts,vars } from "./style";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";

const t=designTexts("rishton-koshin");

/** Glazed tulip tiles, a circular date seal and a compact porcelain-ink program. */
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode,{opening:false}),when=inv.main.when;
  const names=useFitWords<HTMLHeadingElement>(48);
  return <InvitationShell inv={inv} style={vars} fontsClassName={fonts} backdropClassName="bg-[#e2e8df]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <main className="p-3"><div className="relative border border-[#7aa1a0]/45 px-5 pt-12 pb-10">
      <div aria-hidden data-decor className="absolute inset-x-0 top-0 flex justify-around overflow-hidden border-b border-[#7aa1a0]/30 bg-[#e7efdf]">{[0,1,2,3,4,5].map(i=><Tile key={i}/>)}</div>
      <header className="pt-6 text-center"><p className="text-[12px] tracking-[.23em] text-primary uppercase">{t.occasionTitles[inv.occasion]}</p>
        <svg aria-hidden viewBox="0 0 120 36" className="mx-auto mt-5 h-9 w-32" fill="none" stroke="currentColor"><path d="M8 28Q35 28 60 8Q85 28 112 28M60 8v24M44 26q-10-24 16-18q26-6 16 18"/></svg>
        <h1 ref={names} className="mt-5 w-full font-display leading-[1.08] [--fit:48px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-1 block text-[25px] italic text-primary">{t.cover.andWord}</span><span className="block text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1>
        <div className="mx-auto mt-7 flex w-fit items-center gap-5"><span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-primary/60 font-display text-[46px]">{when.day}</span><p className="text-left text-[18px] leading-snug">{t.months[when.monthIndex]} {when.year}<br/><span className="text-[16px] text-muted">{t.weekdays[when.weekdayIndex]}</span><br/>{t.date.at(inv.main.time)}</p></div>
      </header>
      <Reveal className="mt-7 text-center"><p className="font-display text-[23px]">{inv.text.greeting}</p><p className="mt-3 text-[17px] leading-[1.8]">{inv.text.body}</p></Reveal>
      <Reveal className="my-7 border-y border-primary/20 py-5 text-center"><p className="text-[16px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-3 grid grid-cols-4",box:"flex min-w-0 flex-col items-center border-r border-primary/20 px-1 last:border-0",number:"font-display text-[30px] text-primary",label:"text-[12px] whitespace-nowrap text-muted",today:"font-display text-[27px]"}}/></Reveal>
      <section><Reveal><h2 className="mb-2 font-display text-[28px] text-primary">{t.venue.programTitle}</h2></Reveal>{inv.program.map((event,i)=><Reveal key={i} className="grid grid-cols-[58px_minmax(0,1fr)] gap-4 border-b border-primary/20 py-5 last:border-0"><p className="font-display text-[24px]">{t.date.clock(event.time)}</p><div className="min-w-0"><h3 className="text-[18px]">{event.title}</h3>{event.date!==inv.main.date&&<p className="mt-1 text-[16px] text-muted">{t.date.long(event.when.day,event.when.monthIndex,event.when.year)}</p>}<p className="mt-2 text-[17px]">{event.venueName}</p><p className="mt-1 text-[16px] leading-relaxed text-muted">{event.address}</p><MapButton href={event.mapHref} className="mt-4 border-b border-primary/50 pb-1 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
      {inv.sides&&<Reveal className="mt-7 space-y-4 border-t border-primary/20 pt-5 text-center text-[16px]"><div><p className="text-muted">{t.sides.groom}</p>{inv.sides.groom}</div><div><p className="text-muted">{t.sides.bride}</p>{inv.sides.bride}</div></Reveal>}
      <Reveal className="mt-8 text-center"><p className="text-[17px] leading-[1.8] italic">{inv.blessing}</p><p className="mt-7 text-[16px] text-muted">{t.hosts.respectDeep}</p><p className="mt-2 font-display text-[27px] leading-snug">{data.hosts}</p></Reveal>
    </div><div aria-hidden data-decor className="flex justify-around overflow-hidden border-x border-b border-[#7aa1a0]/45 bg-[#e7efdf]">{[0,1,2,3,4,5].map(i=><Tile key={i}/>)}</div></main>
  </InvitationShell>;
}
function Tile(){return <svg viewBox="0 0 56 56" className="h-12 w-12 shrink-0" fill="none"><path d="M28 2 54 28 28 54 2 28Z" stroke="#306f75" strokeWidth=".7"/><path d="M28 8c-1 10-15 9-14 18c1 6 10 4 14 12c4-8 13-6 14-12C43 17 29 18 28 8Z" fill="#306f75" fillOpacity=".78"/><path d="M28 15v31M28 36Q8 28 12 42Q20 49 28 36M28 36Q48 28 44 42Q36 49 28 36" stroke="#648d76" strokeWidth="1.2"/><circle cx="28" cy="28" r="3" fill="#fbf8ee"/></svg>;}
