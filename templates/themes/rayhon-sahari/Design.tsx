"use client";
import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {Calendar} from "../../blocks/Calendar";
import {Countdown} from "../../blocks/Countdown";
import {Reveal} from "../../blocks/Reveal";
import {designTexts} from "@/texts/uz-cyrl";
const font=localFont({src:[{path:"../../../assets/fonts/Lora-Regular.ttf"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--rs-font",display:"swap"});
const vars=designVars({primary:"#506e56",primaryDark:"#354d3d",gold:"#a69c6d",goldLight:"#dedcc0",paper:"#f7f7ec",ink:"#425247",muted:"#5e6b58"},{display:"var(--rs-font)",accent:"var(--rs-font)",body:"var(--rs-font)"});
const t=designTexts("rayhon-sahari");

/** Morning herbarium: a rayhon specimen, offset folio numbers and an open botanical programme. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),name=useFitWords<HTMLHeadingElement>(42),hosts=useFitWords<HTMLParagraphElement>(27),when=inv.main.when;
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#dde1d2]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="relative px-7 pt-9 pb-12">
      <div className="flex items-center justify-between gap-4 border-b border-primary/30 pb-4"><p className="text-[12px] uppercase tracking-[.16em]">{t.opening.invitation}</p><p className="text-right text-[13px] text-muted">{when.year}</p></div>
      <Basil/><p className="mt-4 max-w-[220px] text-[41px] italic leading-[1.2] text-primary">{t.occasionTitles[inv.occasion]}</p>
      <h1 ref={name} className="mt-8 w-full leading-snug [--fit:42px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1><p className="mt-4 text-[17px] leading-relaxed text-muted">{t.causeLine(data)}</p>
      <div className="mt-8 border-l-2 border-gold/60 pl-5"><p className="text-[24px]">{t.date.long(when.day,when.monthIndex,when.year)}</p><p className="mt-2 text-[18px] text-primary">{t.date.at(inv.main.time)}</p></div>
    </header>
    <main>
      <Reveal className="bg-[#e9eddf] px-7 py-10"><p aria-hidden className="text-[12px] tracking-[.2em] text-muted">01</p><h2 className="mt-4 text-[29px] italic leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p></Reveal>
      <section className="px-7 py-12"><Reveal><p aria-hidden className="text-[12px] tracking-[.2em] text-muted">02</p><h2 className="mt-4 text-[31px] leading-snug">{t.date.title[inv.occasion]}</h2><div className="mt-7 border-y border-primary/25 py-7"><Calendar date={when} marker="circle" markerClassName="text-primary" markedDayClassName="text-paper"/></div></Reveal><Reveal className="mt-8"><p className="text-[16px] italic text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-3",box:"flex min-w-0 flex-col border-l border-primary/30 pl-2",number:"text-[24px] tabular-nums whitespace-nowrap text-primary",label:"mt-2 text-[12px] text-muted",today:"text-[27px] text-primary"}}/></Reveal></section>
      <section className="bg-[#eff0e3] px-7 py-10"><p aria-hidden className="text-[12px] tracking-[.2em] text-muted">03</p><h2 className="mt-4 text-[31px] leading-snug">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mt-8"><div data-event className="relative border-t border-primary/35 pt-6"><span aria-hidden className="absolute -top-[4px] left-0 h-2 w-2 rotate-45 bg-primary"/><p className="text-[14px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-3 text-[39px] italic leading-none text-primary">{t.date.clock(e.time)}</p><h3 className="mt-4 text-[24px] leading-snug">{e.title}</h3><p className="mt-5 text-[22px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-full border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
      <Reveal className="px-7 pt-12 pb-24"><p className="border-l border-gold/60 pl-5 text-[23px] italic leading-[1.8]">{inv.blessing}</p><p className="mt-10 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:27px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] italic text-primary">{t.hosts.waiting}</p><div aria-hidden className="mt-10 h-px w-16 bg-primary/50"/></Reveal>
    </main>
  </InvitationShell>;
}
function Basil(){return <svg data-decor aria-hidden="true" viewBox="0 0 320 230" className="mt-5 w-full" fill="none"><path d="M65 218Q122 138 247 33M132 137l-25-67M176 102l66 2M98 177l-50-28M211 72l-7-39" stroke="#7e926a" strokeWidth="2"/>{[[87,178,-62],[139,142,15],[119,119,-65],[171,111,10],[155,79,-55],[202,80,20],[213,49,-50],[246,42,28],[64,146,-75],[232,111,55]].map(([x,y,r],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${r})`}><path d="M0 0Q-25-9-19-40Q10-44 0 0Z" fill={i%2?"#aebc91":"#859e75"} fillOpacity=".85"/><path d="M0-3-15-33M-6-13l-8-3M-10-23l5-7" stroke="#607b56" strokeWidth=".8"/></g>)}<path d="M250 29q15-15 19-6q-2 11-19 6Z" fill="#a99ba6"/><path d="M257 17q-6-15 4-16q8 8-4 16Z" fill="#b1a2ae"/><path d="M267 32q15-7 17 2q-5 8-17-2Z" fill="#b1a2ae"/></svg>;}
