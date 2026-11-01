"use client";
import localFont from "next/font/local";

import type { TemplateProps } from "../types";
import { designVars } from "../types";

import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words,useFitWords } from "../../blocks/FitWords";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { designTexts } from "@/texts/uz-cyrl";

const display=localFont({src:[{path:"../../../assets/fonts/google/bitter/Bitter[wght].woff2",weight:"100.0 900.0",style:"normal"},{path:"../../../assets/fonts/google/bitter/Bitter-Italic[wght].woff2",weight:"100.0 900.0",style:"italic"}],display:"swap",variable:"--pg-display"});
const body=localFont({src:[{path:"../../../assets/fonts/google/sourcesans3/SourceSans3[wght].woff2",weight:"200.0 900.0",style:"normal"}],display:"swap",variable:"--pg-body"});
const vars=designVars({primary:"#63785d",primaryDark:"#43553e",gold:"#a99c70",goldLight:"#e1d8b9",paper:"#f9f8ee",ink:"#464e3e",muted:"#7b806e",accent:"#a4b498"},{display:"var(--pg-display)",accent:"var(--pg-display)",body:"var(--pg-body)"});
const t=designTexts("paxta-gul");

/** Botanical cotton on an open linen sheet, a split date and softly arched program cards. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),when=inv.main.when,name=useFitWords<HTMLHeadingElement>(43);
  return <InvitationShell inv={inv} style={vars} fontsClassName={`${display.variable} ${body.variable}`} backdropClassName="bg-[#e2e6d9]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="relative px-7 pt-9 pb-7 text-center"><p className="text-[14px] tracking-[.23em] text-muted uppercase">{t.opening.invitation}</p><Cotton className="mx-auto mt-3 h-[175px] w-[260px] max-w-full"/>
      <p className="font-display text-[31px]">{t.occasionTitles[inv.occasion]}</p><h1 ref={name} className="mt-4 w-full font-display leading-tight [--fit:43px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1><p className="mx-auto mt-3 max-w-[295px] text-[20px] leading-snug italic text-muted">{t.causeLine(data)}</p>
      <div className="mx-auto mt-7 flex w-fit max-w-full items-center gap-5 border-y border-primary/25 py-3"><p className="font-display text-[62px] leading-none">{when.day}</p><div className="text-left text-[19px]"><p>{t.months[when.monthIndex]} {when.year}</p><p className="mt-1 text-muted">{t.weekdays[when.weekdayIndex]}</p><p className="mt-1">{t.date.at(inv.main.time)}</p></div></div>
    </header>
    <main className="px-7 pb-16">
      <Reveal className="text-center"><h2 className="font-display text-[26px] italic">{inv.text.greeting}</h2><p className="mt-4 text-[21px] leading-[1.6]">{inv.text.body}</p></Reveal>
      <Reveal className="my-8 text-center"><p className="text-[19px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-4 grid grid-cols-4",box:"flex min-w-0 flex-col items-center border-r border-primary/20 last:border-0",number:"font-display text-[30px] text-primary",label:"mt-1 text-[14px] whitespace-nowrap text-muted",today:"font-display text-[28px]"}}/></Reveal>
      <section><Reveal><h2 className="mb-6 text-center font-display text-[29px]">{t.venue.programTitle}</h2></Reveal>{inv.program.map((e,i)=><Reveal key={i} className="mb-6 rounded-t-[55px] border border-primary/25 bg-white/40 px-5 pt-8 pb-6 text-center"><p className="font-display text-[29px]">{t.date.clock(e.time)}</p><h3 className="mt-3 font-display text-[23px]">{e.title}</h3><p className="mt-2 text-[18px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><div aria-hidden className="mx-auto my-4 h-px w-12 bg-primary/30"/><p className="text-[22px]">{e.venueName}</p><p className="mt-2 text-[20px] leading-snug text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-full border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/></Reveal>)}</section>
      <Reveal className="mt-10 text-center"><Cotton className="mx-auto mb-4 h-20 w-32"/><p className="text-[21px] leading-[1.6] italic">{inv.blessing}</p><p className="mt-8 text-[18px] text-muted">{t.hosts.respectDeep}</p><p className="mt-3 font-display text-[28px] leading-snug">{data.hosts}</p><p className="mt-4 text-[20px]">{t.hosts.waiting}</p></Reveal>
    </main>
  </InvitationShell>;
}
function Cotton({className}:{className:string}){return <svg aria-hidden data-decor viewBox="0 -15 260 190" className={className} fill="none"><path d="M55 164Q115 92 200 24M106 112Q103 67 78 45M142 79Q180 97 213 76M89 130Q63 110 36 111" stroke="#8b9576" strokeWidth="2"/>{[[196,27,-15],[78,45,-35],[213,76,65],[36,111,-60]].map(([x,y,r],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${r})`}><path d="M-22 4Q-15 32 0 25Q15 32 22 4Q8 13 0 10Q-8 13-22 4Z" fill="#ac9271" fillOpacity=".65"/><path d="M-17 10C-40-4-17-30-5-17C5-40 32-18 17-4C38 8 13 29 1 18C-11 33-31 21-17 10Z" fill="#fffef8" stroke="#c7c8af" strokeWidth="1.2"/><path d="M-5-17Q-1-1 1 18M17-4Q4 0 1 18M-17 10Q-6 6 1 18" stroke="#dedfcc"/></g>)}<path d="M118 100Q130 119 143 105Q136 91 118 100M168 55Q150 35 146 56Q153 65 168 55M98 121Q119 132 115 148Q94 144 98 121" fill="#8d9c7a" fillOpacity=".55"/></svg>;}
