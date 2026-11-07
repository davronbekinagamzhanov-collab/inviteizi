"use client";

import type { TemplateProps } from "../types";
import { t } from "@/texts/uz-cyrl";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { vipPhotos } from "../vip-tilla-muhr/photos";
import { VipImage } from "../vip-tilla-muhr/VipImage";
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
      <section data-vip-section="hero" className={s.hero}><div className={s.heroFrame}><VipImage photo={vipPhotos(inv.data,id)[0]} eager /></div><div data-vip-hero-ink className={s.title}><span className={common.eyebrow}>{t.occasionTitles.nikoh}</span><Names inv={inv} /><p>{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></div><span className={s.sideNote}>{t.vip.withLove}</span><span className={s.scroll}>{t.vip.scroll} ↓</span></section>
      <main data-vip-layout="three-photos"><Greeting inv={inv} id={id} /><DateSection inv={inv} /><Program inv={inv} /><Venues inv={inv} /></main>
    </div>
  </InvitationShell>;
}
