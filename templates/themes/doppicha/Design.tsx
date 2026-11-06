"use client";

import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {designTexts} from "@/texts/uz-cyrl";

const font=localFont({ preload: false,src:[{path:"../../../assets/fonts/Lora-Regular.ttf",style:"normal"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--dp-type",display:"swap"});
const vars=designVars({primary:"#527565",primaryDark:"#355344",gold:"#bd9a5d",goldLight:"#ecdcba",paper:"#fff9ed",ink:"#3c4f43",muted:"#7b8270"},{display:"var(--dp-type)",accent:"var(--dp-type)",body:"var(--dp-type)"});
const t=designTexts("doppicha");

/** A little embroidered cap and a scalloped keepsake card, all information in one composition. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),name=useFitWords<HTMLHeadingElement>(38);
  const hosts=useFitWords<HTMLParagraphElement>(19);
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e4e6d9]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <main className="px-4 py-5"><div className="rounded-t-[95px] border border-gold/50 px-5 pt-7 pb-16 outline-1 outline-offset-4 outline-gold/20">
      <Doppi/>
      <p className="mt-2 text-center text-[12px] tracking-[.18em] uppercase text-muted">{t.opening.invitation}</p>
      <p className="mt-5 text-center text-[17px] italic text-muted">{t.relationWord(data.relation??"ogil",data.person)}</p>
      <h1 ref={name} className="mt-2 w-full text-center leading-[1.18] [--fit:38px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1>
      <h2 className="mt-3 text-center text-[24px] text-primary">{t.occasionTitles[inv.occasion]}</h2>
      <div aria-hidden className="mx-auto my-5 h-px w-12 bg-gold"/>
      <p className="text-center text-[18px] italic">{inv.text.greeting}</p><p className="mt-2 text-center text-[16px] leading-[1.7]">{inv.text.body}</p>
      <div className="mt-5 space-y-3">{inv.program.map((e,i)=><div data-event key={i} className="rounded-tl-[22px] rounded-br-[22px] border border-primary/20 bg-[#edf0e4]/60 px-4 py-4">
        <p className="text-[15px] text-primary">{e.title}</p>
        <p className="mt-2 text-[18px]">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-1 text-[17px] text-primary">{t.date.at(e.time)}</p>
        <p className="mt-3 text-[17px]">{e.venueName}</p><p className="mt-1 text-[15px] leading-relaxed text-muted">{e.address}</p>
        <MapButton href={e.mapHref} className="mt-3 rounded-full border border-primary/30 px-3 py-2 text-primary" iconClassName="text-primary"/>
      </div>)}</div>
      <p className="mt-6 text-center text-[14px] italic text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-2 text-center  leading-snug w-full [--fit:19px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p>
    </div></main>
  </InvitationShell>;
}

function Doppi(){return <svg data-decor aria-hidden="true" viewBox="0 0 300 180" className="mx-auto h-[156px] w-full max-w-[270px]" fill="none">
  <ellipse cx="150" cy="157" rx="97" ry="7" fill="#d6dcca" opacity=".65"/>
  <path d="M50 91Q150 8 250 91L237 140Q150 173 63 140Z" fill="#547565" stroke="#365344" strokeWidth="1.5"/>
  <path d="M50 91Q150 134 250 91L237 140Q150 173 63 140Z" fill="#3e5c4d"/>
  <path d="M58 112Q150 152 243 112M61 132Q150 169 239 132" stroke="#eadbc0" strokeWidth="1.2"/>
  {[0,1,2,3].map(i=><g key={i} transform={`translate(${91+i*39} ${i===0||i===3?88:72}) rotate(${i<2?-20:20})`} stroke="#f7eedc" strokeWidth="1.3"><path d="M0 21C-27 7-15-15 0-9C15-15 27 7 0 21ZM0 21C-6 9-7-4 0-9M0 16C13 9 12-2 3-4"/><circle cx="-7" cy="-2" r="1.5" fill="#e8d4a7" stroke="none"/></g>)}
  {[78,108,138,168,198,228].map((x,i)=><path key={x} d={`M${x-5} ${i===0||i===5?127:137}l5-5 5 5-5 5Z`} stroke="#eadbc0" strokeWidth=".8"/>)}
  <path d="M36 146q-17-12-12-26q16 2 12 26ZM266 146q17-12 12-26q-16 2-12 26Z" fill="#bcaa77" opacity=".7"/>
</svg>;}
