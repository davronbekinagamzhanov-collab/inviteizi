"use client";

import type { TemplateProps } from "../types";
import { Words,useFitWords } from "../../blocks/FitWords";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { designTexts } from "@/texts/uz-cyrl";
import { fonts,vars } from "./style";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";

const t=designTexts("atirgul");

/** A botanical letter: real pink roses, a pearl-paper veil and a hand-drawn rose stem. */
export default function Design({data,mode,art}:TemplateProps) {
  const inv=useInvitation(data,mode,{opening:false}),when=inv.main.when;
  const names=useFitWords<HTMLHeadingElement>(48);
  return <InvitationShell inv={inv} style={vars} fontsClassName={fonts} backdropClassName="bg-[#eaded7]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <main className="px-7 pt-10 pb-16">
      <header className="relative text-center"><Sprig className="mx-auto mb-4 h-14 w-28"/>
        <p className="text-[12px] tracking-[.24em] text-muted uppercase">{t.occasionTitles[inv.occasion]}</p>
        <h1 ref={names} className="relative z-10 mt-7 w-full font-display font-normal leading-[1.13] [--fit:48px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="gold-text my-2 block text-[28px] italic">{t.cover.andWord}</span><span className="block text-[length:var(--fit)] italic"><Words text={data.bride??""}/></span></h1>
        <div className="relative -mx-7 mt-1 h-[235px] overflow-hidden"><PhotoBackdrop src={art??"/art/atirgul.webp"} color="#fff8f2" fade="both" strength={.6} position="50% 43%" opacity={.86} priority/></div>
        <p className="relative z-10 -mt-1 font-display text-[24px]">{t.date.long(when.day,when.monthIndex,when.year)}</p><p className="mt-2 text-[17px] text-muted">{t.weekdays[when.weekdayIndex]} · {t.date.at(inv.main.time)}</p>
      </header>
      <Reveal className="mt-9 text-center"><h2 className="font-display text-[25px] italic">{inv.text.greeting}</h2><p className="mt-4 text-[17px] leading-[1.85]">{inv.text.body}</p></Reveal>
      <Reveal className="my-8 border-y border-gold/25 py-5 text-center"><p className="text-[16px] italic text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-3 grid grid-cols-4",box:"flex min-w-0 flex-col items-center px-1",number:"font-display text-[30px] text-primary",label:"mt-1 text-[12px] whitespace-nowrap text-muted",today:"font-display text-[27px] italic"}}/></Reveal>
      <section>{inv.program.map((event,i)=><Reveal key={i} className="relative border-b border-gold/25 py-6 last:border-0">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-5"><p className="border-r border-gold/30 pr-5 font-display text-[26px] italic">{t.date.clock(event.time)}</p><div className="min-w-0"><h3 className="font-display text-[24px]">{event.title}</h3>{event.date!==inv.main.date&&<p className="mt-1 text-[16px] text-muted">{t.date.long(event.when.day,event.when.monthIndex,event.when.year)}</p>}<p className="mt-3 text-[18px]">{event.venueName}</p><p className="mt-1 text-[16px] leading-relaxed text-muted">{event.address}</p><MapButton href={event.mapHref} className="mt-4 rounded-full border border-primary/30 px-4 py-2 text-primary" iconClassName="text-primary"/></div></div>
      </Reveal>)}</section>
      {inv.sides&&<Reveal className="mt-7 grid grid-cols-2 gap-5 text-center text-[16px] leading-relaxed"><div><p className="mb-2 text-muted">{t.sides.groom}</p>{inv.sides.groom}</div><div><p className="mb-2 text-muted">{t.sides.bride}</p>{inv.sides.bride}</div></Reveal>}
      <Reveal className="mt-10 text-center"><Sprig className="mx-auto h-12 w-24"/><p className="mt-5 text-[17px] leading-relaxed italic">{inv.blessing}</p><p className="mt-8 text-[16px] text-muted">{t.hosts.respectDeep}</p><p className="mt-3 font-display text-[28px] leading-snug">{data.hosts}</p></Reveal>
    </main>
  </InvitationShell>;
}
function Sprig({className}:{className:string}){return <svg viewBox="0 0 120 65" aria-hidden data-decor className={className} fill="none" stroke="#ac8c74" strokeWidth=".8"><path d="M8 59Q43 51 61 15Q72 45 112 58M61 18v39M35 45Q21 20 45 33Q52 39 35 45M83 44Q100 18 75 32Q67 40 83 44M61 31Q40 21 49 10Q60 2 62 14Q72 0 80 12Q85 26 61 31Z"/><path d="M57 20q5-11 13-3q3 8-8 9q-8-5-2-11"/><path d="M32 47 23 39M85 46l11-11"/></svg>;}
