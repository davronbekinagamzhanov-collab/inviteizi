"use client";

import type { TemplateProps } from "../types";
import { designVars } from "../types";
import { useEffect,useRef } from "react";
import { motion,useReducedMotion } from "motion/react";
import { EB_Garamond,PT_Serif } from "next/font/google";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words,useFitWords } from "../../blocks/FitWords";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { designTexts } from "@/texts/uz-cyrl";

const display=EB_Garamond({variable:"--bg-display",subsets:["cyrillic","cyrillic-ext"],weight:["400","500"],style:["normal","italic"]});
const body=PT_Serif({variable:"--bg-body",subsets:["cyrillic","cyrillic-ext"],weight:["400"]});
const vars=designVars({primary:"#698b9e",primaryDark:"#48677b",gold:"#bca16f",goldLight:"#e6d7b4",paper:"#fbf8f1",ink:"#485b62",muted:"#87918e",accent:"#c6b7ba"},{display:"var(--bg-display)",accent:"var(--bg-display)",body:"var(--bg-body)"});
const t=designTexts("bodom-guli");

/** Real almond flowers above a spring letter; four soft petals open away from the page. */
export default function Design({data,mode,art}:TemplateProps){
  const inv=useInvitation(data,mode),when=inv.main.when,reduced=useReducedMotion(),names=useFitWords<HTMLHeadingElement>(51);
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
  const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?100:1750);};
  return <InvitationShell inv={inv} style={vars} fontsClassName={`${display.variable} ${body.variable}`} backdropClassName="bg-[#e1e8e8]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="text-center"><p className="px-7 pt-8 text-[13px] tracking-[.2em] text-primary uppercase">{t.opening.invitation}</p><div className="relative mt-4 h-[230px]"><PhotoBackdrop src={art??"/art/bodom-guli.webp"} fade="both" color="#fbf8f1" position="65% 45%" opacity={.7} strength={.45} priority/></div>
      <div className="px-7"><p className="text-[18px] text-muted">{t.occasionTitles[inv.occasion]}</p><h1 ref={names} className="mt-4 w-full font-display leading-[1.05] [--fit:51px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-2 block text-[28px] italic text-primary">{t.cover.andWord}</span><span className="block text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1><p className="mt-6 font-display text-[27px]">{t.date.long(when.day,when.monthIndex,when.year)}</p><p className="mt-3 text-[17px] text-muted">{t.weekdays[when.weekdayIndex]} · {t.date.at(inv.main.time)}</p></div>
    </header>
    <main className="px-7 pt-9 pb-16">
      <Reveal className="text-center"><h2 className="font-display text-[29px] italic">{inv.text.greeting}</h2><p className="mt-4 text-[18px] leading-[1.85]">{inv.text.body}</p></Reveal>
      <Reveal className="my-9 border-y border-primary/20 py-5 text-center"><p className="text-[17px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-4 grid grid-cols-4",box:"flex min-w-0 flex-col items-center",number:"font-display text-[36px] text-primary",label:"text-[12px] whitespace-nowrap text-muted",today:"font-display text-[29px]"}}/></Reveal>
      <section><Reveal><h2 className="mb-7 text-center font-display text-[32px]">{t.venue.programTitle}</h2></Reveal>{inv.program.map((e,i)=><Reveal key={i} className="mb-8 text-center"><Blossom className="mx-auto mb-4 h-9 w-9"/><p className="font-display text-[30px]">{e.title}</p><p className="mt-2 text-[17px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-3 font-display text-[31px] text-primary">{t.date.clock(e.time)}</p><p className="mt-4 text-[19px]">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 border border-primary/40 bg-[#edf2f1] px-5 py-3 text-primary" iconClassName="text-primary"/></Reveal>)}</section>
      {inv.sides&&<Reveal className="mt-8 space-y-4 border-y border-primary/20 py-5 text-center text-[17px]"><p><span className="block text-muted">{t.sides.groom}</span>{inv.sides.groom}</p><p><span className="block text-muted">{t.sides.bride}</span>{inv.sides.bride}</p></Reveal>}
      <Reveal className="mt-10 text-center"><p className="font-display text-[27px] italic leading-relaxed">{inv.blessing}</p><p className="mt-8 text-[16px] text-muted">{t.hosts.respectDeep}</p><p className="mt-3 font-display text-[30px] leading-snug">{data.hosts}</p><Blossom className="mx-auto mt-8 h-12 w-12"/></Reveal>
    </main>
    {!inv.opened&&<button data-open type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className="absolute inset-x-0 top-0 z-40 h-svh min-h-[560px] overflow-hidden text-center"><motion.div animate={{opacity:inv.started?0:1}} transition={{duration:reduced?0:.6}} className="absolute inset-0 bg-[#e9e5df]"/>{[0,1,2,3].map(i=><motion.div key={i} initial={false} animate={{x:inv.started?(i%2?"100%":"-100%"):"0%",y:inv.started?(i>1?"100%":"-100%"):"0%",rotate:inv.started?(i%2?15:-15):0}} transition={{duration:reduced?0:1.6,ease:[.4,0,.2,1]}} className={`absolute h-[58%] w-[58%] border border-[#c7bac0]/35 bg-[#f7edef] ${i%2?"right-0":"left-0"} ${i>1?"bottom-0":"top-0"}`} style={{borderRadius:i%2?"75% 20% 75% 20%":"20% 75% 20% 75%"}}/>)}<motion.div animate={{opacity:inv.started?0:1}} transition={{duration:.2}} className="absolute inset-x-8 top-[35%]"><Blossom className="mx-auto mb-6 h-20 w-20"/><p className="font-display text-[36px]">{t.occasionTitles[inv.occasion]}</p><p className="mt-7 text-[17px]">{t.opening.tapToOpen}</p></motion.div></button>}
  </InvitationShell>;
}
function Blossom({className}:{className:string}){return <svg aria-hidden data-decor viewBox="0 0 100 100" className={className} fill="#fffaf5" stroke="#bca8b0" strokeWidth="1.3">{[0,1,2,3,4].map(i=><path key={i} d="M50 52C18 37 22 10 38 11Q47 8 50 21Q53 8 62 11C78 10 82 37 50 52Z" transform={`rotate(${i*72} 50 52)`}/>)}<circle cx="50" cy="52" r="6" fill="#c8b17b" stroke="none"/></svg>;}
