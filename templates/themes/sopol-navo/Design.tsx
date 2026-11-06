"use client";
import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {Reveal} from "../../blocks/Reveal";
import {MapButton} from "../../blocks/MapButton";
import {Countdown} from "../../blocks/Countdown";
import {designTexts} from "@/texts/uz-cyrl";
const font=localFont({ preload: false,src:"../../../assets/fonts/PTSerif-Regular.ttf",variable:"--sn-font",display:"swap"});
const vars=designVars({primary:"#965c43",primaryDark:"#70412d",gold:"#b49772",goldLight:"#eddbbf",paper:"#fcf5e9",ink:"#584739",muted:"#6e5b49"},{display:"var(--sn-font)",accent:"var(--sn-font)",body:"var(--sn-font)"});
const t=designTexts("sopol-navo");
/** Slip-decorated pottery: rounded clay cuts alternate with straight, numbered invitation sections. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),names=useFitWords<HTMLHeadingElement>(44),hosts=useFitWords<HTMLParagraphElement>(27),groom=useFitWords<HTMLParagraphElement>(24),bride=useFitWords<HTMLParagraphElement>(24);
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e7d3bf]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="px-7 pt-8 pb-9"><div className="flex items-center justify-between gap-5"><p className="text-[12px] uppercase tracking-[.16em] text-muted">{t.opening.invitation}</p><p className="text-[14px] text-primary">{inv.main.when.year}</p></div><Pottery/><h1 ref={names} className="mt-4 w-full leading-tight [--fit:44px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-3 block text-[22px] text-primary">{t.cover.andWord}</span><span className="block text-right text-[length:var(--fit)]"><Words text={data.bride??""}/></span></h1><p className="mt-6 text-right text-[20px] text-primary">{t.occasionTitles[inv.occasion]}</p></header>
    <main>
      <Reveal className="rounded-tr-[90px] bg-[#eee0cc] px-7 py-10"><h2 className="text-[29px] leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.85]">{inv.text.body}</p></Reveal>
      {inv.sides&&<section className="px-7 py-11"><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p><div aria-hidden className="my-7 flex items-center gap-3"><span className="h-px flex-1 bg-gold/50"/><span className="h-2 w-2 rounded-full border border-primary"/><span className="h-px flex-1 bg-gold/50"/></div><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></section>}
      <section className="border-y border-gold/45 px-7 py-10"><p className="text-[15px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={inv.main.when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-2",box:"flex min-w-0 flex-col border-t border-primary/40 pt-4",number:"text-[25px] whitespace-nowrap text-primary",label:"mt-2 text-[12px] text-muted",today:"text-[27px] text-primary"}}/></section>
      <section className="px-7 pt-12 pb-4"><h2 className="mb-8 text-[31px] text-primary">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mb-8"><div data-event className="border-t border-primary/40 pt-6"><p className="text-[13px] tracking-[.12em] text-muted">0{i+1} · {t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><h3 className="mt-4 text-[26px] leading-snug">{e.title}</h3><p className="mt-3 text-[35px] text-primary">{t.date.clock(e.time)}</p><p className="mt-5 text-[23px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 rounded-tr-[18px] border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
      <Reveal className="rounded-bl-[90px] bg-[#eee0cc] px-7 pt-10 pb-24"><p className="text-[23px] leading-[1.8]">{inv.blessing}</p><p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:27px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] text-primary">{t.hosts.waiting}</p></Reveal>
    </main>
  </InvitationShell>;
}
function Pottery(){return <svg data-decor aria-hidden="true" viewBox="0 0 320 245" className="mt-5 w-full" fill="none"><path d="M79 25h60l-8 50q-1 16 23 40q24 30 10 71q-9 27-55 27t-55-27q-14-41 10-71q24-24 23-40Z" fill="#b77959"/><path d="M79 31h60M87 66h44M56 176q54 25 107 0M61 190q48 23 97 0" stroke="#faedd5" strokeWidth="2"/>{[0,1,2,3,4].map(i=><g key={i} transform={`translate(${70+i*20} ${i%2?120:137})`} stroke="#faedd5" strokeWidth="1.7"><path d="M0 18V-14M0 0q-19-7-10-19q16 2 10 19ZM0 11q19-7 10-19q-16 2-10 19Z"/></g>)}<path d="M199 84h47l-5 35q-1 8 15 25q24 42 1 59q-28 20-62 0q-23-17 1-59q16-17 15-25Z" fill="#dbc39d" stroke="#b49772"/><path d="M205 91h36M199 170q25-20 50 0M194 187q31-20 60 0" stroke="#9c6d4c" strokeWidth="1.2"/><path d="M33 224H282M71 233H245" stroke="#b49772" strokeWidth="1"/></svg>;}
