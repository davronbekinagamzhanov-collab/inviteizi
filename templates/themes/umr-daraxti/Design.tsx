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

const font=localFont({src:[{path:"../../../assets/fonts/Lora-Regular.ttf",style:"normal"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--ud-type",display:"swap"});
const vars=designVars({primary:"#8b674f",primaryDark:"#634a38",gold:"#b69a65",goldLight:"#ead7b2",paper:"#fcf7ec",ink:"#544b3e",muted:"#89836e"},{display:"var(--ud-type)",accent:"var(--ud-type)",body:"var(--ud-type)"});
const t=designTexts("umr-daraxti");

/** A family tree drawn in warm inks. Sections follow its trunk, rather than a generic card stack. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),name=useFitWords<HTMLHeadingElement>(44),when=inv.main.when;
  const hosts=useFitWords<HTMLParagraphElement>(27);
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e8e1d2]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="px-7 pt-10 pb-8 text-center">
      <p className="text-[12px] tracking-[.25em] uppercase text-muted">{t.opening.invitation}</p>
      <div className="relative mx-auto mt-5 max-w-[350px]"><FamilyTree/>{data.age!=null&&<div className="absolute inset-x-0 bottom-[15%]"><p className="text-[74px] leading-none text-primary">{data.age}</p><p className="mt-2 text-[15px] italic text-muted">{t.ageLabel}</p></div>}</div>
      <h1 ref={name} className="mt-2 w-full leading-tight [--fit:44px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1>
      <p className="mt-4 text-[21px] italic text-primary">{t.occasionTitles[inv.occasion]}</p>
      <p className="mt-6 text-[17px] tracking-[.04em] text-muted">{t.date.long(when.day,when.monthIndex,when.year)}</p>
    </header>
    <main>
      <Reveal className="mx-8 mt-5 border-l border-gold/70 py-3 pl-6"><h2 className="text-[29px] italic leading-snug">{inv.text.greeting}</h2><p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p></Reveal>
      <section className="mx-5 mt-14 border-y border-gold/30 bg-[#f2ecdd] px-6 py-9 text-center">
        <Reveal><p className="mb-6 text-[26px] text-primary">{t.date.title[inv.occasion]}</p><Calendar date={when} marker="circle" markerClassName="text-[#a38f62]" markedDayClassName="text-paper"/></Reveal>
        <Reveal className="mt-8 border-t border-gold/30 pt-6"><p className="text-[16px] italic text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-5 grid grid-cols-4 gap-2",box:"flex min-w-0 flex-col items-center",number:"text-[30px] text-primary",label:"mt-1 text-[12px] text-muted",today:"text-[28px] text-primary"}}/></Reveal>
      </section>
      <section className="px-7 pt-14 pb-10">
        <Reveal><h2 className="mb-9 text-center text-[31px]">{t.venue.programTitle}</h2></Reveal>
        {inv.program.map((e,i)=><Reveal key={i} className="mb-9"><div data-event className="grid grid-cols-[42px_minmax(0,1fr)] gap-4">
          <div aria-hidden className="flex flex-col items-center"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/60 text-[20px] text-primary">{i+1}</span><span className="mt-3 w-px flex-1 bg-gold/35"/></div>
          <div className="border-b border-gold/30 pb-8"><p className="text-[15px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p>
            <p className="mt-2 text-[35px] text-primary">{t.date.clock(e.time)}</p><h3 className="mt-3 text-[25px] leading-snug">{e.title}</h3>
            <p className="mt-6 text-[21px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
            <MapButton href={e.mapHref} className="mt-5 border-b border-primary/45 pb-2 text-primary" iconClassName="text-primary"/>
          </div>
        </div></Reveal>)}
      </section>
      <Reveal className="relative mx-5 mb-7 border border-gold/30 px-7 pt-10 pb-20 text-center">
        <div aria-hidden className="mx-auto mb-7 h-12 w-px bg-gold/55"/><p className="text-[14px] tracking-[.18em] text-muted">{t.blessing.title}</p><p className="mt-6 text-[24px] italic leading-[1.8]">{inv.blessing}</p>
        <p className="mt-10 text-[16px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-4  leading-snug text-primary w-full [--fit:27px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[18px] italic">{t.hosts.waiting}</p>
      </Reveal>
    </main>
  </InvitationShell>;
}

function FamilyTree(){return <svg data-decor aria-hidden="true" viewBox="0 0 360 320" className="w-full" fill="none">
  <ellipse cx="180" cy="287" rx="80" ry="8" fill="#d6d2b9" opacity=".4"/>
  <path d="M165 281q21-48 8-88q-13-43-9-80l14-42q-7 81 21 117q-8 47-3 93" fill="#beac86"/>
  <g stroke="#a99972" strokeLinecap="round"><path d="M180 202Q101 183 68 108M180 170Q237 146 281 85M174 139Q120 116 112 62M180 118Q212 79 208 40" strokeWidth="4"/><path d="M127 175 91 154M109 154 101 116M219 147l11-53M242 127l40-12M145 121 142 78M194 96 233 60M180 132l-32-75" strokeWidth="2"/></g>
  {[[64,89,-35],[76,118,-65],[91,145,-40],[106,165,-70],[110,97,-15],[105,69,-40],[130,77,30],[142,55,-25],[159,92,25],[166,53,0],[183,62,40],[196,40,-15],[214,58,40],[235,61,60],[223,87,-15],[241,94,40],[262,84,-20],[282,73,25],[277,108,55],[257,125,55],[232,142,65],[209,158,65],[146,151,-35]].map(([x,y,r],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${r})`}><ellipse rx="10" ry="22" fill={i%3===0?"#c2b27c":i%3===1?"#a4af82":"#c9c59b"} fillOpacity=".9"/><path d="M0 15V-14" stroke="#8c986d" strokeWidth=".7"/></g>)}
  {[[89,102],[136,101],[200,77],[254,107],[212,128],[130,144]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" fill="#c18d6c" fillOpacity=".8"/>)}
  <path d="M124 284q56 10 112 0" stroke="#b69a65" strokeWidth="1.1"/>
</svg>;}
