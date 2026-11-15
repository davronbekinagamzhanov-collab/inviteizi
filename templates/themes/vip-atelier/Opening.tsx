"use client";

import {useCallback, useEffect, useRef, useState, type CSSProperties} from "react";
import {useAnimate, useReducedMotion} from "motion/react";
import {t} from "@/texts/uz-cyrl";
import type {Invitation} from "../../blocks/useInvitation";
import {atelier, atelierPhotos, type AtelierId} from "./model";
import {Monogram, Ornament} from "./Parts";
import s from "./atelier.module.css";

export function AtelierOpening({inv, id}: {inv: Invitation; id: AtelierId}) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const [phase, setPhase] = useState("idle");
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const ready = useRef<Promise<void> | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const reduced = useReducedMotion();
  const config = atelier[id];
  const hero = atelierPhotos(inv.data,id)[0];
  const preload = useCallback(() => {
    const decode = async (src: string) => {const image = new Image(); image.src = src; await image.decode();};
    return Promise.all([
      decode(config.defaults[0]),
      decode(hero.src).catch(() => decode(hero.fallback)),
      document.fonts.ready,
    ]).then(() => undefined);
  }, [config.defaults, hero.src, hero.fallback]);

  useEffect(() => {
    alive.current = true;
    ready.current = preload();
    void ready.current.then(() => {if(alive.current)scope.current?.setAttribute("data-ready","true");}).catch(() => {});
    return () => {alive.current = false;};
  }, [preload, scope]);

  async function open() {
    if(busy.current)return;
    busy.current = true;
    inv.start();
    setStatus("loading");
    try {await (ready.current ?? preload());}
    catch {busy.current = false; if(alive.current)setStatus("error"); ready.current = null; return;}
    if(!alive.current)return;
    if(reduced){inv.finishOpening();return;}
    setStatus("ready");
    setPhase("opening");
    const ease = [.22,.61,.24,1] as const;
    const kind = config.kind;
    const duration = 1.65;
    const panels = kind === "garden"
      ? [animate("[data-opening-left]",{x:"-105%",rotateY:-24},{duration,ease}),animate("[data-opening-right]",{x:"105%",rotateY:24},{duration,ease})]
      : kind === "pearl"
      ? [animate("[data-opening-left]",{y:"-66dvh",rotate:-2},{duration,ease}),animate("[data-opening-right]",{y:"53dvh",rotate:2},{duration,ease})]
      : kind === "album"
      ? [animate("[data-opening-left]",{x:"-102%",rotateY:-72},{duration,ease})]
      : [animate("[data-opening-left]",{y:"-105%",opacity:[1,1,0]},{duration,ease})];
    await Promise.all([...panels,
      animate("[data-opening-ink]",{opacity:0,y:-12},{duration:.65,ease}),
      animate("[data-opening-medallion]",{scale:.92,opacity:0},{duration:.65,ease}),
    ]);
    if(alive.current)inv.finishOpening();
  }

  if(inv.opened)return null;
  const wedding = inv.occasion === "nikoh";
  return <button ref={scope} type="button" data-open data-atelier-opening={config.kind} data-phase={phase} aria-label={t.opening.tapToOpen} aria-busy={status==="loading"} onClick={open} className={`${s.opening} ${s[config.kind]}`} style={{"--opening-art":`url(${config.defaults[0]})`} as CSSProperties}>
    <span data-opening-left className={s.panelLeft} />
    {(config.kind === "pearl" || config.kind === "garden") && <span data-opening-right className={s.panelRight} />}
    <span data-opening-ink className={s.openingTop}>{t.vip.privateLetter}</span>
    <span data-opening-ink className={s.openingIdentity}>
      <Ornament />
      {wedding ? <Monogram data={inv.data} /> : config.kind==="album" ? <span className={s.openingAge}>{inv.data.age}<small>{t.ageLabel}</small></span> : <span className={s.horseEmblem}><Horse /></span>}
      <span className={s.openingNames}>{wedding ? <>{inv.data.groom}<i>{t.natural.and}</i>{inv.data.bride}</> : inv.data.person}</span>
      <span className={s.eyebrow}>{t.occasionTitles[inv.occasion]}</span>
      <span className={s.openingDate}>{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</span>
    </span>
    <span data-opening-medallion className={s.medallion} aria-hidden="true">{wedding ? <Monogram data={inv.data} /> : <Ornament />}</span>
    <span data-opening-ink role="status" className={s.openPrompt}>{status==="error" ? t.vip.retry : status==="loading" ? t.vip.loading : t.vip.openMe}<span>↓</span></span>
    <span data-opening-ink className={s.openingFoot}>{t.vip.withLove}</span>
  </button>;
}
function Horse(){return <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true"><path d="M23 80q25-24 21-43L33 28l15-7 9-15 5 17 17 9 3 17-8 4-15-8q5 20 19 35M44 37q13-9 18-14M32 79h47M28 85h57M39 31q-10 6-9 17"/><circle cx="65" cy="32" r="1.4" fill="currentColor"/></svg>;}
