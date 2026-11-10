"use client";
import {useAnimate} from "motion/react";
import {useFitWords,Words} from "../../blocks/FitWords";
import type {Invitation} from "../../blocks/useInvitation";
import {useCeremony} from "../vip-masterpiece/useCeremony";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {artOf,mainEvent,type CelebrationId} from "./model";
import s from "./shared.module.css";

export function Opening({inv,id,className}:{inv:Invitation;id:CelebrationId;className:string}){
 const [scope,animate]=useAnimate<HTMLButtonElement>();
 const gate=useCeremony(inv,[artOf(id)]),ref=useFitWords<HTMLSpanElement>(31),e=mainEvent(inv),copy=celebrationCopy(inv.lang);
 async function open(){
  const ease=[.28,.62,.2,1] as const,calm=id==="subhi-safo";
  // The photograph stays in one plane. Only plain material layers move; no mirrored photo fragments.
  const movement=id==="sahar-sabosi"
   ? [animate('[data-opening-veil="left"]',{y:"-108%",opacity:0},{duration:1.14,ease}),animate('[data-opening-veil="right"]',{y:"110%",opacity:0},{duration:1.18,ease})]
   :id==="subhi-safo"
   ? [animate('[data-opening-veil="left"]',{opacity:0},{duration:.45,ease}),animate('[data-opening-veil="right"]',{opacity:0},{duration:.45,ease})]
   :id==="mehr-fasli"
   ? [animate('[data-opening-veil="left"]',{y:"110%",opacity:0},{duration:1.17,ease}),animate('[data-opening-veil="right"]',{x:"120%",opacity:0},{duration:.9,ease})]
   :[animate('[data-opening-veil="left"]',{x:"-110%",y:"-5%",opacity:0},{duration:1.18,ease}),animate('[data-opening-veil="right"]',{x:"110%",y:"5%",opacity:0},{duration:1.18,delay:.04,ease})];
  await Promise.all([
   animate('[data-cover-ink]',{opacity:0,y:-10},{duration:.3,ease:"easeOut"}),
   animate('[data-opening-prompt]',{opacity:0,y:8},{duration:.24,ease:"easeOut"}),
   animate('[data-opening-photo]',{scale:1},{duration:calm?.7:1.18,ease}),
   ...movement,
   animate(scope.current,{opacity:0},{duration:calm?.6:.38,delay:calm?.12:.88,ease:"easeOut"}),
  ]);
 }
 return <button ref={scope} type="button" data-open data-celebration-opening={id} data-opening-version="photographic-v2" data-ready={gate.ready||undefined} data-phase={gate.opening?"opening":"idle"} className={`${s.opening} ${className}`} aria-label={copy.open} aria-busy={gate.status==="loading"} onClick={()=>void gate.open(open)}>
  {/* eslint-disable-next-line @next/next/no-img-element -- Same decoded local WebP as the invitation's hero. */}
  <img data-opening-photo className={s.openingPhoto} src={artOf(id)} width="941" height="1672" alt="" aria-hidden="true" decoding="async"/>
  <span className={s.openingShade} aria-hidden="true"/><span data-opening-veil="left" className={s.veilLeft} aria-hidden="true"/><span data-opening-veil="right" className={s.veilRight} aria-hidden="true"/>
  <span data-cover-ink className={s.coverInk}><span className={s.kicker}>{copy.invitation}</span><span className={s.coverTitle}>{t.occasionTitles[inv.occasion]}</span>{inv.occasion==="yubiley"&&inv.data.age!=null&&<span className={s.coverAge}>{inv.data.age}<small>{t.ageLabel}</small></span>}<span data-opening-name ref={ref} className={s.coverName}><Words text={inv.data.person??""}/></span><span data-opening-date className={s.coverDate}>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)} · {e.time}</span><span data-opening-hosts className={s.coverHosts}>{inv.data.hosts}</span></span>
  <span data-opening-prompt className={s.openPrompt} role="status">{gate.status==="loading"?copy.loading:gate.status==="error"?copy.retry:copy.open}<i aria-hidden="true">↗</i></span>
 </button>;
}
