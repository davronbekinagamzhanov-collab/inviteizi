"use client";
import localFont from "next/font/local";
import {designVars,type TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {designTexts} from "@/texts/uz-cyrl";
const font=localFont({ preload: false,src:[{path:"../../../assets/fonts/Lora-Regular.ttf",style:"normal"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--ms-font",display:"swap"});
const vars=designVars({primary:"#8c6d67",primaryDark:"#66514e",gold:"#b3a085",goldLight:"#e7d7bc",paper:"#fcf7f0",ink:"#574b48",muted:"#93857d"},{display:"var(--ms-font)",accent:"var(--ms-font)",body:"var(--ms-font)"});
const t=designTexts("marvarid-satr");

/** An ivory wedding stationery sheet: diagonal pearl embroidery and staggered names. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),names=useFitWords<HTMLHeadingElement>(41),hosts=useFitWords<HTMLParagraphElement>(19);
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#e9e0d7]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <main className="relative mx-3 my-4 border border-gold/30 px-6 pt-7 pb-16">
      <Pearls/>
      <p className="relative w-fit bg-paper/95 pr-3 text-[11px] uppercase tracking-[.24em] text-muted">{t.opening.invitation}</p>
      <h1 ref={names} className="relative mt-16 w-full font-display leading-[1.18] [--fit:41px]"><span className="block text-[length:var(--fit)]"><Words text={data.groom??""}/></span><span className="my-2 block text-center text-[22px] italic text-muted">{t.cover.andWord}</span><span className="block text-right text-[length:var(--fit)] italic"><Words text={data.bride??""}/></span></h1>
      <p className="mt-5 text-right text-[18px] text-primary">{t.occasionTitles[inv.occasion]}</p>
      <div aria-hidden className="my-6 h-px bg-gold/40"/>
      <p className="text-[19px] italic text-primary">{inv.text.greeting}</p><p className="mt-3 text-[16px] leading-[1.8]">{inv.text.body}</p>
      <div className="mt-5">{inv.program.map((e,i)=><div data-event key={i} className="border-t border-gold/35 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><p className="text-[16px] text-primary">{e.title}</p><p className="text-[18px]">{t.date.clock(e.time)}</p></div>
        <p className="mt-1 text-[14px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-3 text-[17px]">{e.venueName}</p><p className="mt-1 text-[15px] leading-relaxed text-muted">{e.address}</p>
        <MapButton href={e.mapHref} className="mt-3 border-b border-primary/40 pb-1 text-primary" iconClassName="text-primary"/>
      </div>)}</div>
      {inv.sides&&<div className="mt-4 grid grid-cols-2 gap-3 border-y border-gold/30 py-3 text-[13px] leading-relaxed text-muted"><p>{t.sides.groom}<br/>{inv.sides.groom}</p><p className="text-right">{t.sides.bride}<br/>{inv.sides.bride}</p></div>}
      <p className="mt-5 text-center text-[14px] italic text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-2 w-full text-center leading-snug [--fit:19px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p>
    </main>
  </InvitationShell>;
}
function Pearls(){return <svg data-decor aria-hidden="true" viewBox="0 0 340 135" className="pointer-events-none absolute inset-x-0 top-0 w-full" fill="none">
  <path d="M95 0Q160 112 340 113M115 0Q180 98 340 92" stroke="#c3af92" strokeWidth=".7"/>
  {Array.from({length:19},(_,i)=>{const u=i/18,x=108+232*u,y=4+105*Math.sin(u*Math.PI/2);return <g key={i}><circle cx={x} cy={y} r={i%3===0?5:3.4} fill="#f3e6d5" stroke="#c7b59b" strokeWidth=".7"/><circle cx={x-1.1} cy={y-1.2} r="1.2" fill="#fffef8"/></g>;})}
  <g transform="translate(252 62) rotate(-24)" stroke="#b9a083" strokeWidth=".9"><path d="M0 33V-22M0 12Q-25-4-17-15Q3-11 0 12ZM0-3Q19-26 24-10Q20 4 0-3Z"/><path d="M0 30Q-23 12-23 26Q-15 39 0 30Z" fill="#e4d7c5"/></g>
</svg>;}
