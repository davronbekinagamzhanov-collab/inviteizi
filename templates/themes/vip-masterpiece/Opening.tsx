"use client";
import {useCallback,useEffect,useRef,useState,type CSSProperties} from "react";
import {useAnimate,useReducedMotion} from "motion/react";
import {luxuryWeddingCopy as copy,t} from "@/texts/uz-cyrl";
import type {Invitation} from "../../blocks/useInvitation";
import {initials,looks,photos,reception,type MasterpieceId} from "./model";
import s from "./masterpiece.module.css";
export function Opening({inv,id}:{inv:Invitation;id:MasterpieceId}){
 const [scope,animate]=useAnimate<HTMLButtonElement>(),[phase,setPhase]=useState("idle"),[status,setStatus]=useState("idle");
 const busy=useRef(false),alive=useRef(true),ready=useRef<Promise<void>|null>(null),reduced=useReducedMotion();
 const material=`/vip/${id}/material.webp`,photo=photos(inv.data,id)[0],kind=looks[id].kind;
 const preload=useCallback(()=>{const decode=async(src:string)=>{const image=new Image();image.src=src;await image.decode();};return Promise.all([decode(material),decode(photo.src).catch(()=>decode(photo.fallback)),document.fonts.ready]).then(()=>undefined);},[material,photo.src,photo.fallback]);
 useEffect(()=>{alive.current=true;ready.current=preload();void ready.current.then(()=>{if(alive.current)scope.current?.setAttribute("data-ready","true");}).catch(()=>{});return()=>{alive.current=false;};},[preload,scope]);
 async function open(){if(busy.current)return;busy.current=true;inv.start();setStatus("loading");try{await(ready.current??preload());}catch{busy.current=false;ready.current=null;if(alive.current)setStatus("error");return;}if(!alive.current)return;if(reduced){inv.finishOpening();return;}setPhase("opening");setStatus("idle");const ease=[.45,0,.18,1] as const;
 await Promise.all(kind==="silk"?[
  animate("[data-cover-left]",{y:"-100dvh",x:"-12%",rotate:-8},{duration:1.55,ease}),
  animate("[data-cover-right]",{y:"100dvh",x:"12%",rotate:8},{duration:1.55,delay:.04,ease}),
  animate("[data-cover-ink]",{opacity:0},{duration:.35,ease:"easeOut"}),
 ]:[
  animate("[data-cover-left]",{x:"-62%",rotateY:-55},{duration:1.7,ease}),
  animate("[data-cover-right]",{x:"62%",rotateY:55},{duration:1.7,delay:.04,ease}),
  animate("[data-cover-ink]",{opacity:0},{duration:.35,ease:"easeOut"}),
 ]);if(alive.current)inv.finishOpening();}
 if(inv.opened)return null;const mono=initials(inv.data),w=reception(inv).when;
 return <button ref={scope} type="button" data-open data-master-opening={kind} data-phase={phase} aria-label={copy(inv.lang).open} aria-busy={status==="loading"} onClick={open} className={`${s.opening} ${s[kind]}`} style={{"--opening-material":`url(${material})`} as CSSProperties}><span data-cover-left className={s.coverLeft}/><span data-cover-right className={s.coverRight}/><span data-cover-ink className={s.coverInk}><span className={s.coverTop}>{copy(inv.lang).invitation}</span><span className={s.coverCrest}><span className={s.crestLine}/><span className={s.coverMono}>{mono[0]}<i>{mono[1]}</i></span><span className={s.coverNames}>{inv.data.groom}<i>{t.natural.and}</i>{inv.data.bride}</span><span className={s.coverDate}>{t.date.long(w.day,w.monthIndex,w.year)}</span></span><span className={s.coverPrompt} role="status">{status==="error"?copy(inv.lang).retry:status==="loading"?copy(inv.lang).loading:copy(inv.lang).open}<span>↓</span></span><span className={s.coverFoot}>{copy(inv.lang).love}</span></span></button>;
}
