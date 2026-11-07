"use client";

/* eslint-disable @next/next/no-img-element -- All local WebP assets are sized before commit and the first screens are explicitly decoded. */
import type { TemplateProps } from "../types";
import { t } from "@/texts/uz-cyrl";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Envelope } from "../vip-tilla-muhr/Envelope";
import { Closing, DateSection, Greeting, Names, Program, Venues } from "../vip-tilla-muhr/Elements";
import { fontClasses, vipVars } from "../vip-tilla-muhr/style";
import common from "../vip-tilla-muhr/vip.module.css";
import s from "./osmon.module.css";

const id="vip-osmon";
const palette={paper:"#F7FAFC",ink:"#233E53",accent:"#708FA8",soft:"#E3ECF2"};
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode);
  return <InvitationShell inv={inv} style={vipVars(palette)} fontsClassName={fontClasses} className={`${common.page} ${s.sky}`} backdropClassName="bg-[#dce5eb]" pageColor={palette.paper} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:palette.paper,ink:palette.ink,line:palette.accent,soft:palette.soft,accent:palette.accent,radius:"32px",buttonRadius:"24px"}} epilogue={<Closing inv={inv} id={id} />}>
    <Envelope inv={inv} id={id} />
    <div inert={!inv.opened} aria-hidden={!inv.opened}>
      <section data-vip-section="hero" className={s.hero}><div className={s.heroFrame}><img src={`/vip/${id}/hero.webp`} alt="" width="1170" height="1755" fetchPriority="high" /></div><div className={s.title}><span className={common.eyebrow}>{t.occasionTitles.nikoh}</span><Names inv={inv} /><p>{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></div><span className={s.sideNote}>{t.vip.withLove}</span><span className={s.scroll}>{t.vip.scroll} ↓</span></section>
      <main><DateSection inv={inv} /><Greeting inv={inv} id={id} /><section data-vip-section="moments" className={s.moments}><img className={s.hands} src={`/vip/${id}/hands.webp`} alt="" width="1170" height="1755" loading="lazy" /><div className={s.momentsCaption}><span className={common.eyebrow}>{t.vip.ourDay}</span><p className={common.script}>{t.vip.forever}</p></div><img className={s.balloons} src={`/vip/${id}/music.webp`} alt="" width="780" height="780" loading="lazy" /></section><Venues inv={inv} id={id} /><Program inv={inv} id={id} /></main>
    </div>
  </InvitationShell>;
}
