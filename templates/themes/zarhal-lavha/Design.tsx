"use client";
import localFont from "next/font/local";
import {memo,useEffect,useRef} from "react";
import type {InvitationData} from "@/lib/types";
import {motion,useReducedMotion} from "motion/react";
import {designVars,type TemplateProps} from "../types";
import {useInvitation,type Invitation} from "../../blocks/useInvitation";
import {InvitationShell} from "../../blocks/InvitationShell";
import {Words,useFitWords} from "../../blocks/FitWords";
import {MapButton} from "../../blocks/MapButton";
import {Reveal} from "../../blocks/Reveal";
import {Calendar} from "../../blocks/Calendar";
import {designTexts} from "@/texts/uz-cyrl";
import { MOTION } from "@/templates/blocks/motion";
const font=localFont({ preload: false,src:[{path:"../../../assets/fonts/Lora-Regular.ttf"},{path:"../../../assets/fonts/Lora-Italic.ttf",style:"italic"}],variable:"--zl-font",display:"swap"});
const vars=designVars({primary:"#89623c",primaryDark:"#634328",gold:"#b28b53",goldLight:"#ead7b6",paper:"#fcf6eb",ink:"#514332",muted:"#71614e"},{display:"var(--zl-font)",accent:"var(--zl-font)",body:"var(--zl-font)"});
const t=designTexts("zarhal-lavha");

