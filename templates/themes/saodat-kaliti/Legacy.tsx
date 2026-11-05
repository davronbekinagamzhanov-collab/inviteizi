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
const font=localFont({src:[{path:"../../../assets/fonts/Lora-Regular.ttf"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--skl-font",display:"swap"});
const vars=designVars({primary:"#795545",primaryDark:"#593e32",gold:"#b18e71",goldLight:"#e7ceb6",paper:"#fcf5ec",ink:"#56473d",muted:"#715e54"},{display:"var(--skl-font)",accent:"var(--skl-font)",body:"var(--skl-font)"});
const t=designTexts("saodat-kaliti");
export default function Design({data,mode}:TemplateProps){
 const inv=useInvitation(data,mode),reduced=useReducedMotion(),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
 const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:1400);};
 return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e5d4c8]" className="bg-paper text-ink [overflow-wrap:anywhere]"><Content data={data} inv={inv}/>
  {!inv.opened&&<button data-open data-started={inv.started} type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className={styles.cover}><div className={styles.paper}/><div aria-hidden className={styles.lock}><div className={styles.shackle}/><div className={styles.body}><span className={styles.hole}/><span className={styles.engraving}/></div><div className={styles.key}><SmallKey/></div></div><div className={styles.label}><p className="text-[12px] tracking-[.2em] uppercase">{t.opening.invitation}</p><p className="mt-5 text-[34px] italic">{t.occasionTitles[inv.occasion]}</p><p className="mt-8 text-[17px]">{t.opening.tapToOpen}</p></div></button>}
 </InvitationShell>;
}
const Content=memo(function Content({data,inv}:{data:InvitationData;inv:Invitation}){
 const names=useFitWords<HTMLHeadingElement>(46),hosts=useFitWords<HTMLParagraphElement>(26),groom=useFitWords<HTMLParagraphElement>(24),bride=useFitWords<HTMLParagraphElement>(24);
 return <><header className="px-7 pt-8 pb-10"><KeyArt/><p className="mt-3 text-[12px] tracking-[.2em] uppercase text-muted">{t.opening.invitation}</p><h1 ref={names} className="mt-7 w-full leading-tight [--fit:46px]"><span className="block text-[length:var(--fit)] italic"><Words text={data.groom??""}/></span><span className="my-4 block text-[22px] text-primary">{t.cover.andWord}</span><span className="block text-[length:var(--fit)] italic"><Words text={data.bride??""}/></span></h1><p className="mt-7 border-y border-gold/50 py-4 text-[19px] text-primary">{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></header>
  <main className="px-7 pb-24"><Reveal className="border-l-2 border-gold/50 pl-5"><h2 className="text-[29px] italic leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p></Reveal>
   {inv.sides&&<section className="my-10 space-y-7 border-y border-gold/40 py-8"><div><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p></div><div><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></div></section>}
   <Reveal className="bg-[#eee1d2] px-3 py-8"><p className="mb-6 text-[26px] italic text-primary">{t.date.title[inv.occasion]}</p><Calendar date={inv.main.when} marker="circle" markerClassName="text-primary" markedDayClassName="text-paper"/></Reveal>
   <section className="pt-11"><h2 className="mb-8 text-[30px] italic text-primary">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mb-9"><div data-event className="border-b border-gold/45 pb-8"><p className="text-[14px] text-muted">0{i+1} · {t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><h3 className="mt-3 text-[25px] leading-snug">{e.title}</h3><p className="mt-3 text-[36px] italic text-primary">{t.date.clock(e.time)}</p><p className="mt-5 text-[22px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
   <Reveal><p className="text-[24px] italic leading-[1.8]">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] text-primary">{t.hosts.waiting}</p></Reveal>
  </main></>;
},(a,b)=>a.data===b.data&&a.inv.mode===b.inv.mode&&a.inv.lang===b.inv.lang);
const SmallKey=memo(function SmallKey(){return <svg viewBox="0 0 130 55" className="w-full" fill="none" stroke="#78533d" strokeWidth="7"><circle cx="104" cy="27" r="18" fill="#ddc39b"/><path d="M85 27H8M25 27v16M42 27v12"/><path d="M85 25H9" stroke="#f5e5c9" strokeWidth="1.5"/></svg>;});
const KeyArt=memo(function KeyArt(){return <svg data-decor aria-hidden="true" viewBox="0 0 320 130" className="w-full" fill="none"><g transform="rotate(-12 160 65)"><path d="M117 65H279M240 65V95H254V81H266V95H279V65" stroke="#b18e71" strokeWidth="9" strokeLinejoin="round"/><path d="M72 21Q37 18 35 48q-18 30 7 46q12 22 35 11q35 8 44-20q24-27-1-48q-16-23-48-16Z" fill="#e7ceb6" stroke="#b18e71" strokeWidth="2"/><path d="M75 38q-26-8-25 17q-13 20 8 24q8 18 25 5q23 5 22-17q14-20-7-23q-7-16-23-6Z" fill="#fcf5ec" stroke="#b18e71"/><path d="M126 62H277" stroke="#f8e6cb" strokeWidth="1.5"/></g><path d="M25 121H113M226 121H295" stroke="#c6ad97" strokeWidth=".8"/></svg>;});
