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
import {Calendar} from "../../blocks/Calendar";
import {designTexts} from "@/texts/uz-cyrl";
import styles from "./opening.module.css";
const font=localFont({src:"../../../assets/fonts/PTSerif-Regular.ttf",variable:"--qu-font",display:"swap"});
const vars=designVars({primary:"#805a31",primaryDark:"#5f4123",gold:"#b08c51",goldLight:"#ead7af",paper:"#fcf6e9",ink:"#554631",muted:"#736149"},{display:"var(--qu-font)",accent:"var(--qu-font)",body:"var(--qu-font)"});
const t=designTexts("qosh-uzuk");
export default function Design({data,mode}:TemplateProps){
 const inv=useInvitation(data,mode),reduced=useReducedMotion(),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
 const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:1350);};
 return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e7d8bc]" className="bg-paper text-ink [overflow-wrap:anywhere]"><Content data={data} inv={inv}/>
  {!inv.opened&&<button data-open data-started={inv.started} type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className={styles.cover}><div className={styles.paper}/><div aria-hidden className={styles.rings}><span className={styles.left}/><span className={styles.right}/><span className={`${styles.left} ${styles.front}`}/></div><div className={styles.label}><p className="text-[12px] tracking-[.2em] uppercase">{t.opening.invitation}</p><p className="mt-5 text-[35px]">{t.occasionTitles[inv.occasion]}</p><p className="mt-8 text-[17px]">{t.opening.tapToOpen}</p></div></button>}
 </InvitationShell>;
}
const Content=memo(function Content({data,inv}:{data:InvitationData;inv:Invitation}){
 const names=useFitWords<HTMLHeadingElement>(46),hosts=useFitWords<HTMLParagraphElement>(26),groom=useFitWords<HTMLParagraphElement>(24),bride=useFitWords<HTMLParagraphElement>(24);
 return <><header className="px-7 pt-8 pb-10 text-center"><Rings/><p className="mt-3 text-[12px] tracking-[.2em] uppercase text-muted">{t.opening.invitation}</p><h1 ref={names} className="mt-7 w-full leading-tight [--fit:46px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-4 block text-[23px] text-primary">{t.cover.andWord}</span><span className="block text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1><p className="mt-8 border-y border-gold/50 py-4 text-[20px] text-primary">{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></header>
  <main className="px-7 pb-24"><Reveal className="text-center"><h2 className="text-[30px] leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p></Reveal>
   {inv.sides&&<section className="my-10 rounded-[45px] border border-gold/45 px-5 py-8 text-center"><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p><div aria-hidden className="mx-auto my-7 flex w-fit -space-x-1"><span className="h-3 w-3 rounded-full border border-gold"/><span className="h-3 w-3 rounded-full border border-gold"/></div><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></section>}
   <Reveal className="border-y border-gold/45 py-8"><p className="mb-6 text-center text-[26px] text-primary">{t.date.title[inv.occasion]}</p><Calendar date={inv.main.when} marker="circle" markerClassName="text-primary" markedDayClassName="text-paper"/></Reveal>
   <section className="pt-11"><h2 className="mb-8 text-center text-[30px] text-primary">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mb-9"><div data-event className="border-b border-gold/45 pb-8 text-center"><p className="text-[14px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-3 text-[36px] text-primary">{t.date.clock(e.time)}</p><h3 className="mt-3 text-[25px] leading-snug">{e.title}</h3><p className="mt-5 text-[22px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-full border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
   <Reveal className="text-center"><p className="text-[24px] leading-[1.8]">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] text-primary">{t.hosts.waiting}</p></Reveal>
  </main></>;
},(a,b)=>a.data===b.data&&a.inv.mode===b.inv.mode&&a.inv.lang===b.inv.lang);
const Rings=memo(function Rings(){return <svg data-decor aria-hidden="true" viewBox="0 0 300 145" className="mx-auto w-full max-w-[300px]" fill="none"><ellipse cx="119" cy="76" rx="48" ry="53" transform="rotate(-24 119 76)" stroke="#b08c51" strokeWidth="9"/><ellipse cx="181" cy="76" rx="48" ry="53" transform="rotate(24 181 76)" stroke="#c6a765" strokeWidth="9"/><path d="M80 45q24-29 49-17M145 112q-17 17-32 13" stroke="#f6e4b9" strokeWidth="2"/><path d="M145 103q-12-15-12-35" stroke="#fcf6e9" strokeWidth="12"/><path d="M145 103q-12-15-12-35" stroke="#b08c51" strokeWidth="8"/><path d="M167 29q31-4 52 28" stroke="#f6e4b9" strokeWidth="2"/></svg>;});
