"use client";
/* eslint-disable @next/next/no-img-element -- Local generated photographic plates and optional order photo URLs. */
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from "react";
import {InvitationShell} from "../../blocks/InvitationShell";
import {useInvitation,type Invitation} from "../../blocks/useInvitation";
import {MapButton} from "../../blocks/MapButton";
import {Countdown} from "../../blocks/Countdown";
import {Words,useFitWords} from "../../blocks/FitWords";
import {naturalFonts} from "../natural/fonts";
import {melody} from "../oq-ot/melody";
import {mainEvent} from "./model";
import {monthGrid} from "@/lib/wedding-date";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import type {TemplateProps} from "../types";
import s from "./collection.module.css";
export {mainEvent};
export function useJubilee({data,mode}:TemplateProps,opening=false){return useInvitation(data,mode,{opening,initialLanguage:"uz",melody});}
export function Frame({inv,className,ink,paper,children,simple=false,ending}:{inv:Invitation;className:string;ink:string;paper:string;children:ReactNode;simple?:boolean;ending?:ReactNode}){
 const vars={"--ink":ink,"--paper":paper,"--n-paper":paper,"--n-ink":ink,"--n-accent":ink} as CSSProperties;
 return <InvitationShell inv={inv} style={vars} fontsClassName={naturalFonts} className={`${s.page} ${simple?s.simple:""} ${className}`} pageColor={paper} musicVariant="soft" brandVariant="soft" rsvpLook={{paper,ink,line:ink+"45",soft:paper,accent:ink,font:"var(--n-text)",radius:"4px",buttonRadius:"999px"}} epilogue={ending}>{children}</InvitationShell>;
}
export function Person({inv,max=52,className=""}:{inv:Invitation;max?:number;className?:string}){const ref=useFitWords<HTMLHeadingElement>(max);return <h1 ref={ref} data-person-name className={`${s.person} ${className}`}><Words text={inv.data.person||inv.data.hosts}/></h1>;}
export function DateLine({inv,showTime=true}:{inv:Invitation;showTime?:boolean}){const e=mainEvent(inv),d=e.when;return <p className={s.dateLine}><time dateTime={`${e.date}T${e.time}`}>{t.date.long(d.day,d.monthIndex,d.year)}{showTime&&<> · {t.date.clock(e.time)}</>}</time></p>;}
export function Letter({inv,compact=false}:{inv:Invitation;compact?:boolean}){return <section data-section="letter" className={`${s.letter} ${compact?s.compact:""}`}>{inv.text.greeting&&<h2>{inv.text.greeting}</h2>}<p>{inv.text.body}</p></section>;}
export function Calendar({inv,compact=false}:{inv:Invitation;compact?:boolean}){
 const e=mainEvent(inv),d=e.when,start=new Date(Date.UTC(d.year,d.monthIndex,d.day-d.weekdayIndex));
 return <section data-section="date" className={`${s.calendar} ${compact?s.compactCalendar:""}`}><p className={s.kicker}>{t.date.title.yubiley}</p>{!compact&&<div className={s.dateHeading}><strong>{d.day}</strong><p>{t.date.monthYear(d.monthIndex,d.year)}<time dateTime={`${e.date}T${e.time}`}>{e.time}</time></p></div>}<div data-calendar-grid role="img" aria-label={t.natural.calendarAria(t.date.long(d.day,d.monthIndex,d.year))} className={compact?s.week:s.month}>
  {compact?Array.from({length:7},(_,i)=><span key={i}><small>{t.weekdaysShort[i]}</small><b aria-current={i===d.weekdayIndex?"date":undefined}>{new Date(start.getTime()+i*86400000).getUTCDate()}</b></span>):<>{t.weekdaysShort.map(x=><span className={s.weekday} key={x}>{x}</span>)}{monthGrid(d.year,d.monthIndex).flat().map((day,i)=><span key={i} aria-current={day===d.day?"date":undefined}>{day}</span>)}</>}
 </div></section>;
}
export function Timer({inv}:{inv:Invitation}){const e=mainEvent(inv);return <div data-celebration-countdown data-target-at={e.when.startsAt.toISOString()} className={s.countdown}><p className={s.kicker}>{t.countdown.title.yubiley}</p><Countdown startsAt={e.when.startsAt} look={{grid:s.countGrid,box:s.countBox,number:s.countNumber,label:s.countLabel}}/></div>;}
export function Events({inv,compact=false}:{inv:Invitation;compact?:boolean}){return <section data-section="venue" className={`${s.events} ${compact?s.compactEvents:""}`}>{!compact&&<><p className={s.kicker}>{celebrationCopy(inv.lang).meeting}</p><h2>{t.natural.program}</h2></>}{inv.program.map((e,i)=><article data-event key={`${e.kind}-${e.date}-${i}`}><div className={s.eventBody}><p className={s.eventTitle}>{e.title}</p><p className={s.eventDate}><time dateTime={`${e.date}T${e.time}`}>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}<strong>{t.date.clock(e.time)}</strong></time></p><h3>{e.venueName}</h3><p data-address>{e.address}</p></div>{compact?<a className={s.pin} href={e.mapHref} target="_blank" rel="noopener noreferrer" aria-label={t.venue.openMap} title={t.venue.openMap}><svg viewBox="0 0 24 24" aria-hidden><path d="M12 21s7-7.2 7-12A7 7 0 0 0 5 9c0 4.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg></a>:<MapButton href={e.mapHref} className={s.map} iconClassName="text-current"/>}</article>)}</section>;}
export function Closing({inv,compact=false}:{inv:Invitation;compact?:boolean}){return <footer data-section="closing" inert={!inv.opened} aria-hidden={!inv.opened} className={`${s.closing} ${compact?s.compactClosing:""}`}><p className={s.kicker}>{t.hosts.respect}</p><h2>{inv.data.hosts}</h2>{!compact&&<><p className={s.blessing}>{inv.blessing}</p><p className={s.wait}>{t.hosts.waiting}</p></>}</footer>;}

/** All existing1–3 upload slots work inside one compact composition; failures/duplicates never clone the fallback. */
export function PhotoGrid({photos,fallback}:{photos?:string[];fallback:string}){const own=[...new Set((photos??[]).filter(x=>typeof x==="string"&&/^https?:\/\//i.test(x.trim())).map(x=>x.trim()))].slice(0,3);return <PhotoPlate key={JSON.stringify([own,fallback])} own={own} fallback={fallback}/>;}
function PhotoPlate({own,fallback}:{own:string[];fallback:string}){
 const[failed,setFailed]=useState<string[]>([]),root=useRef<HTMLDivElement>(null),usable=own.filter(x=>!failed.includes(x)),sources=usable.length?usable:[fallback];
 useEffect(()=>{
  const node=root.current;if(!node)return;
  const reconcile=()=>{const invalid=[...node.querySelectorAll<HTMLImageElement>('img[data-client-photo=true]')].filter(img=>img.complete&&!img.naturalWidth).map(img=>img.getAttribute('src')!);if(invalid.length)setFailed(old=>[...new Set([...old,...invalid])]);};
  // Cached/pre-hydration failures have no React error event to replay. Reconcile the actual image state too.
  node.addEventListener('error',reconcile,true);const frame=requestAnimationFrame(reconcile);
  return()=>{cancelAnimationFrame(frame);node.removeEventListener('error',reconcile,true);};
 },[]);
 return <div ref={root} className={s.photoGrid} data-photo-count={sources.length}>{sources.map((src,i)=><img key={src} src={src} alt="" aria-hidden data-photo-slot={i+1} data-client-photo={src!==fallback} loading={i===0?"eager":"lazy"} decoding="async" className={src!==fallback?s.clientPhoto:undefined}/>)}</div>;
}
