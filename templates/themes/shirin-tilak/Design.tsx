"use client";
import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {Reveal} from "../../blocks/Reveal";
import {Countdown} from "../../blocks/Countdown";
import {designTexts} from "@/texts/uz-cyrl";
const font=localFont({src:"../../../assets/fonts/PTSerif-Regular.ttf",variable:"--st-font",display:"swap"});
const vars=designVars({primary:"#89592c",primaryDark:"#704922",gold:"#b4925d",goldLight:"#ead8ae",paper:"#fcf6e8",ink:"#594a33",muted:"#756347"},{display:"var(--st-font)",accent:"var(--st-font)",body:"var(--st-font)"});
const t=designTexts("shirin-tilak");
/** Amber novvot facets: a sweet-wishes folio with angular margins, rather than textile or floral borders. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),names=useFitWords<HTMLHeadingElement>(44),hosts=useFitWords<HTMLParagraphElement>(26),groom=useFitWords<HTMLParagraphElement>(24),bride=useFitWords<HTMLParagraphElement>(24);
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e8dbc0]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="px-7 pt-7 pb-10"><p className="text-[12px] uppercase tracking-[.2em] text-muted">{t.opening.invitation}</p><Crystals/><h1 ref={names} className="mt-4 w-full leading-tight [--fit:44px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-3 block text-[22px] text-primary">{t.cover.andWord}</span><span className="block text-right text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1><p className="mt-6 border-t border-gold/50 pt-5 text-right text-[19px] text-primary">{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></header>
    <main className="pb-24"><Reveal className="mx-5 border-l-[5px] border-gold/50 bg-[#f0e6cd] px-5 py-8"><h2 className="text-[28px] leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.85]">{inv.text.body}</p></Reveal>
      {inv.sides&&<section className="px-7 py-11"><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p><div aria-hidden className="my-7 flex gap-2">{[0,1,2].map(i=><span key={i} className="h-2 w-2 rotate-45 bg-gold/50"/>)}</div><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></section>}
      <Reveal className="border-y border-gold/45 px-7 py-8"><p className="text-[16px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={inv.main.when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-2",box:"flex min-w-0 flex-col",number:"text-[25px] whitespace-nowrap text-primary",label:"mt-2 text-[12px] text-muted",today:"text-[26px] text-primary"}}/></Reveal>
      <section className="px-7 pt-12"><h2 className="mb-8 text-[31px] text-primary">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mb-9"><div data-event className="border-t border-gold/45 pt-6"><p className="text-[14px] text-muted">0{i+1} · {t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><h3 className="mt-3 text-[25px] leading-snug">{e.title}</h3><p className="mt-3 text-[35px] text-primary">{t.date.clock(e.time)}</p><p className="mt-5 text-[22px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
      <Reveal className="mx-5 mt-4 border-r-[5px] border-gold/50 bg-[#f0e6cd] px-5 py-9"><p className="text-[23px] leading-[1.8]">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] text-primary">{t.hosts.waiting}</p></Reveal>
    </main>
  </InvitationShell>;
}
function Crystals(){return <svg data-decor aria-hidden="true" viewBox="0 0 320 210" className="mt-3 w-full" fill="none" stroke="#bd9655" strokeWidth="1"><path d="m111 173-35-58 18-59 53-28 38 45-10 69Z" fill="#e9c989" fillOpacity=".7"/><path d="m94 56 39 27 14-55M133 83l42 59M76 115l57-32-22 90M133 83l52-10"/><path d="m165 163 12-69 37-34 35 21 1 52-38 50Z" fill="#d7b87c" fillOpacity=".6"/><path d="m177 94 35 24 2-58M212 118l38 15M212 118v65M165 163l47-45 37-37"/><path d="m53 170-17-25 9-29 29-11 20 35-17 37Z" fill="#eed8a9"/><path d="m45 116 18 24 11-35M63 140l14 37M36 145l27-5 31 0"/><path d="m238 172 19-48 23-7 18 29-9 32Z" fill="#f0ddb3"/><path d="m257 124 18 24 5-31M275 148l14 30M238 172l37-24 23-2M26 193H298"/></svg>;}
