"use client";
/* eslint-disable @next/next/no-img-element -- Optimized local artwork plates. */
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from "react";
import {useReducedMotion} from "motion/react";
import type {TemplateProps} from "../types";
import type {Score} from "../../blocks/synth";
import {useInvitation,type Invitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Countdown} from "../../blocks/Countdown";
import {MapButton} from "../../blocks/MapButton";
import {HandCalendar,Rise} from "../natural/kit";
import {naturalFonts} from "../natural/fonts";
import {venues} from "../natural/common";
import {t} from "@/texts/uz-cyrl";
import {compositions} from "./Compositions";
import s from "./polish.module.css";
export type FloralId="girih-barg"|"gul-doira"|"suvbuyoq-tuman"|"suvbuyoq-zumrad"|"suvbuyoq-upa";
const inks={"girih-barg":"#344a3c","gul-doira":"#63483e","suvbuyoq-tuman":"#354f68","suvbuyoq-zumrad":"#234f3e","suvbuyoq-upa":"#754b50"};
function BotanicalMark({variant}:{variant:number}){const bend=variant%2?12:-12;return <svg className={s.mark} viewBox="0 0 90 45" aria-hidden><g fill="none" stroke="currentColor" strokeWidth=".8"><path d={`M8 36 Q40 ${bend} 82 12`}/><path d={`M25 24Q10 4 33 18M43 18Q36 37 53 20M60 14Q49 0 67 9`}/><circle cx={75-variant*4} cy="13" r="3"/></g></svg>;}
function Art({id,part}:{id:FloralId;part:number}){return <img src={`/art/floral-polish/${id}-${part}.webp`} alt="" aria-hidden className={s.art} loading={part===1?"eager":"lazy"}/>;}
function Week({inv}:{inv:Invitation}){const w=inv.main.when,start=new Date(Date.UTC(w.year,w.monthIndex,w.day-w.weekdayIndex));return <div className={s.week} role="img" aria-label={t.patno.weekAria(t.date.long(w.day,w.monthIndex,w.year))}>{Array.from({length:7},(_,i)=><span key={i}><small>{t.weekdaysShort[i]}</small><b data-selected={i===w.weekdayIndex}>{new Date(start.getTime()+i*86400000).getUTCDate()}</b></span>)}</div>;}
/** Scoped to five animated Nikoh designs. Each of three artworks appears exactly once. */
export function FloralPolish({data,mode,id,melody}:TemplateProps&{id:FloralId;melody:Score}){
 const inv=useInvitation(data,mode,{melody,opening:!id.startsWith("suvbuyoq")}),reduced=useReducedMotion(),lock=useRef(false),timer=useRef<ReturnType<typeof setTimeout>>(undefined),[ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false;Promise.all((id.startsWith("suvbuyoq")?[1]:[1,3]).map(part=>{const image=new Image();image.src=`/art/floral-polish/${id}-${part}.webp`;return image.decode().catch(()=>undefined);})).then(()=>{if(!cancelled)setReady(true);});return()=>{cancelled=true;clearTimeout(timer.current);};},[id]);
 const open=()=>{if(lock.current||!ready)return;lock.current=true;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:1500);};
 const water=id.startsWith("suvbuyoq"),w=inv.main.when,ink=inks[id],names=<><span>{data.groom}</span><i>{t.natural.and}</i><span>{data.bride}</span></>;
 const vars={"--n-paper":"#fbf7ef","--n-ink":ink,"--n-accent":ink,"--ink":ink} as CSSProperties;

 const Composition=compositions[id];
 const masthead=<header className={s.masthead}><p>{t.occasionTitles.nikoh}</p><h1>{names}</h1></header>;
 const hero=(<header className={s.hero} data-unfold={inv.started}><Art id={id} part={1}/>{id!=="suvbuyoq-zumrad"&&<div className={s.title}><p className={s.kicker}>{t.occasionTitles.nikoh}</p><h1>{names}</h1><p>{t.date.long(w.day,w.monthIndex,w.year)}</p></div>}</header>);
 const letter=(<Rise className={s.letter}><BotanicalMark variant={1}/>{inv.text.greeting&&<h2>{inv.text.greeting}</h2>}<p>{inv.text.body}</p></Rise>);
 const calendar=(<div className={s.paperPanel}><section className={s.date}><BotanicalMark variant={2}/><h2>{t.natural.date}</h2>{water?<Week inv={inv}/>:<HandCalendar date={w}/>}<p>{t.date.long(w.day,w.monthIndex,w.year)} · {t.date.clock(inv.main.time)}</p></section><Art id={id} part={2}/></div>);
 const countdown=(!water&&<section className={s.count}><p>{t.countdown.title.nikoh}</p><Countdown startsAt={w.startsAt} look={{number:s.countNum,box:s.countBox,grid:s.countGrid,label:s.countLabel}}/></section>);
 const program=((water||inv.program.length>1)&&<section className={s.program}><BotanicalMark variant={3}/><h2>{t.natural.program}</h2><ol>{inv.program.map((e,i)=><li key={i}><b>{t.date.clock(e.time)}</b><div><h3 data-event>{e.title}</h3><p>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p>{e.venueName}</p></div></li>)}</ol></section>);
 const places=(<section className={s.places}><BotanicalMark variant={5}/><h2>{t.natural.place}</h2>{venues(inv).map((e,i)=><article key={i}><h3>{e.venueName}</h3><p>{e.address}</p><MapButton href={e.mapHref} className={s.map}/></article>)}{water&&<Art id={id} part={3}/>}</section>);
 return <InvitationShell inv={inv} style={vars} fontsClassName={naturalFonts} pageColor="#fbf7ef" className={`${s.page} ${s[id]}`} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:"#fffdf8",ink,line:"#d5cbbb",soft:"#f0eade",accent:ink,font:"var(--n-text)",radius:"12px",buttonRadius:"999px"}} epilogue={<footer className={s.sign}><BotanicalMark variant={4}/><p>{t.hosts.respect}</p><h3>{data.hosts}</h3>{inv.sides&&<div className={s.families}><p>{t.sides.groom}<strong>{inv.sides.groom}</strong></p><p>{t.sides.bride}<strong>{inv.sides.bride}</strong></p></div>}<p className={s.wait}>{t.natural.wait}</p></footer>}>
  <main data-layout={id}>
   <Composition masthead={masthead} hero={hero} letter={letter} calendar={calendar} countdown={countdown} program={program} places={places}/>
  </main>
  {!water&&!inv.opened&&<Opening id={id} kind={id==="girih-barg"?"girih":"flower"} started={inv.started} ready={ready} onOpen={open} names={names} date={t.date.long(w.day,w.monthIndex,w.year)}/>}

 </InvitationShell>;
}

function Opening({id,kind,started,ready,onOpen,names,date}:{id:FloralId;kind:"girih"|"flower";started:boolean;ready:boolean;onOpen:()=>void;names:ReactNode;date:string}){
 return <button data-open data-mechanism={kind} data-started={started} className={`${s.reveal} ${kind==="girih"?s.gate:s.flower}`} disabled={!ready||started} onClick={onOpen} aria-label={t.opening.tapToOpen}>
  <Art id={id} part={3}/>
  <span className={s.coverType}><small>{t.occasionTitles.nikoh}</small><strong>{names}</strong><span>{date}</span><small>{t.opening.tapToOpen}</small></span>
 </button>;
}
