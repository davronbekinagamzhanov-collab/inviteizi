"use client";


import type { TemplateProps } from "../types";
import { t, luxuryWeddingCopy as copy } from "@/texts/uz-cyrl";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { vipPhotos } from "./photos";
import { VipImage } from "./VipImage";
import { Envelope } from "./Envelope";
import { Closing, DateSection, Greeting, Names, Program, Venues } from "./Elements";
import { fontClasses, palette, vipVars } from "./style";
import s from "./vip.module.css";

const id="vip-tilla-muhr";
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode,{initialLanguage:"uz"});
  return <InvitationShell inv={inv} style={vipVars(palette)} fontsClassName={fontClasses} className={s.page} backdropClassName="bg-[#e9e0d2]" pageColor={palette.paper} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:palette.paper,ink:palette.ink,line:palette.accent,soft:palette.soft,accent:palette.accent,radius:"28px",buttonRadius:"24px"}} epilogue={<Closing inv={inv} id={id} />}>
    <Envelope inv={inv} id={id} />
    <div inert={!inv.opened} aria-hidden={!inv.opened}>
      <section data-vip-section="hero" className={s.hero}><VipImage photo={vipPhotos(inv.data,id)[0]} eager /><div className={s.heroShade} /><div data-vip-hero-ink className={s.heroTitle}><p className={s.eyebrow}>{t.occasionTitles.nikoh}</p><Names inv={inv} /><p className={s.heroDate}>{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></div><span className={s.heroBottom}>{copy(inv.lang).scroll}<span>↓</span></span></section>
      <main data-vip-layout="three-photos"><Greeting inv={inv} id={id} /><DateSection inv={inv} /><Program inv={inv} /><Venues inv={inv} /></main>
    </div>
  </InvitationShell>;
}
