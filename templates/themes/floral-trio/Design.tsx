"use client";
/* eslint-disable @next/next/no-img-element -- Sized local watercolor plates and photographed folio. */
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from "react";
import {useReducedMotion} from "motion/react";
import type {TemplateProps} from "../types";
import type {Score} from "../../blocks/synth";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Countdown} from "../../blocks/Countdown";
import {MapButton} from "../../blocks/MapButton";
import {HandCalendar} from "../natural/kit";
import {naturalFonts} from "../natural/fonts";
import {venues} from "../natural/common";
import {t} from "@/texts/uz-cyrl";
import s from "./trio.module.css";

type TrioId="gul-doira"|"suvbuyoq-zumrad"|"suvbuyoq-upa";
const skins={"gul-doira":{className:s.rose,ink:"#67483f",paper:"#fcf8f0"},"suvbuyoq-zumrad":{className:s.emerald,ink:"#214b3b",paper:"#fbf8ed"},"suvbuyoq-upa":{className:s.blush,ink:"#784d56",paper:"#fdf7f1"}};
const cover="/art/floral-trio/gul-folio.webp";
function Art({id,part}:{id:TrioId;part:number}){return <img src={`/art/floral-polish/${id}-${part}.webp`} alt="" aria-hidden className={s.art} loading={part===1?"eager":"lazy"}/>;}

/** Three print compositions. Only data-driven blocks are shared; their architecture is explicit below. */
export function WeddingTrio({data,mode,id,melody}:TemplateProps&{id:TrioId;melody:Score}){
 const animated=id==="gul-doira",inv=useInvitation(data,mode,{melody,opening:animated}),skin=skins[id],w=inv.main.when;
 const names=<><span>{data.groom}</span><i>{t.natural.and}</i><span>{data.bride}</span></>;
 const date=t.date.long(w.day,w.monthIndex,w.year);
 const vars={"--n-paper":skin.paper,"--n-ink":skin.ink,"--n-accent":skin.ink,"--ink":skin.ink,"--paper":skin.paper} as CSSProperties;
 const heading=<div className={s.names}><p className={s.eyebrow}>{t.occasionTitles.nikoh}</p><h1>{names}</h1><p className={s.heroDate}>{date}</p></div>;
 const letter=<section className={s.letter}>{inv.text.greeting&&<h2>{inv.text.greeting}</h2>}<p>{inv.text.body}</p></section>;
 const calendar=<section className={s.date}><div className={s.calendarPaper}><p className={s.eyebrow}>{t.natural.date}</p><h2>{date}</h2><HandCalendar date={w} title={false} heart={animated}/><p className={s.clock}>{t.weekdays[w.weekdayIndex]} · {t.date.clock(inv.main.time)}</p></div></section>;
 const dateArtwork=<div className={s.dateArtwork}><Art id={id} part={2}/></div>;
 const program=<section className={s.program}><h2>{t.natural.program}</h2><ol>{inv.program.map((e,i)=><li key={i}><time>{t.date.clock(e.time)}</time><div><h3 data-event>{e.title}</h3><p>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p>{e.venueName}</p></div></li>)}</ol></section>;
 const locations=<section className={s.locations}><p className={s.eyebrow}>{t.natural.place}</p>{venues(inv).map((e,i)=><article key={i}><h2>{e.venueName}</h2><p>{e.address}</p><MapButton href={e.mapHref} className={s.map} iconClassName="text-current"/></article>)}</section>;
 const signature=<footer className={s.signature}><Art id={id} part={3}/><div><p>{t.hosts.respect}</p><h2>{data.hosts}</h2>{inv.sides&&<div className={s.families}><p>{t.sides.groom}<strong>{inv.sides.groom}</strong></p><p>{t.sides.bride}<strong>{inv.sides.bride}</strong></p></div>}<p className={s.wait}>{t.natural.wait}</p></div></footer>;
 return <InvitationShell inv={inv} style={vars} fontsClassName={naturalFonts} pageColor={skin.paper} className={`${s.page} ${skin.className}`} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:skin.paper,ink:skin.ink,line:skin.ink+"35",soft:skin.paper,accent:skin.ink,font:"var(--n-text)",radius:"8px",buttonRadius:"999px"}} epilogue={signature}>
  <main data-layout={id}>
   {id==="gul-doira"&&<><header className={s.hero}><Art id={id} part={1}/>{heading}</header>{letter}{calendar}{dateArtwork}{program}{locations}<section className={s.count}><p className={s.eyebrow}>{t.countdown.title.nikoh}</p><Countdown startsAt={w.startsAt} look={{grid:s.countGrid,box:s.countBox,number:s.countNum,label:s.countLabel}}/></section></>}
   {id==="suvbuyoq-zumrad"&&<><header className={s.hero}><Art id={id} part={1}/><div className={s.titleFrame}>{heading}</div></header><div className={s.ceremony}>{letter}{program}</div>{dateArtwork}{locations}{calendar}</>}
   {id==="suvbuyoq-upa"&&<><header className={s.letterhead}>{heading}<Art id={id} part={1}/></header>{letter}{locations}{program}{dateArtwork}{calendar}</>}
  </main>
  {animated&&!inv.opened&&<Folio names={names} date={date} started={inv.started} start={inv.start} finish={inv.finishOpening}/>}
 </InvitationShell>;
}

function Folio({names,date,started,start,finish}:{names:ReactNode;date:string;started:boolean;start:()=>void;finish:()=>void}){
 const reduced=useReducedMotion(),locked=useRef(false),timer=useRef<ReturnType<typeof setTimeout>>(undefined),[ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false;Promise.all([cover,"/art/floral-polish/gul-doira-1.webp"].map(src=>{const image=new Image();image.src=src;return image.decode().catch(()=>undefined);})).then(()=>{if(!cancelled)setReady(true);});return()=>{cancelled=true;clearTimeout(timer.current);};},[]);
 const open=()=>{if(!ready||locked.current)return;locked.current=true;start();timer.current=setTimeout(finish,reduced?0:1800);};
 return <button data-open data-mechanism="floral-folded-folio" data-started={started} disabled={!ready||started} className={s.opening} onClick={open} aria-label={t.opening.tapToOpen}>
  <span className={s.surface} aria-hidden/>
  <span className={s.folio}>
   <span className={s.leaf} aria-hidden><span className={s.inside}><span className={s.eyebrow}>{t.occasionTitles.nikoh}</span><strong>{names}</strong><span className={s.coverDate}>{date}</span></span></span>
   <span className={s.front}><img src={cover} alt="" aria-hidden/><span className={s.coverNames}><span className={s.eyebrow}>{t.occasionTitles.nikoh}</span><strong>{names}</strong><span className={s.coverDate}>{date}</span></span></span>
  </span>
  <span className={s.tap}>{t.opening.tapToOpen}</span>
 </button>;
}
