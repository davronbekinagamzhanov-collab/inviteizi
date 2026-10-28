"use client";

import type { TemplateProps } from "../types";
import { designVars } from "../types";
import { useEffect,useId,useRef } from "react";
import { motion,useReducedMotion } from "motion/react";
import { PT_Sans } from "next/font/google";
import localFont from "next/font/local";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words,useFitWords } from "../../blocks/FitWords";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { designTexts } from "@/texts/uz-cyrl";

const display=localFont({variable:"--at-display",src:[{path:"../../../assets/fonts/Lora-Regular.ttf",weight:"400 700",style:"normal"},{path:"../../../assets/fonts/Lora-Italic.ttf",weight:"400 700",style:"italic"}]});
const body=PT_Sans({variable:"--at-body",subsets:["cyrillic","cyrillic-ext"],weight:["400"]});
const vars=designVars({primary:"#725778",primaryDark:"#56405e",gold:"#b49a65",goldLight:"#ecdbb5",paper:"#fcf7ef",ink:"#433f4f",muted:"#807482",accent:"#b1797e"},{display:"var(--at-display)",accent:"var(--at-display)",body:"var(--at-body)"});
const t=designTexts("atlas-tolqin");

/** An asymmetric letter beside a pastel atlas selvage; one cloth slides aside. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode),when=inv.main.when,reduced=useReducedMotion();
  const names=useFitWords<HTMLHeadingElement>(44),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?100:1750);};
  return <InvitationShell inv={inv} style={vars} fontsClassName={`${display.variable} ${body.variable}`} backdropClassName="bg-[#e8e0e6]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="relative overflow-hidden pr-7 pt-12 pb-10 pl-[21%]">
      <Ikat className="absolute inset-y-0 left-0 h-full w-[13%] opacity-80"/>
      <p className="text-[13px] tracking-[.16em] text-primary uppercase">{t.opening.invitation}</p><p className="mt-4 font-display text-[22px] italic">{t.occasionTitles[inv.occasion]}</p>
      <h1 ref={names} className="mt-8 w-full font-display leading-[1.17] [--fit:44px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-2 block text-[24px] italic text-primary">{t.cover.andWord}</span><span className="block text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1>
      <div className="mt-9 border-t border-primary/30 pt-5"><p className="font-display text-[23px]">{when.day} {t.months[when.monthIndex]}</p><p className="mt-2 text-[17px] text-muted">{when.year} · {t.weekdays[when.weekdayIndex]}</p><p className="mt-3 text-[20px]">{t.date.at(inv.main.time)}</p></div>
    </header>
    <main className="px-7 pb-16">
      <Reveal className="border-y border-primary/20 py-7"><h2 className="font-display text-[26px] italic">{inv.text.greeting}</h2><p className="mt-4 text-[19px] leading-[1.8]">{inv.text.body}</p></Reveal>
      <Reveal className="my-9 text-center"><p className="text-[17px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-4 grid grid-cols-4 gap-2",box:"flex min-w-0 flex-col items-center border-b-2 border-primary/25 pb-3",number:"font-display text-[29px] text-primary",label:"mt-2 text-[13px] whitespace-nowrap text-muted",today:"font-display text-[27px]"}}/></Reveal>
      <section className="mt-10"><Reveal><h2 className="mb-6 font-display text-[29px]">{t.venue.programTitle}</h2></Reveal>{inv.program.map((e,i)=><Reveal key={i} className={`relative mb-6 border border-primary/20 bg-[#f4eced] px-5 py-6 ${i%2?"mr-3":"ml-3"}`}><span aria-hidden className="absolute inset-y-3 -left-3 w-1 bg-primary/35"/><p className="font-display text-[26px]">{e.title}</p><p className="mt-3 text-[17px] text-primary">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-1 text-[19px]">{t.date.at(e.time)}</p><p className="mt-5 text-[20px]">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-none border border-primary/40 px-4 py-3 text-primary" iconClassName="text-primary"/></Reveal>)}</section>
      {inv.sides&&<Reveal className="mt-9 space-y-4 text-[17px]"><p><span className="block text-muted">{t.sides.groom}</span>{inv.sides.groom}</p><p><span className="block text-muted">{t.sides.bride}</span>{inv.sides.bride}</p></Reveal>}
      <Reveal className="mt-12 border-t border-primary/20 pt-7"><p className="font-display text-[25px] italic leading-relaxed">{inv.blessing}</p><p className="mt-8 text-[17px] text-muted">{t.hosts.respectDeep}</p><p className="mt-3 font-display text-[28px] leading-relaxed">{data.hosts}</p><p className="mt-4 text-[18px]">{t.hosts.waiting}</p></Reveal>
    </main><Ikat className="h-10 w-full opacity-65"/>
    {!inv.opened&&<button data-open type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className="absolute inset-x-0 top-0 z-40 h-svh min-h-[560px] overflow-hidden text-center"><motion.div initial={false} animate={{x:inv.started?"-110%":"0%",skewY:inv.started?-5:0}} transition={{duration:reduced?0:1.6,ease:[.65,0,.2,1]}} className="absolute inset-0 bg-[#f2e4e7]"><Ikat className="absolute inset-0 h-full w-full opacity-65"/><div className="absolute inset-x-8 top-1/3 border border-primary/40 bg-paper px-5 py-9"><p className="text-[13px] tracking-[.2em] uppercase">{t.opening.invitation}</p><p className="mt-5 font-display text-[34px]">{t.occasionTitles[inv.occasion]}</p><p className="mt-7 text-[17px]">{t.opening.tapToOpen}</p></div></motion.div></button>}
  </InvitationShell>;
}
function Ikat({className}:{className:string}){const id=useId();return <svg aria-hidden data-decor viewBox="0 0 120 260" preserveAspectRatio="none" className={className}><defs><pattern id={id} width="120" height="260" patternUnits="userSpaceOnUse"><rect width="120" height="260" fill="#f2e7e2"/>{[0,1,2].map(i=><g key={i} transform={`translate(${i*40} ${i%2?65:0})`}><path d="M20-130 34-64 27-38 38 0 27 38 34 64 20 130 6 64 13 38 2 0 13-38 6-64Z" fill={i===0?"#b7a5bd":i===1?"#d0afb4":"#d9c8a9"}/><path d="M20-90 27-50 22-22 29 0 22 22 27 50 20 90 13 50 18 22 11 0 18-22 13-50Z" fill="#fcf7ef" fillOpacity=".75"/><path d="M20 130 34 196 27 222 38 260 27 298 34 324 20 390 6 324 13 298 2 260 13 222 6 196Z" fill={i===0?"#b7a5bd":i===1?"#d0afb4":"#d9c8a9"}/></g>)}</pattern></defs><rect width="120" height="260" fill={`url(#${id})`}/></svg>;}
