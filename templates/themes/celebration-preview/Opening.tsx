"use client";
import {useAnimate} from "motion/react";
import {useFitWords,Words} from "../../blocks/FitWords";
import type {Invitation} from "../../blocks/useInvitation";
import {useCeremony} from "../vip-masterpiece/useCeremony";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {artOf,mainEvent} from "./model";
import s from "./shared.module.css";

/** The entire cover is the accessible touch surface; there is no separate visual button. */
export function Opening({inv,id,className}:{inv:Invitation;id:"sahar-sabosi";className:string}){
 const [scope,animate]=useAnimate<HTMLButtonElement>();
 const gate=useCeremony(inv,[artOf(id)]),ref=useFitWords<HTMLSpanElement>(46),e=mainEvent(inv),copy=celebrationCopy(inv.lang);
 async function open(){
  const ease=[.22,.68,.2,1] as const;
  // Two correctly aligned halves of the same photograph reveal the finished page through their opening.
  // No image remains above the page when the leaves move, and no mirrored or 3D photo fragments are used.
  await Promise.all([
   animate('[data-cover-ink]',{opacity:0,y:-12},{duration:.3,ease:"easeOut"}),
   animate('[data-opening-prompt]',{opacity:0},{duration:.2}),
   animate('[data-opening-leaf="left"]',{x:"-104%"},{duration:1.35,delay:.18,ease}),
   animate('[data-opening-leaf="right"]',{x:"104%"},{duration:1.35,delay:.23,ease}),
   animate(scope.current,{opacity:0},{duration:.16,delay:1.48,ease:"easeOut"}),
  ]);
 }
 return <button ref={scope} type="button" data-open data-celebration-opening={id} data-opening-version="courtyard-doors-v3" data-ready={gate.ready||undefined} data-phase={gate.opening?"opening":"idle"} className={`${s.opening} ${className}`} aria-label={copy.touch} aria-busy={gate.status==="loading"} onClick={()=>void gate.open(open)}>
  {(["left","right"] as const).map(side=><span key={side} data-opening-leaf={side} className={`${s.leaf} ${side==="left"?s.leafLeft:s.leafRight}`} aria-hidden="true">
   {/* eslint-disable-next-line @next/next/no-img-element -- Each half clips the same full-size, predecoded photograph. */}
   <img data-opening-photo className={s.openingPhoto} src={artOf(id)} width="941" height="1672" alt="" decoding="async"/>
  </span>)}
  <span data-cover-ink className={s.coverInk}>
   <span className={s.kicker}>{copy.respect}</span>
   <span className={s.coverTitle}>{t.occasionTitles.nahorgi}</span>
   <span data-opening-name ref={ref} className={s.coverName}><Words text={inv.data.person??""}/></span>
   <span data-opening-date className={s.coverDate}><span>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</span><strong>{e.time}</strong></span>
   <span data-opening-hosts className={s.coverHosts}>{inv.data.hosts}</span>
  </span>
  <span data-opening-prompt className={s.openPrompt} role="status">{gate.status==="loading"?copy.loading:gate.status==="error"?copy.retry:copy.touch}</span>
 </button>;
}
