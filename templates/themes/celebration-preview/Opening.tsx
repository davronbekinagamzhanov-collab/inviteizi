"use client";
import {useAnimate} from "motion/react";
import {useFitWords,Words} from "../../blocks/FitWords";
import type {Invitation} from "../../blocks/useInvitation";
import {useCeremony} from "../vip-masterpiece/useCeremony";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {artOf,mainEvent,type CelebrationId} from "./model";
import s from "./shared.module.css";

export function Opening({inv,id,className}:{inv:Invitation;id:CelebrationId;className:string}){
 const [scope,animate]=useAnimate<HTMLButtonElement>(),gate=useCeremony(inv,[artOf(id)]),ref=useFitWords<HTMLSpanElement>(30),e=mainEvent(inv),copy=celebrationCopy(inv.lang);
 async function open(){const ease=[.35,0,.16,1] as const;await Promise.all([
  animate("[data-cover-ink]",{opacity:0,y:-8},{duration:.28,ease:"easeOut"}),
  ...(id==="sahar-sabosi"?[animate("[data-gate-left]",{y:"-106%",rotateX:32},{duration:1.2,ease}),animate("[data-gate-right]",{y:"108%",rotateX:-12},{duration:1.18,delay:.12,ease})]
   :id==="subhi-safo"?[animate("[data-gate-left]",{x:"-110%",rotateY:-9},{duration:1.22,ease}),animate("[data-gate-right]",{x:"110%",rotateY:9},{duration:1.22,delay:.06,ease})]
   :id==="mehr-fasli"?[animate("[data-gate-left]",{y:"-106%",rotate:-5},{duration:1.25,delay:.1,ease}),animate("[data-gate-right]",{y:"112%",rotate:9},{duration:1.2,ease})]
   :[animate("[data-gate-left]",{x:"-110%",y:"-12%",rotate:-24},{duration:1.35,ease}),animate("[data-gate-right]",{x:"110%",y:"12%",rotate:24},{duration:1.35,delay:.06,ease})]),
 ]);}
 return <button ref={scope} type="button" data-open data-celebration-opening={id} data-ready={gate.ready||undefined} data-phase={gate.opening?"opening":"idle"} className={`${s.opening} ${className}`} aria-label={copy.open} aria-busy={gate.status==="loading"} onClick={()=>void gate.open(open)}><span data-gate-left className={s.gateLeft}/><span data-gate-right className={s.gateRight}/><span data-cover-ink className={s.coverInk}><span className={s.kicker}>{copy.invitation}</span><span className={s.coverTitle}>{t.occasionTitles[inv.occasion]}</span>{inv.occasion==="yubiley"&&inv.data.age!=null&&<span className={s.coverAge}>{inv.data.age}<small>{t.ageLabel}</small></span>}<span data-opening-name ref={ref} className={s.coverName}><Words text={inv.data.person??""}/></span><span className={s.coverDate}>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)} · {e.time}</span><span className={s.coverHosts}>{inv.data.hosts}</span><span className={s.openPrompt} role="status">{gate.status==="loading"?copy.loading:gate.status==="error"?copy.retry:copy.open}<i>↗</i></span></span></button>;
}
