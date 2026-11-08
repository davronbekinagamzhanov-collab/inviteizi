"use client";

import type {ReactNode} from "react";
import type {InvitationData} from "@/lib/types";
import {t} from "@/texts/uz-cyrl";
import {monthGrid} from "@/lib/wedding-date";
import type {Invitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Reveal} from "../../blocks/Reveal";
import {MapButton} from "../../blocks/MapButton";
import {useFitWords,Words} from "../../blocks/FitWords";
import {partnerInitials} from "../vip-atelier/model";
import {fontClasses,vipVars} from "../vip-tilla-muhr/style";
import {VipImage} from "../vip-tilla-muhr/VipImage";
import {signature,signaturePhotos,weddingEvent,type SignatureId} from "./model";
import s from "./signature.module.css";
import {weddingCopy} from "./copy";

export function SignatureShell({inv,id,children}:{inv:Invitation;id:SignatureId;children:ReactNode}){
  const palette=signature[id];
  return <InvitationShell inv={inv} style={vipVars(palette)} fontsClassName={fontClasses} className={`${s.page} ${s[palette.kind]}`} backdropClassName="bg-[#ded5c8]" pageColor={palette.paper} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:palette.paper,ink:palette.ink,accent:palette.accent,soft:palette.soft,line:palette.accent,radius:"2px",buttonRadius:"2px"}} epilogue={<Closing inv={inv}/>} >{children}</InvitationShell>;
}
export function Monogram({data}:{data:Pick<InvitationData,"groom"|"bride">}){
  const [a,b]=partnerInitials(data);
  return <span data-latin-monogram className={s.monogram} aria-label={`${a} ${b}`}><span>{a}</span><span>{b}</span></span>;
}
export function Names({inv}:{inv:Invitation}){
  const ref=useFitWords<HTMLHeadingElement>(58);
  return <h1 ref={ref} className={s.names}><Words text={inv.data.groom??""}/><i>{t.natural.and}</i><Words text={inv.data.bride??""}/></h1>;
}
export function Photo({inv,id,slot,eager=false,className=""}:{inv:Invitation;id:SignatureId;slot:1|2|3;eager?:boolean;className?:string}){
  return <div className={`${s.photo} ${className}`}><VipImage photo={signaturePhotos(inv.data,id)[slot-1]} eager={eager}/></div>;
}
export function DateLine({inv}:{inv:Invitation}){const ev=weddingEvent(inv);return <p className={s.dateLine}>{t.date.long(ev.when.day,ev.when.monthIndex,ev.when.year)}<span> · {ev.time}</span></p>;}
export function ScrollNote(){return <span className={s.scrollNote}>{t.b3.swipeDown}<svg viewBox="0 0 12 38" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 1v34m-4-5 4 5 4-5"/></svg></span>;}
export function Knot(){return <svg className={s.knot} viewBox="0 0 90 50" stroke="currentColor" fill="none" strokeWidth=".7" aria-hidden="true"><path d="M45 25C10-16 1 25 30 25s20-41-5-12 16 44 20 12C80-16 89 25 60 25S40-16 65 13 49 57 45 25Z"/><circle cx="45" cy="25" r="4"/></svg>;}
export function Letter({inv,id}:{inv:Invitation;id:SignatureId}){
  return <section data-vip-section="greeting" className={s.letter}><Reveal effect="fade" className={s.letterText}><span className={s.eyebrow}>{weddingCopy(inv.lang).withLove}</span><h2>{inv.text.greeting}</h2><p className={s.body}>{inv.text.body}</p><p className={s.signature}>{inv.data.hosts}</p></Reveal><Reveal className={s.letterPortrait}><Photo inv={inv} id={id} slot={2}/><Knot/></Reveal></section>;
}
export function Calendar({inv}:{inv:Invitation}){
  const date=weddingEvent(inv).when;
  return <section data-vip-section="date" className={s.dateSection}><Reveal effect="fade"><span className={s.eyebrow}>{weddingCopy(inv.lang).saveDate}</span><div className={s.dateHeading}><span>{String(date.day).padStart(2,"0")}</span><p>{t.date.monthYear(date.monthIndex,date.year)}</p></div><div className={s.calendar} aria-label={t.natural.calendarAria(t.date.long(date.day,date.monthIndex,date.year))}>{t.weekdaysShort.map(d=><span className={s.weekday} key={d}>{d}</span>)}{monthGrid(date.year,date.monthIndex).flat().map((day,i)=><span key={i} className={s.day} aria-current={day===date.day?"date":undefined}>{day}{day===date.day&&<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 43C4 28 1 17 9 10c6-5 12-1 15 5 4-9 13-11 18-4 8 11-4 22-18 32Z" pathLength="1"/></svg>}</span>)}</div></Reveal></section>;
}
/** No venue imagery: every title, time, address and map is from the real order. */
export function Programme({inv,primaryVenueShown=false}:{inv:Invitation;primaryVenueShown?:boolean}){
  const main=weddingEvent(inv);
  return <section data-vip-section={primaryVenueShown?"program":"venue"} className={s.programme}><Reveal><span className={s.eyebrow}>{weddingCopy(inv.lang).ourDay}</span><h2>{t.venue.programTitle}</h2></Reveal><ol>{inv.program.map((ev,i)=><li key={`${ev.kind}-${ev.date}-${i}`}><Reveal className={s.event}><span className={s.eventNumber}>{String(i+1).padStart(2,"0")}</span><div className={s.eventTitle}><time dateTime={`${ev.date}T${ev.time}`}>{ev.time}</time><h3>{ev.title}</h3><p className={s.eventDate}>{t.date.long(ev.when.day,ev.when.monthIndex,ev.when.year)}</p></div>{(!primaryVenueShown||ev!==main)&&<div className={s.eventPlace}><h4>{ev.venueName}</h4><p>{ev.address}</p><MapButton href={ev.mapHref} className={s.mapButton} iconClassName="text-current"/></div>}</Reveal></li>)}</ol></section>;
}
export function Arrival({inv}:{inv:Invitation}){
  const ev=weddingEvent(inv);
  return <section data-vip-section="venue" className={s.arrival}><Reveal><span className={s.eyebrow}>{weddingCopy(inv.lang).together}</span><h2>{ev.venueName}</h2><p>{ev.address}</p><p className={s.arrivalTime}>{t.date.long(ev.when.day,ev.when.monthIndex,ev.when.year)}<span>{t.date.time} {ev.time}</span></p><MapButton href={ev.mapHref} className={s.mapButton} iconClassName="text-current"/></Reveal></section>;
}
export function Memory({inv,id}:{inv:Invitation;id:SignatureId}){
  return <section data-vip-section="memory" className={s.memory}><Photo inv={inv} id={id} slot={3}/>{id==="vip-visol-nuri"&&<div className={s.memoryShade}/>}<Reveal className={s.memoryInk}><Knot/><p>{weddingCopy(inv.lang).forever}</p></Reveal></section>;
}
function Closing({inv}:{inv:Invitation}){
  return <section data-vip-section="closing" data-signature-closing className={s.closing}><Reveal effect="fade"><Monogram data={inv.data}/><h2>{t.hosts.waiting}</h2><p>{inv.blessing}</p><p className={s.signature}>{inv.data.hosts}</p></Reveal></section>;
}
