"use client";
import localFont from 'next/font/local';
import Image from 'next/image';
import {memo,useEffect,useRef} from 'react';
import {useReducedMotion} from 'motion/react';
import {designVars,type TemplateProps} from '../types';
import {useInvitation,type Invitation} from '../../blocks/useInvitation';
import {InvitationShell} from '../../blocks/InvitationShell';
import {Countdown} from '../../blocks/Countdown';
import {MapButton} from '../../blocks/MapButton';
import {Words,useFitWords} from '../../blocks/FitWords';
import {designTexts} from '@/texts/uz-cyrl';
import {monogram} from './monogram';
import s from './premium.module.css';
const font=localFont({src:[{path:'../../../assets/fonts/Lora-Regular.ttf'},{path:'../../../assets/fonts/Lora-Italic.ttf',style:'italic'}],display:'swap',variable:'--premium-serif'});
export type Concept='kabutar-salom'|'yelpigich-ziynat'|'samarqand-kitob'|'qosh-uzuk'|'saodat-kaliti';
const concepts: Record<Concept,string>={'kabutar-salom':'botanical','yelpigich-ziynat':'folio','samarqand-kitob':'portal','qosh-uzuk':'rings','saodat-kaliti':'envelope'};
const vars=designVars({primary:'#6c674a',primaryDark:'#424433',gold:'#a28a57',goldLight:'#e2d7bc',paper:'#f9f5ec',ink:'#333a32',muted:'#6a6c60'},{display:'var(--premium-serif)',accent:'var(--premium-serif)',body:'var(--premium-serif)'});
function Rings(){return <div className={s.ringsArt} aria-hidden="true"><i/><i/></div>}
function Photo({src,className='',lazy=false}:{src:string;className?:string;lazy?:boolean}){return <Image unoptimized width={1080} height={1600} src={src} className={className} alt="" aria-hidden="true" loading={lazy?'lazy':'eager'} decoding="async"/>}
export function Premium({data,mode,concept}:TemplateProps & {concept:Concept}){
 const inv=useInvitation(data,mode),reduced=useReducedMotion(),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const t=designTexts(concept),kind=concepts[concept],mark=monogram(data.groom,data.bride);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:900)};
 const date=t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year);
 return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} pageColor="#eee9df" backdropClassName="bg-[#eee9df]" className={`${s.page} ${s[kind]}`}>
  <PremiumContent data={data} inv={inv} concept={concept}/>
  {!inv.opened&&<button data-open data-started={inv.started} onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className={s.opening}>
   <div className={s.openSurface}>
    {kind==='botanical'&&<><Photo src="/art/atirgul.webp" className={s.openFlowers}/><div className={s.botanicalCard}><p className={s.eyebrow}>{t.opening.invitation}</p><span className={s.openMonogram}>{mark}</span><p className={s.openNames}>{data.groom}<br/>{t.cover.andWord}<br/>{data.bride}</p><p className={s.openDate}>{date}</p></div></>}
    {kind==='portal'&&<><div className={s.portalBackdrop}><Photo src="/art/samarqand-kitob.webp"/></div><div className={s.doorLeft}/><div className={s.doorRight}/><div className={s.portalLabel}><p className={s.eyebrow}>{t.opening.invitation}</p><span className={s.openMonogram}>{mark}</span><p className={s.openNames}>{data.groom}<br/>{t.cover.andWord}<br/>{data.bride}</p></div></>}
    {kind==='rings'&&<><p className={s.eyebrow}>{t.opening.invitation}</p><div className={s.ringFrame}/><Rings/><div className={s.ringLabel}><p className={s.openNames}>{data.groom}<br/>{t.cover.andWord}<br/>{data.bride}</p><p className={s.openDate}>{date}</p></div></>}
    {kind==='folio'&&<><div className={s.foldOne}/><div className={s.foldTwo}/><div className={s.foldThree}/><div className={s.folioLabel}><p className={s.eyebrow}>{t.opening.invitation}</p><p className={s.openNames}>{data.groom}<br/><em>{t.cover.andWord}</em><br/>{data.bride}</p><p className={s.openDate}>{date}</p><div className={s.folioRule}/><span className={s.openMonogram}>{mark}</span></div></>}
    {kind==='envelope'&&<><div className={s.envelopeCard}><p className={s.eyebrow}>{t.opening.invitation}</p><p className={s.openNames}>{data.groom}<br/>{t.cover.andWord}<br/>{data.bride}</p><p className={s.openDate}>{date}</p></div><div className={s.envelopePocket}/><div className={s.envelopeFlap}/><span className={s.seal}>{mark}</span></>}
   </div><p className={s.prompt}>{t.opening.tapToOpen}<span aria-hidden="true">↓</span></p>
  </button>}
 </InvitationShell>
}

