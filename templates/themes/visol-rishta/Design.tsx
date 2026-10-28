"use client";
import localFont from "next/font/local";
import {memo,useEffect,useRef} from "react";
import type {InvitationData} from "@/lib/types";
import {motion,useReducedMotion} from "motion/react";
import {designVars,type TemplateProps} from "../types";
import {useInvitation,type Invitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {Reveal} from "../../blocks/Reveal";
import {Countdown} from "../../blocks/Countdown";
import {designTexts} from "@/texts/uz-cyrl";
const font=localFont({src:[{path:"../../../assets/fonts/Lora-Regular.ttf"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--vr-font",display:"swap"});
const vars=designVars({primary:"#886b78",primaryDark:"#634d59",gold:"#b29a77",goldLight:"#e9d9c2",paper:"#fcf7f1",ink:"#574b51",muted:"#72616a"},{display:"var(--vr-font)",accent:"var(--vr-font)",body:"var(--vr-font)"});
const t=designTexts("visol-rishta");

/** A tied silk parcel: two loops unthread and diagonal ribbons withdraw along their own axes. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode),reduced=useReducedMotion();
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
  const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:1250);};
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e3d8dc]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <Content data={data} inv={inv}/>
    {!inv.opened&&<button data-open type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className="absolute inset-x-0 top-0 z-40 h-svh min-h-[560px] overflow-hidden text-ink">
      <motion.div initial={false} animate={{opacity:inv.started?0:1}} transition={{duration:reduced?0:.6}} className="absolute inset-0 bg-[#efe4e3]"/>
      {[0,1].map(i=><div key={i} aria-hidden className="absolute inset-0 flex items-center justify-center" style={{transform:`rotate(${i?36:-36}deg)`}}><motion.div initial={false} animate={{x:inv.started?(i?"160%":"-160%"):"0%"}} transition={{duration:reduced?0:1.05,ease:[.45,0,.2,1]}} className="h-[42px] w-[170%] shrink-0 border-y border-[#c3a8ad] bg-[#b997a5] shadow-[inset_0_3px_0_#e1cdd1,inset_0_-3px_0_#997684]" style={{willChange:inv.started?"transform":undefined}}/></div>)}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center">{[0,1].map(i=><motion.div key={i} initial={false} animate={{x:inv.started?(i?125:-125):0,y:inv.started?-35:0,rotate:inv.started?(i?50:-50):0,scale:inv.started?.4:1,opacity:inv.started?0:1}} transition={{duration:reduced?0:.65,ease:[.3,0,.25,1]}} className={`absolute h-[57px] w-[105px] border-[12px] border-[#b997a5] shadow-[inset_0_1px_0_#e1cdd1,0_1px_0_#e1cdd1] ${i?"translate-x-[40px] rotate-[-25deg] rounded-[60%_70%_40%_60%]":"-translate-x-[40px] rotate-[25deg] rounded-[70%_60%_60%_40%]"}`}/>)}</div>
      <motion.div initial={false} animate={{opacity:inv.started?0:1}} transition={{duration:reduced?0:.15}} className="pointer-events-none absolute inset-x-8 top-[14%] text-center"><p className="text-[12px] tracking-[.22em] uppercase">{t.opening.invitation}</p><p className="mt-5 text-[34px] italic text-primary">{t.occasionTitles[inv.occasion]}</p></motion.div><motion.p initial={false} animate={{opacity:inv.started?0:1}} transition={{duration:reduced?0:.15}} className="absolute inset-x-6 bottom-[18%] text-[17px]">{t.opening.tapToOpen}</motion.p>
    </button>}
  </InvitationShell>;
}
/** Order content is independent of opening/playback state; avoid rebuilding long JSX trees on touch. */
const Content=memo(function Content({data,inv}:{data:InvitationData;inv:Invitation}){
  const names=useFitWords<HTMLHeadingElement>(47),hosts=useFitWords<HTMLParagraphElement>(26),groomFamily=useFitWords<HTMLParagraphElement>(25),brideFamily=useFitWords<HTMLParagraphElement>(25);
  return <>
    <header className="relative px-7 pt-9 pb-12 text-center">
      <Knot/><p className="mt-5 text-[12px] tracking-[.2em] uppercase text-muted">{t.opening.invitation}</p><p className="mt-8 text-[18px] italic text-primary">{t.occasionTitles[inv.occasion]}</p>
      <h1 ref={names} className="mt-8 w-full leading-[1.17] [--fit:47px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-4 block text-[21px] italic text-muted">{t.cover.andWord}</span><span className="block text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1>
      <div className="mx-auto mt-9 w-fit border-y border-gold/50 px-3 py-4"><p className="text-[21px] text-primary">{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p><p className="mt-2 text-[16px] text-muted">{t.date.at(inv.main.time)}</p></div>
    </header>
    <main className="pb-24">
      <Reveal className="mx-7 text-center"><h2 className="text-[29px] italic">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p></Reveal>
      {inv.sides&&<section className="relative mx-6 mt-12 border-y border-primary/30 py-9 text-center"><div aria-hidden className="absolute -top-1 left-1/2 h-2 w-2 rotate-45 bg-primary"/><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groomFamily} className="mt-3 w-full leading-snug [--fit:25px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p><div aria-hidden className="mx-auto my-6 h-8 w-px bg-gold/60"/><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={brideFamily} className="mt-3 w-full leading-snug [--fit:25px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></section>}
      <section className="mt-12 px-7"><h2 className="mb-8 text-center text-[31px] text-primary">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mb-8"><div data-event className="relative border-l border-gold/60 py-2 pl-6"><span aria-hidden className="absolute top-3 -left-[4px] h-[7px] w-[7px] rotate-45 bg-primary"/><p className="text-[15px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-2 text-[34px] italic text-primary">{t.date.clock(e.time)}</p><h3 className="mt-3 text-[24px] leading-snug">{e.title}</h3><p className="mt-5 text-[22px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 border-b border-primary/50 pb-2 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
      <Reveal className="mx-7 mt-12 border-y border-gold/40 py-7 text-center"><p className="text-[17px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={inv.main.when.startsAt} look={{grid:"mt-6 grid grid-cols-4 gap-2",box:"flex min-w-0 flex-col",number:"text-[26px] tabular-nums whitespace-nowrap text-primary",label:"mt-2 text-[12px] text-muted",today:"text-[27px]"}}/></Reveal>
      <Reveal className="px-7 pt-10 text-center"><p className="text-[24px] italic leading-[1.8]">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] italic text-primary">{t.hosts.waiting}</p></Reveal>
    </main>
  </>;
},(a,b)=>a.data===b.data&&a.inv.mode===b.inv.mode);
function Knot(){return <svg data-decor aria-hidden="true" viewBox="0 0 300 130" className="mx-auto w-full max-w-[300px]" fill="none"><path d="M18 111Q96 105 145 67M282 111Q204 105 155 67" stroke="#b69aa4" strokeWidth="9"/><path d="M146 64Q65-20 54 37q-4 48 92 27ZM154 64q81-84 92-27q4 48-92 27Z" stroke="#b69aa4" strokeWidth="11"/><path d="M143 53q11-9 17 2l-2 23q-9 7-16-3Z" fill="#a58a96"/><path d="M63 36q4-30 68 18M237 36q-4-30-68 18M32 110q69-12 99-35M268 110q-69-12-99-35" stroke="#dec7cd" strokeWidth="2"/><path d="M18 121h48M234 121h48" stroke="#b29a77" strokeWidth=".8"/></svg>;}
