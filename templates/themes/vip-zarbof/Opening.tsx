"use client";
import {useAnimate} from "motion/react";
import {t,luxuryWeddingCopy as copy} from "@/texts/uz-cyrl";
import type {Invitation} from "../../blocks/useInvitation";
import {initials,reception} from "../vip-masterpiece/model";
import {useCeremony} from "../vip-masterpiece/useCeremony";
import {Words,useFitWords} from "../../blocks/FitWords";
import {GanchSprig} from "./Ornament";
import s from "./grand.module.css";
export function GrandOpening({inv}:{inv:Invitation}){
 const [scope,animate]=useAnimate<HTMLButtonElement>(),gate=useCeremony(inv,["/vip/vip-zarbof/1.webp","/vip/vip-zarbof/ceremony-architecture.webp"]),[a,b]=initials(inv.data),w=reception(inv).when;
 const count=`${inv.data.groom??""} ${inv.data.bride??""}`.trim().split(/\s+/).length,namesRef=useFitWords<HTMLSpanElement>(count>4?22:27);
 if(inv.opened)return null;
 async function unveil(){const ease=[.46,0,.16,1] as const;await Promise.all([
  animate("[data-grand-foundation]",{opacity:0},{duration:.35,delay:.25,ease:"easeOut"}),
  animate("[data-grand-signet]",{rotate:45,scale:.8,opacity:0},{duration:.4,ease:"easeInOut"}),
  animate("[data-grand-crown]",{y:"-63dvh",rotateX:42},{duration:1.15,delay:.08,ease}),
  animate("[data-grand-plinth]",{y:"74dvh",rotateX:-32},{duration:1.25,delay:.18,ease}),
  animate("[data-grand-pier=left]",{x:"-120%",rotateY:-26},{duration:1.25,delay:.32,ease}),
  animate("[data-grand-pier=right]",{x:"120%",rotateY:26},{duration:1.25,delay:.32,ease}),
  animate("[data-grand-ink]",{opacity:0},{duration:.3,ease:"easeOut"}),
 ]);}
 return <button ref={scope} type="button" data-open data-master-opening="architectural-ceremony-v2" data-ready={gate.ready||undefined} data-phase={gate.opening?"opening":"idle"} aria-label={copy(inv.lang).open} aria-busy={gate.status==="loading"} onClick={()=>void gate.open(unveil)} className={s.opening}>
  <span data-grand-foundation className={s.foundation}/><span data-grand-pier="left" className={s.pierLeft}/><span data-grand-pier="right" className={s.pierRight}/><span data-grand-crown className={s.crown}><GanchSprig still className={s.crownSprig}/></span><span data-grand-plinth className={s.plinth}/>
  <span data-grand-signet className={s.signet}><span className={s.signetMono} aria-label={`${a} ${b}`}>{a}<i>{b}</i></span><GanchSprig still className={s.signetSprig}/></span>
  <span data-grand-ink className={s.openTop}>{copy(inv.lang).invitation}</span><span data-grand-ink className={s.openLetter}><span data-opening-dedication className={s.openDedication}>{copy(inv.lang).forever}</span><span data-opening-names ref={namesRef} className={s.openNames}><span><Words text={inv.data.groom??""}/></span><i>{t.natural.and}</i><span><Words text={inv.data.bride??""}/></span></span><span className={s.openDate}>{t.date.long(w.day,w.monthIndex,w.year)}</span><span data-opening-hosts className={s.openHosts}>{copy(inv.lang).love}<strong>{inv.data.hosts}</strong></span></span><span data-open-prompt data-grand-ink data-opening-prompt className={s.openPrompt} role="status">{gate.status==="error"?copy(inv.lang).retry:gate.status==="loading"?copy(inv.lang).loading:copy(inv.lang).open}<i>＋</i></span>
 </button>;
}
