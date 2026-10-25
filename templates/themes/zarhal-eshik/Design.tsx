"use client";

import type { TemplateProps } from "../types";
import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Words,useFitWords } from "../../blocks/FitWords";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { designTexts } from "@/texts/uz-cyrl";
import { fonts,vars } from "./style";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";

const t=designTexts("zarhal-eshik");

/** Carved double doors and an ivory ogive folio, with an engraved calendar and time journal. */
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode),reduced=useReducedMotion();
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const names=useFitWords<HTMLHeadingElement>(56),when=inv.main.when;
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?100:1900);};
  return <InvitationShell inv={inv} style={vars} fontsClassName={fonts} backdropClassName="bg-[#ece2d3]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="relative flex min-h-[720px] flex-col items-center justify-center px-12 py-20 text-center">
      <Arch className="pointer-events-none absolute inset-4 h-[calc(100%-32px)] w-[calc(100%-32px)]"/>
      <p className="text-[13px] tracking-[.2em] text-muted uppercase">{t.occasionTitles[inv.occasion]}</p>
      <div aria-hidden className="gold-fill my-8 h-10 w-px"/>
      <h1 ref={names} className="w-full font-display font-medium leading-[1.02] [--fit:56px]">
        <span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span>
        <span className="gold-text my-3 block text-[30px] italic">{t.cover.andWord}</span>
        <span className="block text-[length:var(--fit)]"><Words text={data.bride??""}/></span>
      </h1>
      <div className="mt-9 flex items-center gap-4 font-display">
        <span className="text-[60px] leading-none">{when.day}</span>
        <span className="border-l border-gold/40 pl-4 text-left text-[19px] leading-snug">{t.months[when.monthIndex]}<br/>{when.year}</span>
      </div>
      <p className="mt-4 text-[17px] text-muted">{t.weekdays[when.weekdayIndex]} · {t.date.at(inv.main.time)}</p>
      <p className="mt-10 max-w-[250px] text-[18px] leading-relaxed italic">{inv.text.greeting}</p>
    </header>
    <main className="px-7 pb-20">
      <Reveal><p className="text-center text-[18px] leading-[1.9]">{inv.text.body}</p></Reveal>
      <Reveal className="my-14 border-y border-gold/25 py-8 text-center"><h2 className="mb-5 font-display text-[32px]">{t.date.title[inv.occasion]}</h2><Calendar date={when} marker="star"/></Reveal>
      <Reveal className="text-center"><h2 className="font-display text-[30px]">{t.countdown.title[inv.occasion]}</h2><Countdown startsAt={when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-2",box:"flex min-w-0 flex-col items-center border-b border-gold/40 py-3",number:"font-display text-[34px] text-ink",label:"mt-2 text-[12px] whitespace-nowrap text-muted",today:"font-display text-[30px]"}}/></Reveal>
      <section className="mt-16"><Reveal><h2 className="mb-8 text-center font-display text-[34px]">{t.venue.programTitle}</h2></Reveal>
        {inv.program.map((event,i)=><Reveal key={i} className="relative border-l border-gold/40 py-5 pl-6">
          <span aria-hidden className="gold-fill absolute top-8 -left-[4px] h-[7px] w-[7px] rotate-45"/>
          <p className="font-display text-[30px]">{t.date.clock(event.time)}</p><p className="text-[16px] text-muted">{t.date.long(event.when.day,event.when.monthIndex,event.when.year)}</p>
          <h3 className="mt-3 text-[19px]">{event.title}</h3><p className="mt-1 text-[17px]">{event.venueName}</p><p className="mt-2 text-[16px] leading-relaxed text-muted">{event.address}</p>
          <MapButton href={event.mapHref} className="mt-4 border-b border-gold/60 pb-2 text-primary" iconClassName="text-primary"/>
        </Reveal>)}
      </section>
      {inv.sides&&<Reveal className="mt-12 grid grid-cols-2 gap-5 border-y border-gold/25 py-6 text-center text-[16px] leading-relaxed"><div><p className="text-muted">{t.sides.groom}</p>{inv.sides.groom}</div><div><p className="text-muted">{t.sides.bride}</p>{inv.sides.bride}</div></Reveal>}
      <Reveal className="mt-14 text-center"><p className="font-display text-[30px]">{t.blessing.title}</p><p className="mt-5 text-[18px] leading-[1.9] italic">{inv.blessing}</p><div aria-hidden className="gold-fill mx-auto my-8 h-px w-16"/><p className="text-[16px] text-muted">{t.hosts.respectDeep}</p><p className="mt-3 font-display text-[29px] leading-snug">{data.hosts}</p></Reveal>
    </main>
    {!inv.opened&&<button type="button" data-open onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className="absolute top-0 left-0 z-40 h-svh min-h-[560px] w-full overflow-hidden bg-[#e9dfcd] text-center" style={{perspective:1200,backgroundColor:inv.started?"transparent":"#e9dfcd"}}>
      {[0,1].map(side=><motion.div key={side} initial={false} animate={{rotateY:inv.started?(side?106:-106):0}} transition={{duration:reduced?0:1.7,ease:[.22,1,.36,1],delay:side?0.12:0}} className={`absolute top-0 h-full w-1/2 border border-[#bd9a64]/50 ${side?"right-0":"left-0"}`} style={{transformOrigin:side?"right center":"left center",background:"linear-gradient(100deg,#e1c99b,#fff3d4 45%,#d7b780)",backfaceVisibility:"hidden"}}>
        <div className="absolute inset-4 border border-[#98784c]/50"><Arch className="h-full w-full"/><div className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full border-[5px] border-[#b18b4d] shadow-[inset_0_1px_2px_#fff5d9,0_2px_3px_#876f41]"/></div>
      </motion.div>)}
      <motion.div animate={{opacity:inv.started?0:1}} transition={{duration:.25}} className="pointer-events-none absolute inset-x-6 top-[16%] text-[#5d472e]"><p className="text-[14px] tracking-[.28em] uppercase">{t.opening.invitation}</p><p className="mt-5 font-display text-[40px]">{t.occasionTitles[inv.occasion]}</p></motion.div>
      {!inv.started&&<p className="absolute inset-x-0 bottom-[12%] text-[16px] text-[#5d472e]">{t.opening.tapToOpen}</p>}
    </button>}
  </InvitationShell>;
}
function Arch({className}:{className:string}) {
  const id=useId();
  return <svg aria-hidden data-decor viewBox="0 0 320 700" preserveAspectRatio="none" className={className} fill="none"><defs><linearGradient id={id} x2="1" y2="1"><stop stopColor="#80613a"/><stop offset=".45" stopColor="#d7ba83"/><stop offset="1" stopColor="#987241"/></linearGradient></defs><g stroke={`url(#${id})`} strokeWidth="1"><path d="M12 685V145Q12 65 160 12Q308 65 308 145V685Z"/><path d="M24 672V150Q24 78 160 27Q296 78 296 150V672Z"/><path d="M12 145Q80 130 160 45Q240 130 308 145M24 644H296"/><path d="M160 70l12 16-12 16-12-16Z"/>{[0,1,2,3,4].map(i=><g key={i} transform={`translate(0 ${i*95+170})`}><path d="M17 0q22 10 0 28q22 10 0 28M303 0q-22 10 0 28q-22 10 0 28"/></g>)}</g></svg>;
}
