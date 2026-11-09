"use client";
import type {CSSProperties,ReactNode} from "react";
import type {Invitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Reveal} from "../../blocks/Reveal";
import {Countdown} from "../../blocks/Countdown";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {monthGrid} from "@/lib/wedding-date";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {fonts} from "./fonts";
import {artOf,mainEvent,type CelebrationId} from "./model";
import s from "./shared.module.css";

export function Shell({inv,id,className,style,children,ending}:{inv:Invitation;id:CelebrationId;className:string;style:CSSProperties;children:ReactNode;ending:ReactNode}){
 return <InvitationShell inv={inv} className={`${s.page} ${className}`} fontsClassName={fonts} style={style} pageColor="#eee8db" backdropClassName="bg-[#e4e0d7]" musicVariant="soft" brandVariant="soft" epilogue={ending} rsvpLook={{paper:"var(--c-paper)",ink:"var(--c-ink)",accent:"var(--c-primary)",soft:"var(--c-gold-light)",line:"var(--c-gold)",radius:"14px",buttonRadius:"40px"}}><div data-celebration={id}>{children}</div></InvitationShell>;
}
export function Art({id,className="",eager=false}:{id:CelebrationId;className?:string;eager?:boolean}){
 // Original SVG illustration, not a photograph or a client-image slot.
 // eslint-disable-next-line @next/next/no-img-element -- SVG is served locally at its authored aspect ratio.
 return <img data-celebration-art={id} className={`${s.art} ${className}`} src={artOf(id)} width="1000" height="1350" alt="" aria-hidden="true" loading={eager?"eager":"lazy"} decoding="async"/>;
}
export function Name({inv,className="",max=55}:{inv:Invitation;className?:string;max?:number}){
 const ref=useFitWords<HTMLHeadingElement>(max);
 return <h1 ref={ref} data-person-name className={`${s.name} ${className}`}><Words text={inv.data.person??""}/></h1>;
}
export function DateLine({inv}:{inv:Invitation}){const e=mainEvent(inv),d=e.when;return <p className={s.dateLine}>{t.date.long(d.day,d.monthIndex,d.year)}<span> · {e.time}</span></p>;}
export function Leaf({className=""}:{className?:string}){return <svg className={`${s.leaf} ${className}`} viewBox="0 0 150 44" fill="none" stroke="currentColor" strokeWidth=".8" aria-hidden="true"><path d="M9 30q57 8 124-22M44 28q-25-28-33-12q8 18 33 12ZM65 23q-9-30-24-21q0 20 24 21ZM91 16q3-28-13-26q-9 20 13 26ZM91 16q25 19 37 2q-13-12-37-2Z"/></svg>;}
export function Letter({inv,className=""}:{inv:Invitation;className?:string}){return <section data-section="letter" className={`${s.letter} ${className}`}><Reveal effect="fade"><span className={s.kicker}>{celebrationCopy(inv.lang).respect}</span><h2>{inv.text.greeting}</h2><p>{inv.text.body}</p><Leaf/><p className={s.hosts}>{inv.data.hosts}</p></Reveal></section>;}
export function Calendar({inv,className="",children}:{inv:Invitation;className?:string;children?:ReactNode}){const e=mainEvent(inv),d=e.when;return <section data-section="date" className={`${s.calendar} ${className}`}><Reveal effect="fade"><span className={s.kicker}>{t.date.title[inv.occasion]}</span><div data-calendar-heading className={s.dateHeading}><strong>{d.day}</strong><p>{t.date.monthYear(d.monthIndex,d.year)}<time dateTime={`${e.date}T${e.time}`}>{e.time}</time></p></div><div data-calendar-grid className={s.monthGrid} aria-label={t.natural.calendarAria(t.date.long(d.day,d.monthIndex,d.year))}>{t.weekdaysShort.map(x=><span key={x} className={s.weekday}>{x}</span>)}{monthGrid(d.year,d.monthIndex).flat().map((day,i)=><span key={i} data-calendar-day={day??undefined} aria-current={day===d.day?"date":undefined}>{day}</span>)}</div>{children}</Reveal></section>;}
export function Timer({inv}:{inv:Invitation}){const e=mainEvent(inv);return <div data-celebration-countdown data-target-at={e.when.startsAt.toISOString()} className={s.countdown}><p>{t.countdown.title[inv.occasion]}</p><Countdown startsAt={e.when.startsAt} look={{grid:s.countGrid,today:s.today,renderUnit:u=><span className={s.countUnit}><span data-count-value data-unit={u.key}>{u.value}</span><small>{u.label}</small></span>}}/></div>;}
export function Events({inv,className=""}:{inv:Invitation;className?:string}){return <section data-section="venue" className={`${s.events} ${className}`}><Reveal><span className={s.kicker}>{celebrationCopy(inv.lang).meeting}</span><h2>{t.venue.title}</h2></Reveal>{inv.program.map((e,i)=><article data-event key={`${e.kind}-${e.date}-${i}`}><Reveal><span className={s.eventNumber} aria-hidden="true">{String(i+1).padStart(2,"0")}</span><p className={s.kicker}>{e.title}</p><time data-event-time dateTime={`${e.date}T${e.time}`}>{e.time}</time><p className={s.eventDate}>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><h3>{e.venueName}</h3><p data-address>{e.address}</p><MapButton href={e.mapHref} className={s.map} iconClassName="text-current"/></Reveal></article>)}</section>;}
export function Ending({inv,id,className=""}:{inv:Invitation;id:CelebrationId;className?:string}){return <section data-section="closing" inert={!inv.opened} aria-hidden={!inv.opened} className={`${s.ending} ${className}`}><Reveal effect="fade"><Leaf/><span className={s.kicker}>{celebrationCopy(inv.lang).respect}</span><h2>{t.hosts.waiting}</h2><p>{inv.blessing}</p><p className={s.hosts}>{inv.data.hosts}</p><DateLine inv={inv}/><span className={s.signature}>{celebrationCopy(inv.lang)[id]}</span></Reveal></section>;}
