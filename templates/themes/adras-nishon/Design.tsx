"use client";
import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {designTexts} from "@/texts/uz-cyrl";
const font=localFont({ preload: false,src:"../../../assets/fonts/PTSerif-Regular.ttf",variable:"--an-font",display:"swap"});
const vars=designVars({primary:"#965e46",primaryDark:"#704333",gold:"#b79c72",goldLight:"#eed8b5",paper:"#fcf4e9",ink:"#50493c",muted:"#706252"},{display:"var(--an-font)",accent:"var(--an-font)",body:"var(--an-font)"});
const t=designTexts("adras-nishon");

/** A stepped textile badge and a side-set name. A compact ceremonial card, no toy imagery. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),name=useFitWords<HTMLHeadingElement>(39),hosts=useFitWords<HTMLParagraphElement>(20);
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e5d5c4]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <main className="px-6 pt-7 pb-20">
      <div className="flex items-start gap-5"><Badge/><p className="mt-4 flex-1 text-[12px] leading-[1.9] tracking-[.16em] uppercase text-muted">{t.opening.invitation}<span className="mt-2 block text-[20px] tracking-normal text-primary normal-case">{t.occasionTitles[inv.occasion]}</span></p></div>
      <div className="mt-3 border-l-[3px] border-primary/60 py-3 pl-5"><p className="text-[15px] text-muted">{t.relationWord(data.relation??"ogil",data.person)}</p><h1 ref={name} className="mt-3 w-full leading-tight [--fit:39px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1>{data.age!=null&&<p className="mt-3 text-[20px] text-primary">{data.age} {t.ageLabel}</p>}</div>
      <p className="mt-6 text-[18px]">{inv.text.greeting}</p><p className="mt-3 text-[16px] leading-[1.8]">{inv.text.body}</p>
      <div className="mt-5">{inv.program.map((e,i)=><div data-event key={i} className="mb-4 border-y border-gold/45 py-4"><div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4"><p className="border-r border-gold/40 pr-4 text-[25px] leading-none text-primary">{e.when.day}<span className="mt-2 block text-[12px] leading-relaxed text-muted">{t.months[e.when.monthIndex]}<br/>{e.when.year}</span></p><div><p className="text-[14px] text-muted">{e.title}</p><p className="mt-1 text-[22px] text-primary">{t.date.at(e.time)}</p></div></div><p className="mt-4 text-[19px]">{e.venueName}</p><p className="mt-1 text-[15px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-3 border border-primary/35 px-4 py-2 text-primary" iconClassName="text-primary"/></div>)}</div>
      <p className="mt-5 text-[14px] italic text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-2 w-full leading-snug [--fit:20px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p>
      <div aria-hidden className="mt-6 flex gap-2">{[0,1,2,3,4,5,6].map(i=><span key={i} className="h-1 flex-1 bg-primary/40"/>)}</div>
    </main>
  </InvitationShell>;
}
function Badge(){return <svg data-decor aria-hidden="true" viewBox="0 0 130 155" className="h-[145px] w-[112px] shrink-0" fill="none"><path d="m65 6 22 18v18h17v20l18 15-18 15v20H87v18l-22 19-22-19v-18H26V92L8 77l18-15V42h17V24Z" fill="#b77b5c"/><path d="m65 19 14 14v18h17v17l12 9-12 9v17H79v18l-14 14-14-14v-18H34V86l-12-9 12-9V51h17V33Z" stroke="#f8e8cd"/><path d="M65 111V65M65 82Q36 71 45 54q17-1 20 28ZM65 69q-6-27 0-33q15 16 0 33ZM65 92q25-6 23-23q-20-3-23 23Z" fill="#f1dfbf" stroke="#f1dfbf"/><path d="m51 116 14 10 14-10" stroke="#f1dfbf"/></svg>;}
