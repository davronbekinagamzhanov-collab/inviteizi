"use client";

import {useCallback,useEffect,useRef,useState,type CSSProperties} from "react";
import {useAnimate,useReducedMotion} from "motion/react";
import {t} from "@/texts/uz-cyrl";
import type {Invitation} from "../../blocks/useInvitation";
import {signature,signaturePhotos,weddingEvent,type SignatureId} from "./model";
import {Monogram} from "./Parts";
import s from "./signature.module.css";
import {weddingCopy} from "./copy";

/** Two material-specific openings: drawn silk curtains and a heavy hinged paper cover. */
export function SignatureOpening({inv,id}:{inv:Invitation;id:SignatureId}){
  const [scope,animate]=useAnimate<HTMLButtonElement>();
  const [phase,setPhase]=useState("idle");
  const [status,setStatus]=useState<"idle"|"loading"|"error">("idle");
  const locked=useRef(false),alive=useRef(true),ready=useRef<Promise<void>|null>(null);
  const reduced=useReducedMotion();
  const config=signature[id],hero=signaturePhotos(inv.data,id)[0];
  const material=`/vip/${id}/${config.material}.webp`;
  const preload=useCallback(()=>{
    const decode=async(src:string)=>{const image=new Image();image.src=src;await image.decode();};
    return Promise.all([decode(material),decode(hero.src).catch(()=>decode(hero.fallback)),document.fonts.ready]).then(()=>undefined);
  },[material,hero.src,hero.fallback]);
  useEffect(()=>{
    alive.current=true;ready.current=preload();
    void ready.current.then(()=>{if(alive.current)scope.current?.setAttribute("data-ready","true");}).catch(()=>{});
    return()=>{alive.current=false;};
  },[preload,scope]);
  async function open(){
    if(locked.current)return;locked.current=true;inv.start();setStatus("loading");
    try{await(ready.current??preload());}catch{locked.current=false;ready.current=null;if(alive.current)setStatus("error");return;}
    if(!alive.current)return;
    if(reduced){inv.finishOpening();return;}
    setStatus("idle");setPhase("opening");
    const ease=[.42,0,.18,1] as const;
    if(config.kind==="cinema"){
      await Promise.all([
        animate("[data-curtain=left]",{x:"-57%",rotate:-1.5},{duration:1.55,ease}),
        animate("[data-curtain=right]",{x:"57%",rotate:1.5},{duration:1.55,delay:.04,ease}),
        animate("[data-cover-ink]",{opacity:0,y:-8},{duration:.42,ease:"easeOut"}),
      ]);
    }else{
      await Promise.all([
        animate("[data-paper-cover]",{y:"-112dvh",rotateX:-34},{duration:1.65,ease}),
        animate("[data-paper-ink]",{opacity:0},{duration:.4,ease:"easeOut"}),
      ]);
    }
    if(alive.current)inv.finishOpening();
  }
  if(inv.opened)return null;
  const when=weddingEvent(inv).when;
  const ink=<><span className={s.coverEyebrow}>{weddingCopy(inv.lang).privateLetter}</span><span className={s.coverIdentity}><Monogram data={inv.data}/><span className={s.coverNames}>{inv.data.groom}<i>{t.natural.and}</i>{inv.data.bride}</span><span className={s.coverDate}>{t.date.long(when.day,when.monthIndex,when.year)}</span></span><span className={s.coverPrompt} role="status">{status==="error"?weddingCopy(inv.lang).retry:status==="loading"?weddingCopy(inv.lang).loading:weddingCopy(inv.lang).openMe}<span>↓</span></span><span className={s.coverFoot}>{weddingCopy(inv.lang).withLove}</span></>;
  return <button ref={scope} type="button" data-open data-signature-opening={config.kind} data-phase={phase} aria-label={t.opening.tapToOpen} aria-busy={status==="loading"} onClick={open} className={`${s.opening} ${s[config.kind]}`} style={{"--cover-material":`url(${material})`} as CSSProperties}>
    {config.kind==="cinema"?<><span data-curtain="left" className={s.curtainLeft}/><span data-curtain="right" className={s.curtainRight}/><span data-cover-ink className={s.coverInk}>{ink}</span></>:<span data-paper-cover className={s.paperCover}><span data-paper-ink className={s.coverInk}>{ink}</span></span>}
  </button>;
}
