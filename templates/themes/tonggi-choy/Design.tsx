"use client";

import type { TemplateProps } from "../types";
import { designVars } from "../types";
import localFont from "next/font/local";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words,useFitWords } from "../../blocks/FitWords";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { designTexts,photoAttributions } from "@/texts/uz-cyrl";

const displayFont53077063=localFont({src: [{path: "../../../assets/fonts/google/alegreya/Alegreya[wght].woff2", weight: "400 500", style: "normal"}, {path: "../../../assets/fonts/google/alegreya/Alegreya-Italic[wght].woff2", weight: "400 500", style: "italic"}], display: "swap", preload: false, variable: "--tc-display"});
const bodyFont53077063=localFont({src: [{path: "../../../assets/fonts/google/ptsans/PT_Sans-Web-Regular.woff2", weight: "400", style: "normal"}], display: "swap", preload: false, variable: "--tc-body"});
const vars=designVars({primary:"#455f85",primaryDark:"#2e4669",gold:"#b6a068",goldLight:"#e3d7b0",paper:"#faf8ed",ink:"#414d5b",muted:"#7c8790",accent:"#a8b9c5"},{display:"var(--tc-display)",accent:"var(--tc-display)",body:"var(--tc-body)"});
const t=designTexts("tonggi-choy"); const credit=photoAttributions["tonggi-choy"]!;

/** An open morning note, round real-photo tea portrait and a cobalt ripple rule. */
export default function Design({data,mode,art}:TemplateProps){
  const inv=useInvitation(data,mode,{opening:false}),when=inv.main.when,name=useFitWords<HTMLHeadingElement>(45);
  return <InvitationShell inv={inv} style={vars} fontsClassName={`${displayFont53077063.variable} ${bodyFont53077063.variable}`} backdropClassName="bg-[#e1e6e5]" className="bg-paper text-ink [overflow-wrap:anywhere]">
    <header className="px-7 pt-9 pb-7"><p className="text-center text-[13px] tracking-[.23em] text-primary uppercase">{t.opening.invitation}</p><div className="relative mx-auto mt-6 h-[235px] w-[235px] max-w-full overflow-hidden rounded-full border-[6px] border-[#e3e9e4]"><PhotoBackdrop src={art??"/art/tonggi-choy.webp"} fade="radial" color="#faf8ed" position="50% 83%" opacity={.91} strength={.1} priority/></div><Ripples/>
      <p className="mt-6 font-display text-[32px]">{t.occasionTitles[inv.occasion]}</p><h1 ref={name} className="mt-2 w-full font-display leading-tight [--fit:45px]"><span className="text-[length:var(--fit)]"><Words text={data.person??""}/></span></h1><p className="mt-3 font-display text-[22px] leading-snug italic text-muted">{t.causeLine(data)}</p>
      <div className="mt-6 border-l-2 border-gold/50 pl-4"><p className="text-[20px]">{t.date.long(when.day,when.monthIndex,when.year)}</p><p className="mt-2 text-[19px] text-primary">{t.weekdays[when.weekdayIndex]} · {t.date.at(inv.main.time)}</p></div>
    </header>
    <main className="px-7 pb-16">
      <Reveal><h2 className="font-display text-[27px] italic">{inv.text.greeting}</h2><p className="mt-4 text-[20px] leading-[1.7]">{inv.text.body}</p></Reveal>
      <Reveal className="my-8 border-y border-primary/20 py-5 text-center"><p className="text-[18px] text-muted">{t.countdown.title[inv.occasion]}</p><Countdown startsAt={when.startsAt} look={{grid:"mt-4 grid grid-cols-4",box:"flex min-w-0 flex-col items-center",number:"font-display text-[35px] text-primary",label:"mt-1 text-[14px] whitespace-nowrap text-muted",today:"font-display text-[28px]"}}/></Reveal>
      <section><Reveal><h2 className="mb-3 font-display text-[30px]">{t.venue.programTitle}</h2></Reveal>{inv.program.map((e,i)=><Reveal key={i} className="border-b border-primary/20 py-6"><p className="text-[16px] text-muted">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p><div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1"><p className="font-display text-[34px] text-primary">{t.date.clock(e.time)}</p><h3 className="font-display text-[27px]">{e.title}</h3></div><p className="mt-4 text-[21px]">{e.venueName}</p><p className="mt-2 text-[19px] leading-relaxed text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-4 rounded-full border border-primary/35 px-5 py-3 text-primary" iconClassName="text-primary"/></Reveal>)}</section>
      <Reveal className="mt-10"><Ripples/><p className="mt-7 font-display text-[25px] italic leading-relaxed">{inv.blessing}</p><p className="mt-8 text-[17px] text-muted">{t.hosts.respectDeep}</p><p className="mt-3 font-display text-[29px] leading-snug">{data.hosts}</p><p className="mt-5 text-[19px]">{t.hosts.waiting}</p></Reveal>
      <footer className="mt-12 border-t border-primary/15 pt-4 text-[16px] leading-relaxed text-muted"><a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline decoration-primary/30 underline-offset-4">{t.photoCredits.by(credit.author)}</a>{" · "}<a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-primary/30 underline-offset-4">{credit.license}</a><p className="mt-1">{t.photoCredits.adapted}</p></footer>
    </main>
  </InvitationShell>;
}
function Ripples(){return <svg aria-hidden data-decor viewBox="0 0 320 18" preserveAspectRatio="none" className="mt-6 h-4 w-full" fill="none" stroke="#839ab1" strokeWidth=".9"><path d="M0 4Q20 18 40 4T80 4T120 4T160 4T200 4T240 4T280 4T320 4M0 10Q20 24 40 10T80 10T120 10T160 10T200 10T240 10T280 10T320 10"/></svg>;}
