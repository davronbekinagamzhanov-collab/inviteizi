"use client";

/* eslint-disable @next/next/no-img-element -- Local WebP assets are pre-sized and explicitly decoded before the envelope animation. */

import type { TemplateProps } from "../types";
import { t } from "@/texts/uz-cyrl";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Envelope } from "./Envelope";
import { Closing, DateSection, Greeting, Names, Program, Venues } from "./Elements";
import { fontClasses, palette, vipVars } from "./style";
import s from "./vip.module.css";

const id="vip-tilla-muhr";
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode);
  return <InvitationShell inv={inv} style={vipVars(palette)} fontsClassName={fontClasses} className={s.page} backdropClassName="bg-[#e9e0d2]" pageColor={palette.paper} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:palette.paper,ink:palette.ink,line:palette.accent,soft:palette.soft,accent:palette.accent,radius:"28px",buttonRadius:"24px"}} epilogue={<Closing inv={inv} id={id} />}>
    <Envelope inv={inv} id={id} />
    <div inert={!inv.opened} aria-hidden={!inv.opened}>
      <section data-vip-section="hero" className={s.hero}><img src={`/vip/${id}/hero.webp`} alt="" width="1170" height="1755" fetchPriority="high" /><div className={s.heroShade} /><div data-vip-hero-ink className={s.heroTitle}><p className={s.eyebrow}>{t.occasionTitles.nikoh}</p><Names inv={inv} /><p className={s.heroDate}>{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></div><span className={s.heroBottom}>{t.vip.scroll}<span>↓</span></span></section>
      <main><Greeting inv={inv} id={id} /><DateSection inv={inv} /><div className={s.photoPair} data-vip-section="moments"><img src={`/vip/${id}/glasses.webp`} alt="" width="780" height="780" loading="lazy" /><img src={`/vip/${id}/music.webp`} alt="" width="780" height="780" loading="lazy" /></div><Program inv={inv} id={id} /><Venues inv={inv} id={id} /></main>
    </div>
  </InvitationShell>;
}
