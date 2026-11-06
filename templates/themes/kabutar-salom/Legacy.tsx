"use client";
import localFont from "next/font/local";
import {memo,useEffect,useRef} from "react";
import {useReducedMotion} from "motion/react";
import type {InvitationData} from "@/lib/types";
import {designVars,type TemplateProps} from "../types";
import {useInvitation,type Invitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {Reveal} from "../../blocks/Reveal";
import {MapButton} from "../../blocks/MapButton";
import {Countdown} from "../../blocks/Countdown";
import {designTexts} from "@/texts/uz-cyrl";
import styles from "./opening.module.css";
const font=localFont({src:[{path:"../../../assets/fonts/Lora-Regular.ttf"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--ks-font",display:"swap"});
const vars=designVars({primary:"#8a6676",primaryDark:"#674b58",gold:"#ad9775",goldLight:"#e6d8c4",paper:"#fcf7f0",ink:"#574953",muted:"#71616a"},{display:"var(--ks-font)",accent:"var(--ks-font)",body:"var(--ks-font)"});
const t=designTexts("kabutar-salom");
/** A sculpted paper dove unfolds one wing and takes a finite diagonal flight, revealing the page. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode),reduced=useReducedMotion(),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
  const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:1300);};
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e4d9de]" className="bg-paper text-ink [overflow-wrap:anywhere]"><Content data={data} inv={inv}/>
    {!inv.opened&&<button data-open data-started={inv.started} type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className={styles.cover}><div className={styles.paper}/><div className={styles.flight}><Dove flight/></div><div className={styles.label}><p className="text-[12px] tracking-[.2em] uppercase">{t.opening.invitation}</p><p className="mt-5 text-[35px] italic">{t.occasionTitles[inv.occasion]}</p></div><p className={styles.prompt}>{t.opening.tapToOpen}</p></button>}
  </InvitationShell>;
}
const Content=memo(function Content({data,inv}:{data:InvitationData;inv:Invitation}){
  const names=useFitWords<HTMLHeadingElement>(45),hosts=useFitWords<HTMLParagraphElement>(26),groom=useFitWords<HTMLParagraphElement>(24),bride=useFitWords<HTMLParagraphElement>(24);
  return <><header className="px-7 pt-7 pb-10 text-center"><div className="mx-auto max-w-[255px]"><Dove/></div><p className="mt-3 text-[12px] uppercase tracking-[.2em] text-muted">{t.opening.invitation}</p><h1 ref={names} className="mt-7 w-full leading-[1.2] [--fit:45px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-3 block text-[23px] italic text-primary">{t.cover.andWord}</span><span className="block text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1><p className="mt-8 border-y border-dashed border-gold/60 py-4 text-[20px] text-primary">{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></header>
    <main className="pb-24"><Reveal className="px-7 text-center"><h2 className="text-[30px] italic leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p></Reveal>
      {inv.sides&&<section className="mx-6 mt-11 rounded-t-[70px] border border-gold/40 px-5 pt-11 pb-8 text-center"><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p><div aria-hidden className="mx-auto my-7 h-px w-12 bg-primary/40"/><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></section>}
      <section className="mt-12 px-7"><h2 className="mb-8 text-center text-[30px] italic text-primary">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mb-10"><div data-event className="border-b border-gold/40 pb-8 text-center"><p className="text-[14px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-3 text-[38px] italic text-primary">{t.date.clock(e.time)}</p><h3 className="mt-3 text-[25px] leading-snug">{e.title}</h3><p className="mt-5 text-[22px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-full border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
      <Reveal className="mx-7 text-center"><p className="text-[16px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={inv.main.when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-2",box:"flex min-w-0 flex-col",number:"text-[25px] whitespace-nowrap text-primary",label:"mt-2 text-[12px] text-muted",today:"text-[27px] text-primary"}}/></Reveal>
      <Reveal className="px-7 pt-11 text-center"><p className="text-[24px] italic leading-[1.8]">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-5 text-[18px] text-primary">{t.hosts.waiting}</p></Reveal>
    </main></>;
},(a,b)=>a.data===b.data&&a.inv.mode===b.inv.mode&&a.inv.lang===b.inv.lang);
const Dove=memo(function Dove({flight=false}:{flight?:boolean}){return <svg data-decor aria-hidden="true" viewBox="0 0 300 200" className="w-full" fill="none" stroke="#b19a80" strokeWidth="1.2"><path d="m38 151 64-28 74-50 36 3 31-26 8 12-11 24 35 7-43 7-40 39-74 12-51 21 15-25Z" fill="#f2eadf"/><g className={flight?styles.wing:undefined}><path d="m102 123 5-89 33 26 18-44 34 60-18 57Z" fill="#fffdf7"/><path d="m107 34 33 90M158 16l-18 108M192 76l-52 48" stroke="#ddccb6"/></g><path d="m118 151 74-12 40-39-92 24Z" fill="#e5d7c9" stroke="none"/><path d="m67 172 35-49 38 1-58 23M176 73l16 3M247 75l-7 11"/><circle cx="239" cy="66" r="1.4" fill="#8a6676" stroke="none"/><path d="M25 184q37-18 65-8M198 173q39-20 77-3" stroke="#c5b1b5" strokeWidth=".8"/></svg>;});
