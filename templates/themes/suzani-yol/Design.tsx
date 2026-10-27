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
const font=localFont({src:"../../../assets/fonts/PTSerif-Regular.ttf",variable:"--sy-font",display:"swap"});
const vars=designVars({primary:"#966257",primaryDark:"#704b43",gold:"#b6a172",goldLight:"#e7dabb",paper:"#faf5e9",ink:"#564c42",muted:"#8b8173"},{display:"var(--sy-font)",accent:"var(--sy-font)",body:"var(--sy-font)"});
const t=designTexts("suzani-yol");

/** A suzani runner: stitched rosettes, alternating woven bands and a long cream textile ground. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),name=useFitWords<HTMLHeadingElement>(45),hosts=useFitWords<HTMLParagraphElement>(26),when=inv.main.when;
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e6dcc9]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="px-7 pt-8 pb-8 text-center"><p className="text-[11px] uppercase tracking-[.25em] text-muted">{t.opening.invitation}</p><Suzani/>
      <h1 ref={name} className="mt-5 w-full leading-[1.12] [--fit:45px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-3 block text-[23px] italic text-muted">{t.cover.andWord}</span><span className="block text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1>
      <p className="mt-7 text-[22px] text-primary">{t.occasionTitles[inv.occasion]}</p><p className="mt-4 text-[18px]">{t.date.long(when.day,when.monthIndex,when.year)}</p>
    </header>
    <main className="mx-3 border-x border-gold/25">
      <Reveal className="mx-5 border-y border-primary/35 px-1 py-10"><h2 className="text-[28px] italic leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.85]">{inv.text.body}</p></Reveal>
      <section className="mx-5 my-10 border border-gold/30 bg-[#fffaf1] px-5 py-8 text-center"><Reveal><p className="mb-6 text-[25px] text-primary">{t.date.title[inv.occasion]}</p><Calendar date={when} marker="star" markerClassName="text-[#9b7761]"/></Reveal><Reveal className="mt-8"><p className="text-[16px] italic text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-1",box:"flex min-w-0 flex-col items-center border-r border-gold/30 last:border-0",number:"text-[30px] text-primary",label:"mt-1 text-[12px] text-muted",today:"text-[26px] text-primary"}}/></Reveal></section>
      <section className="pb-7"><Reveal><h2 className="px-7 pb-8 text-center text-[31px]">{t.venue.programTitle}</h2></Reveal>{inv.program.map((e,i)=><Reveal key={i} className="mb-7"><div data-event>
        <div className="flex items-baseline justify-between gap-3 border-y border-primary/20 bg-[#eee3d1] px-6 py-3"><p className="min-w-0 text-[22px]">{e.title}</p><span className="shrink-0 text-[24px] text-primary">{t.date.clock(e.time)}</span></div>
        <div className="px-7 pt-5 pb-2"><p className="text-[15px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-4 text-[22px]">{e.venueName}</p><p className="mt-2 text-[18px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 border-b border-primary/40 pb-2 text-primary" iconClassName="text-primary"/></div>
      </div></Reveal>)}</section>
      {inv.sides&&<Reveal className="mx-6 border-y border-gold/40 py-7 text-center"><p className="text-[14px] text-muted">{t.sides.groom}</p><p className="mt-2 text-[22px] leading-relaxed">{inv.sides.groom}</p><p className="mt-7 text-[14px] text-muted">{t.sides.bride}</p><p className="mt-2 text-[22px] leading-relaxed">{inv.sides.bride}</p></Reveal>}
      <Reveal className="px-7 pt-10 pb-20 text-center"><p className="text-[23px] italic leading-[1.8]">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-4 w-full leading-snug [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[17px] italic text-primary">{t.hosts.thanks}</p></Reveal>
    </main>
  </InvitationShell>;
}
function Suzani(){return <svg data-decor aria-hidden="true" viewBox="0 0 340 225" className="mx-auto mt-6 w-full max-w-[330px]" fill="none">
  <path d="M12 113Q85 2 170 113Q255 224 328 113M12 113Q85 224 170 113Q255 2 328 113" stroke="#9aaf94" strokeWidth="2"/>
  {[0,1,2].map(i=><g key={i} transform={`translate(${55+i*115} ${i===1?113:112})`}>
    {Array.from({length:8},(_,j)=><path key={j} d="M0 0Q-26-27 0-45Q26-27 0 0Z" transform={`rotate(${j*45})`} fill={i===1?"#b57f70":"#c3a68a"} fillOpacity={i===1?.9:.7} stroke="#faf5e9" strokeWidth="2"/>)}
    <circle r="18" fill="#e5d1ae" stroke="#8b7160" strokeWidth="1.2"/><circle r="8" fill="#92705b"/><circle r="3" fill="#faf5e9"/>
  </g>)}
  {[0,1,2,3].map(i=><g key={i} transform={`translate(${80+i*60} ${i%2?35:191})`} stroke="#81977b" strokeWidth="1.1"><path d="M0 8q-23-11-13-24Q3-15 0 8ZM0 8q23-11 13-24Q-3-15 0 8Z" fill="#b8c0a1"/><path d="M0-9V17"/></g>)}
  <path d="M8 4h324M8 221h324" stroke="#b6a172" strokeWidth=".8" strokeDasharray="2 4"/>
</svg>;}