const PremiumContent=memo(function PremiumContent({data,inv,concept}:{data:TemplateProps["data"];inv:Invitation;concept:Concept}){
 const t=designTexts(concept),kind=concepts[concept],mark=monogram(data.groom,data.bride),names=useFitWords<HTMLHeadingElement>(kind==='folio'?60:48);
 const date=t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year);
 const nameBlock=<h1 ref={names} className={s.names}><span><Words text={data.groom??''}/></span><small>{t.cover.andWord}</small><span><Words text={data.bride??''}/></span></h1>;
 const dateBlock=<p className={s.date}>{date}<span>{t.date.at(inv.main.time)}</span></p>;
 return <>
  <header className={s.hero}>
   {kind==='botanical'&&<><Photo src="/art/atirgul.webp" className={s.flower}/><div className={s.botanicalTitle}><p className={s.eyebrow}>{t.opening.invitation}</p>{nameBlock}{dateBlock}</div><span className={s.sideMark} aria-hidden="true">{mark}</span></>}
   {kind==='portal'&&<><p className={s.eyebrow}>{t.opening.invitation}</p><div className={s.arch}><Photo src="/art/samarqand-kitob.webp"/><span aria-hidden="true">{mark}</span></div>{nameBlock}{dateBlock}</>}
   {kind==='rings'&&<><p className={s.eyebrow}>{t.occasionTitles[inv.occasion]}</p><p className={s.day} aria-hidden="true">{String(inv.main.when.day).padStart(2,'0')}</p><Rings/>{nameBlock}{dateBlock}</>}
   {kind==='folio'&&<><p className={s.eyebrow}>{t.opening.invitation}</p><div className={s.folioRule}/>{nameBlock}<div className={s.folioFoot}><span aria-hidden="true">{mark}</span>{dateBlock}</div><Photo src="/art/bodom-guli.webp" className={s.folioPhoto}/></>}
   {kind==='envelope'&&<><p className={s.eyebrow}>{t.opening.invitation}</p><div className={s.crest} aria-hidden="true">{mark}</div><p className={s.subtitle}>{t.occasionTitles[inv.occasion]}</p>{nameBlock}{dateBlock}<div className={s.folioRule}/></>}
  </header>
  <main className={s.content}>
   <section className={s.letter}><span className={s.sectionNumber} aria-hidden="true">01</span><h2>{inv.text.greeting}</h2><p>{inv.text.body}</p></section>
   {inv.sides&&<section className={s.families}><div><p className={s.caption}>{t.sides.groom}</p><FamilyName text={inv.sides.groom}/></div><span aria-hidden="true">&</span><div><p className={s.caption}>{t.sides.bride}</p><FamilyName text={inv.sides.bride}/></div></section>}
   {kind==='botanical'&&<Photo src="/art/atirgul.webp" className={s.interlude} lazy/>}
   <section className={s.program}><span className={s.sectionNumber} aria-hidden="true">02</span><h2>{t.venue.programTitle}</h2>{inv.program.map((e,i)=><article data-event key={i} className={s.event}><p className={s.eventTime}>{t.date.clock(e.time)}</p><div><h3>{e.title}</h3><p className={s.caption}>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className={s.venue}>{e.venueName}</p><p>{e.address}</p><MapButton href={e.mapHref} className={s.map}/></div></article>)}</section>
   <section className={s.countdown}><p>{t.countdown.title[inv.occasion]}</p><Countdown startsAt={inv.main.when.startsAt} look={{grid:s.countGrid,box:s.countBox,number:s.countNumber,label:s.countLabel,today:s.today}}/></section>
   <section className={s.blessing}><p>{inv.blessing}</p><div className={s.folioRule}/><p className={s.caption}>{t.hosts.respectDeep}</p><FamilyName text={data.hosts}/><p className={s.waiting}>{t.hosts.waiting}</p></section>
  </main>
 </>;
},(a,b)=>a.data===b.data&&a.inv.mode===b.inv.mode&&a.inv.lang===b.inv.lang&&a.concept===b.concept);

function FamilyName({text}:{text?:string}){
 const ref=useFitWords<HTMLHeadingElement>(23);
 return <h3 ref={ref}><span style={{fontSize:"var(--fit,23px)"}}><Words text={text??""}/></span></h3>;
}