/** Five engraved louvres turn edge-on in a single finite cascade, revealing a commemorative folio. */
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode),reduced=useReducedMotion();
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);useEffect(()=>()=>clearTimeout(timer.current),[]);
  const open=()=>{if(inv.started)return;inv.start();timer.current=setTimeout(inv.finishOpening,reduced?0:1150);};
  return <InvitationShell inv={inv} style={vars} fontsClassName={font.variable} backdropClassName="bg-[#ded3bd]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <Content data={data} inv={inv}/>
    {!inv.opened&&<button data-open type="button" onClick={open} disabled={inv.started} aria-label={t.opening.tapToOpen} className="absolute inset-x-0 top-0 z-40 h-svh min-h-[560px] overflow-hidden text-ink" style={{perspective:1200}}>
      {[0,1,2,3,4].map(i=><motion.div key={i} initial={false} animate={{rotateX:inv.started?(i%2?90:-90):0,opacity:inv.started?0:1}} transition={{duration:reduced?0:MOTION.base,delay:reduced?0:i * MOTION.step,ease: MOTION.ease}} className="absolute inset-x-0 h-[20.2%] border-y border-[#c0a271]/45 bg-[#eee0c4]" style={{top:`${i*20}%`,transformOrigin:i%2?"center bottom":"center top",backfaceVisibility:"hidden",willChange:inv.started?"transform,opacity":undefined}}><div aria-hidden className="absolute inset-3 border border-[#b28b53]/40"/>{i===0||i===4?<div className="absolute inset-x-8 top-[25%]"><Filigree/></div>:null}</motion.div>)}
      <motion.div initial={false} animate={{opacity:inv.started?0:1,y:inv.started?-12:0}} transition={{duration:reduced?0:MOTION.fast, ease: MOTION.ease}} className="pointer-events-none absolute inset-x-7 top-[31%] text-center"><p className="text-[13px] uppercase tracking-[.2em]">{t.opening.invitation}</p>{data.age!=null&&<p className="mt-6 text-[88px] leading-none text-primary">{data.age}<span className="ml-2 text-[22px] italic">{t.ageLabel}</span></p>}<p className="mt-7 text-[29px]">{t.occasionTitles[inv.occasion]}</p>{data.person&&<p className="mt-3 text-[24px] leading-tight [overflow-wrap:anywhere]">{data.person}</p>}<p className="mt-3 text-[16px] tracking-[.12em]">{t.date.short(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p><p className="mt-9 text-[17px]">{t.opening.tapToOpen}</p></motion.div>
    </button>}
  </InvitationShell>;
}
/** Order content is independent of opening/playback state; avoid rebuilding long JSX trees on touch. */
const Content=memo(function Content({data,inv}:{data:InvitationData;inv:Invitation}){
  const name=useFitWords<HTMLHeadingElement>(42),hosts=useFitWords<HTMLParagraphElement>(25);
  return <>
    <header className="px-7 pt-8 pb-10">
      <Filigree/><p className="mt-5 text-center text-[12px] tracking-[.22em] uppercase text-muted">{t.opening.invitation}</p>
      <div className="mt-8 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 border-y border-gold/50 py-7">
        {data.age!=null&&<div className="border-r border-gold/50 pr-4 text-primary"><p className="text-[70px] leading-none tracking-[-.08em]">{data.age}</p><p className="mt-2 text-center text-[15px] italic">{t.ageLabel}</p></div>}
        <div className={data.age==null?"col-span-2":""}><p className="text-[15px] text-muted">{t.occasionTitles[inv.occasion]}</p><h1 ref={name} className="mt-4 w-full leading-[1.17] [--fit:42px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1></div>
      </div>
      <p className="mt-6 text-center text-[19px] text-primary">{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p><p className="mt-2 text-center text-[16px] text-muted">{t.date.at(inv.main.time)}</p>
    </header>
    <main className="pb-20">
      <Reveal className="mx-7 border-l-2 border-gold/50 pl-5"><h2 className="text-[28px] italic">{inv.text.greeting}</h2><p className="mt-5 text-[18px] leading-[1.9]">{inv.text.body}</p></Reveal>
      <Reveal className="mx-6 mt-12 border border-gold/40 bg-[#f2e7d2] px-5 py-7"><p className="mb-6 text-center text-[25px] text-primary">{t.date.title[inv.occasion]}</p><Calendar date={inv.main.when} marker="circle" markerClassName="text-primary" markedDayClassName="text-paper"/></Reveal>
      <section className="mt-12 px-7"><h2 className="mb-7 text-[28px] text-primary">{t.venue.programTitle}</h2>{inv.program.map((e,i)=><Reveal key={i} className="mb-8"><div data-event className="border-t border-gold/50 pt-5"><div className="flex items-start gap-3"><span aria-hidden className="text-[13px] text-muted">0{i+1}</span><h3 className="text-[24px] leading-snug">{e.title}</h3></div><p className="mt-4 text-[16px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><p className="mt-2 text-[29px] text-primary">{t.date.at(e.time)}</p><p className="mt-4 text-[22px] leading-snug">{e.venueName}</p><p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-5 border-b border-primary/50 pb-2 text-primary" iconClassName="text-primary"/></div></Reveal>)}</section>
      <Reveal className="mx-5 mt-10 border-double border-y-4 border-gold/40 px-5 py-9 text-center"><p className="text-[22px] italic leading-relaxed">{inv.blessing}</p><p className="mt-8 text-[15px] text-muted">{t.hosts.respectDeep}</p><p ref={hosts} className="mt-3 w-full leading-snug [--fit:25px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p><p className="mt-6 text-[17px] text-primary">{t.hosts.waiting}</p></Reveal>
    </main>
  </>;
},(a,b)=>a.data===b.data&&a.inv.mode===b.inv.mode&&a.inv.lang===b.inv.lang);
function Filigree(){return <svg data-decor aria-hidden="true" viewBox="0 0 320 100" className="mx-auto w-full max-w-[310px]" fill="none" stroke="#b28b53" strokeWidth="1.2"><path d="M12 50h45q25 0 35-20t26 0q12 22 42 20q30 2 42-20t26 0q10 20 35 20h45M38 58q25 37 53 5M282 58q-25 37-53 5M75 44q-17-31 12-28q22 6 6 28M245 44q17-31-12-28q-22 6-6 28"/><path d="M160 14q-29 28 0 44q29-16 0-44ZM160 87q-19-19 0-29q19 10 0 29Z" fill="#dfc798" fillOpacity=".45"/><path d="m132 54-8 12 12 5M188 54l8 12-12 5"/><circle cx="160" cy="50" r="5" fill="#b28b53"/></svg>;}
