"use client";

import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {designTexts} from "@/texts/uz-cyrl";

const font=localFont({ preload: false,src:"../../../assets/fonts/PTSerif-Regular.ttf",variable:"--zv-type",display:"swap"});
const vars=designVars({primary:"#87604e",primaryDark:"#65483d",gold:"#b39159",goldLight:"#e4cfaa",paper:"#fbf4e6",ink:"#53473d",muted:"#857a6b"},{display:"var(--zv-type)",accent:"var(--zv-type)",body:"var(--zv-type)"});
const t=designTexts("zarvaraq");

/** A single commemorative page: laurel age seal, letterpress name, short event lines. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),name=useFitWords<HTMLHeadingElement>(36);
  const hosts=useFitWords<HTMLParagraphElement>(18);
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e6ddcd]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <main className="relative m-3 border border-gold/45 px-6 pt-6 pb-16 shadow-[inset_5px_0_0_#f0e4cd]">
      <p className="text-center text-[11px] tracking-[.22em] text-muted uppercase">{t.opening.invitation}</p>
      <div className="relative mx-auto mt-4 w-[190px] max-w-full">
        <Laurel/>
        {data.age!=null&&<div className="absolute inset-0 flex flex-col items-center justify-center pb-2"><p className="text-[64px] leading-none text-primary">{data.age}</p><p className="mt-1 text-[13px] tracking-[.14em] text-muted">{t.ageLabel}</p></div>}
      </div>
      <h1 ref={name} className="mt-3 w-full text-center leading-tight [--fit:36px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1>
      <p className="mt-3 text-center text-[20px] italic text-primary">{t.occasionTitles[inv.occasion]}</p>
      <div aria-hidden className="mx-auto my-5 h-px w-24 bg-gold/50"/>
      <p className="text-center text-[18px]">{inv.text.greeting}</p><p className="mt-2 text-center text-[16px] leading-[1.7]">{inv.text.body}</p>
      <div className="mt-5">{inv.program.map((e,i)=><div data-event key={i} className="border-t border-gold/35 py-4">
        <p className="text-[14px] italic text-muted">{e.title}</p>
        <div className="mt-2 flex items-center gap-4"><span className="border-r border-gold/40 pr-4 text-[38px] leading-none text-primary">{e.when.day}</span><p className="text-[15px] leading-relaxed">{t.months[e.when.monthIndex]} {e.when.year}<br/>{t.date.at(e.time)}</p></div>
        <p className="mt-3 text-[17px]">{e.venueName}</p><p className="mt-1 text-[15px] leading-relaxed text-muted">{e.address}</p>
        <MapButton href={e.mapHref} className="mt-3 border-b border-gold/60 pb-1 text-primary" iconClassName="text-primary"/>
      </div>)}</div>
      <p className="mt-3 text-center text-[14px] italic text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-2 text-center  leading-relaxed w-full [--fit:18px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p>
      <p className="mt-5 text-center text-[14px] italic text-primary">{t.hosts.waiting}</p>
    </main>
  </InvitationShell>;
}

function Laurel(){return <svg data-decor aria-hidden="true" viewBox="0 0 220 190" className="w-full" fill="none">
  <ellipse cx="110" cy="94" rx="62" ry="81" fill="#f6ecd7" stroke="#b39159" strokeOpacity=".55"/>
  <ellipse cx="110" cy="94" rx="57" ry="76" stroke="#c5ac7b" strokeWidth=".5"/>
  {[false,true].map(right=><g key={String(right)} transform={right?"translate(220 0) scale(-1 1)":undefined}>
    <path d="M107 178Q28 142 51 36" stroke="#a18c5e" strokeWidth="1.3"/>
    {[0,1,2,3,4,5].map(i=><g key={i} transform={`translate(${48+i*i*1.4} ${46+i*21}) rotate(${-22+i*9})`}>
      <path d="M0 15Q-25 0-12-12Q5-10 0 15Z" fill="#a9af82" fillOpacity=".75"/>
      <path d="M1 18Q8-12 22-5Q31 10 1 18Z" fill="#c3b484" fillOpacity=".65"/>
    </g>)}
  </g>)}
  <path d="M97 181h26M100 185h20" stroke="#b39159" strokeWidth="1.2"/>
</svg>;}
