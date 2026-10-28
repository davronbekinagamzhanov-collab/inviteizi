"use client";
import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {designTexts} from "@/texts/uz-cyrl";
const font=localFont({src:"../../../assets/fonts/PTSerif-Regular.ttf",variable:"--bb-font",display:"swap"});
const vars=designVars({primary:"#8b7444",primaryDark:"#665632",gold:"#baa578",goldLight:"#e9d9b4",paper:"#fcf8eb",ink:"#59513d",muted:"#89836a"},{display:"var(--bb-font)",accent:"var(--bb-font)",body:"var(--bb-font)"});
const t=designTexts("bugdoy-boshoq");

/** Harvest postcard: wheat in the margin and the date printed like a small calendar leaf. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),name=useFitWords<HTMLHeadingElement>(36),hosts=useFitWords<HTMLParagraphElement>(18),when=inv.main.when;
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e6e1d0]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <main className="px-6 pt-7 pb-16">
      <div className="flex items-start justify-between gap-4 border-t border-gold/60 pt-5"><div className="min-w-0"><p className="text-[11px] uppercase tracking-[.18em] text-muted">{t.opening.invitation}</p><p className="mt-5 text-[28px] leading-tight text-primary">{t.occasionTitles[inv.occasion]}</p></div><div className="shrink-0 border-l border-gold/40 pl-4 text-right"><p className="text-[43px] leading-none">{when.day}</p><p className="mt-1 text-[13px] text-muted">{t.months[when.monthIndex]}<br/>{when.year}</p></div></div>
      <div className="relative mt-5 border-l border-gold/30 pl-5"><Wheat/><h1 ref={name} className="relative w-full pt-5 leading-tight [--fit:36px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1><p className="relative mt-3 max-w-[210px] text-[16px] italic leading-relaxed text-muted">{t.causeLine(data)}</p><p className="relative mt-7 text-[18px]">{inv.text.greeting}</p><p className="relative mt-3 text-[16px] leading-[1.8]">{inv.text.body}</p></div>
      <div className="mt-5">{inv.program.map((e,i)=><div data-event key={i} className="border-t border-gold/40 py-4">
        <p className="text-[14px] text-muted">{e.title} · {t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-2 text-[27px] text-primary">{t.date.at(e.time)}</p><p className="mt-2 text-[18px]">{e.venueName}</p><p className="mt-1 text-[15px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-3 rounded-sm border border-primary/30 px-4 py-2 text-primary" iconClassName="text-primary"/>
      </div>)}</div>
      <div className="mt-4 border-y border-gold/40 py-4"><p className="text-[14px] italic text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-2 w-full leading-relaxed [--fit:18px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p></div>
    </main>
  </InvitationShell>;
}
function Wheat(){return <svg data-decor aria-hidden="true" viewBox="0 0 120 190" className="pointer-events-none float-right -mr-2 -mt-3 h-[150px] w-[95px]" fill="none">
  {[0,1,2].map(i=><g key={i} transform={`translate(${22+i*31} ${i===1?0:20}) rotate(${(i-1)*12} 30 170)`} stroke="#b09b63" strokeWidth="1">
    <path d="M25 180V33M25 40V9"/>{[0,1,2,3,4].map(j=><g key={j} transform={`translate(25 ${39+j*19})`}><path d="M0 10Q-17 3-14-10Q0-9 0 10Z" fill="#dccd9f"/><path d="M0 20Q17 13 14 0Q0 1 0 20Z" fill="#e4d7b5"/><path d="M-14-10-20-27M14 0l6-17"/></g>)}
  </g>)}<path d="m18 167 82-9M17 173l84-9" stroke="#a28f63" strokeWidth="1.4"/>
</svg>;}
