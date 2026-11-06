"use client";
import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {Calendar} from "../../blocks/Calendar";
import {Countdown} from "../../blocks/Countdown";
import {PhotoBackdrop} from "../../blocks/PhotoBackdrop";
import {Reveal} from "../../blocks/Reveal";
import {designTexts} from "@/texts/uz-cyrl";
const font=localFont({ preload: false,src:[{path:"../../../assets/fonts/Lora-Regular.ttf",style:"normal"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--le-font",display:"swap"});
const vars=designVars({primary:"#846b81",primaryDark:"#635260",gold:"#b3a071",goldLight:"#e5d7b8",paper:"#fcf7ef",ink:"#594f56",muted:"#93878e"},{display:"var(--le-font)",accent:"var(--le-font)",body:"var(--le-font)"});
const t=designTexts("lola-ehtirom");

/** A tulip dedication: photographic half-page and a spacious age column, then soft pleated panels. */
export default function Design({data,mode,art}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),name=useFitWords<HTMLHeadingElement>(43),hosts=useFitWords<HTMLParagraphElement>(26),when=inv.main.when;
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e7dfe3]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="pt-9"><p className="px-7 text-[12px] uppercase tracking-[.23em] text-muted">{t.opening.invitation}</p>
      <div className="relative mt-6 grid grid-cols-[minmax(0,1fr)_100px] items-center"><div className="relative h-[300px] overflow-hidden"><PhotoBackdrop src={art??"/art/lola-ehtirom.webp"} color="#fcf7ef" fade="both" strength={.3} opacity={.9} position="59% 50%" priority/></div><div className="border-l border-gold/40 py-8 text-center">{data.age!=null&&<><p className="text-[66px] leading-none text-primary">{data.age}</p><p className="mt-4 text-[16px] italic text-muted">{t.ageLabel}</p></>}</div></div>
      <h1 ref={name} className="mx-7 mt-4 leading-tight [--fit:43px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1><p className="mx-7 mt-4 text-[23px] italic text-primary">{t.occasionTitles[inv.occasion]}</p>
      <div className="mx-7 mt-7 border-y border-gold/35 py-4"><p className="text-[18px]">{t.date.long(when.day,when.monthIndex,when.year)}</p><p className="mt-2 text-[15px] text-muted">{t.weekdays[when.weekdayIndex]} · {t.date.at(inv.main.time)}</p></div>
    </header>
    <main>
      <Reveal className="px-8 py-12"><h2 className="text-[29px] italic leading-snug text-primary">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p></Reveal>
      <section className="mx-5 border-y border-primary/20 bg-[#f1e9e9] px-5 py-9 text-center"><Reveal><p className="mb-6 text-[26px]">{t.date.title[inv.occasion]}</p><Calendar date={when} marker="circle" markerClassName="text-primary"/></Reveal><Reveal className="mt-8 border-t border-primary/15 pt-6"><p className="text-[16px] italic text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-1",box:"flex min-w-0 flex-col items-center",number:"text-[30px] text-primary",label:"mt-1 text-[12px] text-muted",today:"text-[26px] text-primary"}}/></Reveal></section>
      <section className="px-6 py-14"><Reveal><h2 className="mb-9 text-center text-[31px]">{t.venue.programTitle}</h2></Reveal>{inv.program.map((e,i)=><Reveal key={i} className="mb-7 last:mb-0"><div data-event className="border-y border-gold/35 bg-white/50 px-5 pt-6 pb-7 shadow-[inset_4px_0_0_#e4d9df]">
        <p className="text-[14px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-3 text-[36px] text-primary">{t.date.clock(e.time)}</p><h3 className="mt-2 text-[24px] italic">{e.title}</h3><p className="mt-6 text-[21px]">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-full border border-primary/35 px-4 py-3 text-primary" iconClassName="text-primary"/>
      </div></Reveal>)}</section>
      <Reveal className="mx-7 border-t border-gold/45 pt-9 pb-20"><p className="text-[24px] italic leading-[1.8] text-primary">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-4 w-full leading-snug [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] italic">{t.hosts.waiting}</p></Reveal>
    </main>
  </InvitationShell>;
}
