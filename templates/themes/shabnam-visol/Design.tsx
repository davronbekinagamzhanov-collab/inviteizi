"use client";
import localFont from "next/font/local";
import {memo,useEffect,useRef} from "react";
import {useReducedMotion} from "motion/react";
import type {InvitationData} from "@/lib/types";
import {designVars,type TemplateProps} from "../types";
import {useInvitation,type Invitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {Reveal} from "../../blocks/Reveal";
import {Countdown} from "../../blocks/Countdown";
import {designTexts} from "@/texts/uz-cyrl";
import styles from "./opening.module.css";
const font=localFont({ preload: false,src:[{path:"../../../assets/fonts/Lora-Regular.ttf"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--sv-font",display:"swap"});
const vars=designVars({primary:"#466966",primaryDark:"#365b5b",gold:"#a89a78",goldLight:"#e0d9bf",paper:"#f7f8f0",ink:"#455653",muted:"#56675f"},{display:"var(--sv-font)",accent:"var(--sv-font)",body:"var(--sv-font)"});
const t=designTexts("shabnam-visol");
/** A dew drop falls onto water; three finite ripples spread as the translucent ground clears. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode),reduced=useReducedMotion(),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
  const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:1250);};
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#d9e4df]" className="bg-paper text-ink [overflow-wrap:anywhere]"><Content data={data} inv={inv}/>
    {!inv.opened&&<button data-open data-started={inv.started} type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className={styles.cover}><div className={styles.paper}/><div aria-hidden className={styles.drop}><svg viewBox="0 0 60 90" fill="#b3ccbe" stroke="#708e83" strokeWidth="1.2"><path d="M30 3Q-19 61 15 80Q30 89 45 80Q79 61 30 3Z"/><path d="M18 53q-7 15 2 19" fill="none" stroke="#edf3e7" strokeWidth="3"/></svg></div>{[0,1,2].map(i=><span key={i} aria-hidden className={styles.ripple} style={{animationDelay:`${.4+i*.1}s`}}/>)}<div className={styles.label}><p className="text-[12px] uppercase tracking-[.2em]">{t.opening.invitation}</p><p className="mt-5 text-[34px] italic">{t.occasionTitles[inv.occasion]}</p><p className="mt-8 text-[17px]">{t.opening.tapToOpen}</p></div></button>}
  </InvitationShell>;
}
const Content=memo(function Content({data,inv}:{data:InvitationData;inv:Invitation}){
  const names=useFitWords<HTMLHeadingElement>(46),hosts=useFitWords<HTMLParagraphElement>(26),groom=useFitWords<HTMLParagraphElement>(25),bride=useFitWords<HTMLParagraphElement>(25);
  return <><header className="px-7 pt-7 pb-10"><Dew/><p className="mt-3 text-[12px] uppercase tracking-[.2em] text-muted">{t.opening.invitation}</p><h1 ref={names} className="mt-7 w-full leading-tight [--fit:46px]"><span className="block text-[length:var(--fit)] italic"><Words text={data.groom??""}/></span><span className="my-4 block text-[23px] italic text-primary">{t.cover.andWord}</span><span className="block text-[length:var(--fit)] italic"><Words text={data.bride??""}/></span></h1><p className="mt-7 border-t border-primary/30 pt-5 text-[20px] text-primary">{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></header>
    <main className="pb-24"><Reveal className="mx-6 border-y border-dashed border-primary/40 py-8"><h2 className="text-[29px] italic leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p></Reveal>
      {inv.sides&&<section className="space-y-8 px-7 py-11"><div className="border-l border-primary/40 pl-5"><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groom} className="mt-3 w-full leading-snug [--fit:25px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p></div><div className="border-r border-primary/40 pr-5 text-right"><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={bride} className="mt-3 w-full leading-snug [--fit:25px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></div></section>}
      <section className="bg-[#e6eee2] px-7 py-10"><h2 className="mb-8 text-[31px] italic text-primary">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mb-8 last:mb-0"><div data-event className="border-t border-primary/35 pt-6"><p className="text-[14px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-3 text-[38px] italic text-primary">{t.date.clock(e.time)}</p><h3 className="mt-3 text-[25px] leading-snug">{e.title}</h3><p className="mt-5 text-[22px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-full border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
      <Reveal className="px-7 pt-10"><p className="text-[16px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={inv.main.when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-2",box:"flex min-w-0 flex-col border-l border-primary/25 pl-2",number:"text-[24px] whitespace-nowrap text-primary",label:"mt-2 text-[12px] text-muted",today:"text-[26px] text-primary"}}/></Reveal>
      <Reveal className="px-7 pt-10"><p className="text-[24px] italic leading-[1.8]">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] text-primary">{t.hosts.waiting}</p></Reveal>
    </main></>;
},(a,b)=>a.data===b.data&&a.inv.mode===b.inv.mode&&a.inv.lang===b.inv.lang);
const Dew=memo(function Dew(){return <svg data-decor aria-hidden="true" viewBox="0 0 320 155" className="w-full" fill="none"><path d="M24 128Q131 83 286 26M117 90Q54 102 56 39q54 3 61 51ZM171 70q-16-56 39-60q14 43-39 60Z" stroke="#7e9c88" strokeWidth="1.5"/><path d="M56 39q25 37 61 51M210 10q-25 25-39 60" stroke="#a8b8a1"/><path d="M254 64q-38 47-12 61q12 6 24-1q26-15-12-60Z" fill="#d0e0d0" stroke="#7e9c88"/><path d="M244 103q-5 10 3 14" stroke="#f7f8f0" strokeWidth="3"/><ellipse cx="243" cy="142" rx="54" ry="7" stroke="#b9c8b6" strokeWidth="1"/><path d="M24 144h82" stroke="#a89a78" strokeWidth=".8"/></svg>;});
