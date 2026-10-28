"use client";

import type { TemplateProps } from "../types";
import { useEffect,useRef,useId } from "react";
import { motion,useReducedMotion } from "motion/react";
import { Words,useFitWords } from "../../blocks/FitWords";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { designTexts } from "@/texts/uz-cyrl";
import { fonts,vars } from "./style";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";

const t=designTexts("dasturxon");

/** A morning dasturxon unfolds vertically; a real Chorsu plov photograph on woven linen. */
export default function Design({data,mode,art}:TemplateProps) {
  const inv=useInvitation(data,mode),when=inv.main.when,reduced=useReducedMotion();
  const name=useFitWords<HTMLHeadingElement>(46),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?100:2100);};
  return <InvitationShell inv={inv} style={vars} fontsClassName={fonts} backdropClassName="bg-[#dfd8c8]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <div className="relative overflow-hidden"><Band className="h-8 w-full"/>
      <header className="relative pt-9 text-center"><p className="text-[13px] tracking-[.3em] text-muted uppercase">{t.opening.invitation}</p><p className="mt-4 font-display text-[44px] leading-tight">{t.occasionTitles[inv.occasion]}</p>
        <h1 ref={name} className="mx-auto mt-5 w-[calc(100%-64px)] font-display leading-[1.12] [--fit:46px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1>
        <p className="mx-auto mt-2 max-w-[290px] px-4 text-[18px] text-muted italic">{t.causeLine(data)}</p>
        <div className="relative mt-3 h-[245px]"><PhotoBackdrop src={art??"/art/dasturxon.webp"} color="#faf3e7" fade="both" strength={.6} position="50% 55%" opacity={.95} priority/></div>
        <div className="relative z-10 -mt-3 px-7"><p className="text-[18px]">{t.date.long(when.day,when.monthIndex,when.year)}</p><p className="gold-text mt-2 font-display text-[48px] leading-tight">{t.date.clock(inv.main.time)}</p><p className="mt-2 text-[18px] text-muted">{t.weekdays[when.weekdayIndex]}</p></div>
      </header>
      <main className="px-7 pb-20">
        <Reveal className="mt-10 text-center"><h2 className="font-display text-[28px]">{inv.text.greeting}</h2><p className="mt-4 text-[19px] leading-[1.75]">{inv.text.body}</p></Reveal>
        <Reveal className="mt-12 border-y border-primary/20 py-7 text-center"><h2 className="mb-6 font-display text-[31px]">{t.date.title[inv.occasion]}</h2><Calendar date={when} marker="circle" markerClassName="text-primary" markedDayClassName="text-paper"/></Reveal>
        <Reveal className="mt-10 text-center"><p className="text-[18px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-4 grid grid-cols-4",box:"flex min-w-0 flex-col items-center border-r border-primary/20 px-1 last:border-0",number:"font-display text-[35px] text-ink",label:"text-[13px] whitespace-nowrap text-muted",today:"font-display text-[30px]"}}/></Reveal>
        <section className="mt-14"><Reveal><h2 className="mb-5 font-display text-[34px]">{t.venue.programTitle}</h2></Reveal>{inv.program.map((event,i)=><Reveal key={i} className="grid grid-cols-[5px_minmax(0,1fr)] gap-5 py-5"><div aria-hidden className="bg-[repeating-linear-gradient(180deg,#a76849_0_7px,transparent_7px_12px)]"/><div className="min-w-0"><p className="font-display text-[28px]">{event.title}</p><p className="mt-2 text-[18px]">{t.date.long(event.when.day,event.when.monthIndex,event.when.year)} · {t.date.clock(event.time)}</p><p className="mt-4 text-[20px]">{event.venueName}</p><p className="mt-1 text-[18px] leading-relaxed text-muted">{event.address}</p><MapButton href={event.mapHref} className="mt-4 rounded-none border border-primary/50 px-5 py-3 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
        <Reveal className="mt-12 text-center"><Band className="mb-8 h-6 w-full"/><p className="text-[19px] leading-[1.8] italic">{inv.blessing}</p><p className="mt-9 text-[17px] text-muted">{t.hosts.respectDeep}</p><p className="mt-3 font-display text-[31px] leading-snug">{data.hosts}</p><p className="mt-4 text-[18px]">{t.hosts.waiting}</p></Reveal>
      </main><Band className="h-8 w-full"/>
    </div>
    {!inv.opened&&<button data-open type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className="absolute top-0 left-0 z-40 h-svh min-h-[560px] w-full overflow-hidden bg-[#e8decb]" style={{perspective:1300,backgroundColor:inv.started?"transparent":"#e8decb"}}>
      {[0,1].map(side=><motion.div key={side} initial={false} animate={{rotateX:inv.started?(side?-105:105):0,y:inv.started?(side?90:-90):0}} transition={{duration:reduced?0:1.8,ease:[.22,1,.36,1],delay:side?0.12:0}} className={`absolute inset-x-0 h-1/2 bg-[#f4ead6] ${side?"bottom-0":"top-0"}`} style={{transformOrigin:side?"center bottom":"center top",backfaceVisibility:"hidden",boxShadow:"inset 0 0 35px #c5b79a66"}}><Band className="h-full w-full opacity-70"/></motion.div>)}
      <motion.div animate={{opacity:inv.started?0:1,scale:inv.started?0.86:1}} transition={{duration:.3}} className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 border border-[#aa8b61] bg-[#fff7e8] px-4 py-8 text-center"><p className="text-[14px] tracking-[.25em] text-muted uppercase">{t.opening.invitation}</p><p className="mt-4 font-display text-[39px]">{t.occasionTitles[inv.occasion]}</p><div aria-hidden className="gold-fill mx-auto my-5 h-px w-14"/><p className="text-[17px]">{t.opening.tapToOpen}</p></motion.div>
    </button>}
  </InvitationShell>;
}
function Band({className}:{className:string}){const id=useId();return <svg aria-hidden data-decor viewBox="0 0 420 50" preserveAspectRatio="none" className={className}><defs><pattern id={id} width="60" height="50" patternUnits="userSpaceOnUse"><path d="M0 25 30 0 60 25 30 50Z" fill="none" stroke="#a76849" strokeWidth="1.1"/><path d="M10 25 30 8 50 25 30 42Z" fill="none" stroke="#788b79" strokeWidth="1.3"/><path d="M21 25 30 17 39 25 30 33Z" fill="#b68b56" fillOpacity=".55"/></pattern></defs><rect width="420" height="50" fill={`url(#${id})`}/></svg>;}
