"use client";
import {useAnimate} from "motion/react";
import {t,luxuryWeddingCopy as copy} from "@/texts/uz-cyrl";
import type {Invitation} from "../../blocks/useInvitation";
import {initials,photos,reception} from "../vip-masterpiece/model";
import {useCeremony} from "../vip-masterpiece/useCeremony";
import s from "./silk.module.css";
export function SilkOpening({inv}:{inv:Invitation}){
 const [scope,animate]=useAnimate<HTMLButtonElement>(),photo=photos(inv.data,"vip-ipak-ziyosi")[0],gate=useCeremony(inv,["/vip/vip-ipak-ziyosi/ceremony-silk.webp","/vip/vip-ipak-ziyosi/ceremony-2.webp",{src:photo.src,fallback:photo.fallback}]);
 if(inv.opened)return null;const [a,b]=initials(inv.data),w=reception(inv).when;
 async function unfold(){const ease=[.42,0,.16,1] as const;await Promise.all([
  animate("[data-silk-knot]",{scale:.75,rotate:24,opacity:0},{duration:.38,ease:"easeInOut"}),
  animate("[data-silk-near]",{x:"-112%",y:"-18%",rotate:-19,rotateY:-28},{duration:1.35,delay:.08,ease}),
  animate("[data-silk-far]",{x:"106%",y:"-32%",rotate:17,rotateY:34},{duration:1.4,delay:.22,ease}),
  animate("[data-silk-gauze]",{y:"112%",rotateX:-22,opacity:0},{duration:1.15,delay:.4,ease}),
  animate("[data-silk-ink]",{opacity:0,y:-10},{duration:.38,ease:"easeOut"}),
 ]);}
 return <button ref={scope} className={s.opening} type="button" data-open data-master-opening="silk-ceremony-v2" data-ready={gate.ready||undefined} data-phase={gate.opening?"opening":"idle"} aria-busy={gate.status==="loading"} aria-label={copy(inv.lang).open} onClick={()=>void gate.open(unfold)}>
  <span data-silk-gauze className={s.gauze}/><span data-silk-far className={s.veilFar}/><span data-silk-near className={s.veilNear}/><span data-silk-knot className={s.knot} aria-hidden="true"><i/><i/></span>
  <span data-silk-ink className={s.openInk}><span className={s.eyebrow}>{copy(inv.lang).invitation}</span><span className={s.openMonogram} aria-label={`${a} ${b}`}>{a}<i>{b}</i></span><span className={s.openNames}>{inv.data.groom}<i>{t.natural.and}</i>{inv.data.bride}</span><span className={s.openDate}>{t.date.long(w.day,w.monthIndex,w.year)}</span></span>
  <span data-silk-ink className={s.openPrompt} role="status">{gate.status==="error"?copy(inv.lang).retry:gate.status==="loading"?copy(inv.lang).loading:copy(inv.lang).open}<i>↗</i></span>
 </button>;
}
