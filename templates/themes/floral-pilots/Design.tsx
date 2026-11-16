"use client";
/* eslint-disable @next/next/no-img-element -- Locally sized artwork and photographic paper layers. */
import {useEffect,useRef,useState,type CSSProperties} from "react";
import {useReducedMotion} from "motion/react";
import type {TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Countdown} from "../../blocks/Countdown";
import {MapButton} from "../../blocks/MapButton";
import {HandCalendar} from "../natural/kit";
import {naturalFonts} from "../natural/fonts";
import {venues} from "../natural/common";
import {t} from "@/texts/uz-cyrl";
import {melody} from "../ipak/melody";
import s from "./pilots.module.css";
type PilotId="girih-barg"|"suvbuyoq-tuman";
function Art({id,part}:{id:PilotId;part:number}){return <img src={`/art/floral-polish/${id}-${part}.webp`} alt="" aria-hidden loading={part===1?"eager":"lazy"} className={s.art}/>;}
export function WeddingPilot({data,mode,id}:TemplateProps&{id:PilotId}){
 const animated=id==="girih-barg",inv=useInvitation(data,mode,{melody,opening:animated}),reduced=useReducedMotion(),locked=useRef(false),timer=useRef<ReturnType<typeof setTimeout>>(undefined),[ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false;const sources=animated?["/art/floral-pilots/paper.webp","/art/floral-pilots/seal.webp",`/art/floral-polish/${id}-1.webp`]:[];Promise.all(sources.map(src=>{const image=new Image();image.src=src;return image.decode().catch(()=>undefined);})).then(()=>{if(!cancelled)setReady(true);});return()=>{cancelled=true;clearTimeout(timer.current);};},[id,animated]);
 const open=()=>{if(!ready||locked.current)return;locked.current=true;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:1800);};
 const w=inv.main.when,ink=animated?"#344a3c":"#35516b",names=<><span>{data.groom}</span><i>{t.natural.and}</i><span>{data.bride}</span></>;
 const date=t.date.long(w.day,w.monthIndex,w.year),placeList=venues(inv);
 const vars={"--n-paper":"#fcf9f2","--n-ink":ink,"--n-accent":ink,"--ink":ink} as CSSProperties;
 const calendar=<section className={s.date}><p className={s.eyebrow}>{t.natural.date}</p><h2>{date}</h2><HandCalendar date={w}/><p className={s.clock}>{t.weekdays[w.weekdayIndex]} · {t.date.clock(inv.main.time)}</p><Art id={id} part={2}/></section>;
 const program=<section className={s.program}><p className={s.eyebrow}>{t.natural.program}</p><ol>{inv.program.map((e,i)=><li key={i}><time>{t.date.clock(e.time)}</time><div><h3 data-event>{e.title}</h3><p>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p>{e.venueName}</p></div></li>)}</ol></section>;
 const locations=<section className={s.locations}><p className={s.eyebrow}>{t.natural.place}</p>{placeList.map((e,i)=><article key={i}><h2>{e.venueName}</h2><p>{e.address}</p><MapButton href={e.mapHref} className={s.map} iconClassName="text-current"/></article>)}</section>;
 return <InvitationShell inv={inv} style={vars} fontsClassName={naturalFonts} pageColor="#fcf9f2" className={`${s.page} ${animated?s.botanical:s.blue}`} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:"#fcf9f2",ink,line:"#d6d4c8",soft:"#f0ede3",accent:ink,font:"var(--n-text)",radius:"8px",buttonRadius:"999px"}} epilogue={<footer className={s.signature}><Art id={id} part={3}/><div><p>{t.hosts.respect}</p><h2>{data.hosts}</h2>{inv.sides&&<div className={s.families}><p>{t.sides.groom}<strong>{inv.sides.groom}</strong></p><p>{t.sides.bride}<strong>{inv.sides.bride}</strong></p></div>}<p className={s.wait}>{t.natural.wait}</p></div></footer>}>
  <header className={s.hero}><Art id={id} part={1}/><div className={s.heroText}><p className={s.eyebrow}>{t.occasionTitles.nikoh}</p><h1>{names}</h1><p className={s.heroDate}>{date}</p></div></header>
  <section className={s.letter}>{inv.text.greeting&&<h2>{inv.text.greeting}</h2>}<p>{inv.text.body}</p></section>
  {animated?<>{calendar}{program}{locations}</>:<>{program}{calendar}{locations}</>}
  {animated&&<section className={s.count}><p className={s.eyebrow}>{t.countdown.title.nikoh}</p><Countdown startsAt={w.startsAt} look={{grid:s.countGrid,box:s.countBox,number:s.countNum,label:s.countLabel}}/></section>}
  {animated&&!inv.opened&&<button data-open data-mechanism="paper-envelope" data-started={inv.started} disabled={!ready||inv.started} className={s.envelope} onClick={open} aria-label={t.opening.tapToOpen}>
   <span className={s.pocket} aria-hidden/>
   <span className={s.flap} aria-hidden/>
   <span className={s.coverText}><span className={s.eyebrow}>{t.occasionTitles.nikoh}</span><strong>{names}</strong><span className={s.coverDate}>{date}</span></span>
   <img className={s.seal} src="/art/floral-pilots/seal.webp" alt="" aria-hidden/>
   <span data-open-prompt className={s.tap}>{t.opening.tapToOpen}</span>
  </button>}
 </InvitationShell>;
}
