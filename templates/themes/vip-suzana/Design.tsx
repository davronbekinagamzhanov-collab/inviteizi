"use client";

import type { TemplateProps } from "../types";
import { t, luxuryWeddingCopy as copy } from "@/texts/uz-cyrl";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { vipPhotos } from "../vip-tilla-muhr/photos";
import { VipImage } from "../vip-tilla-muhr/VipImage";
import { Envelope } from "../vip-tilla-muhr/Envelope";
import { Branch, Closing, DateSection, Greeting, Names, Program, Venues } from "../vip-tilla-muhr/Elements";
import { fontClasses, vipVars } from "../vip-tilla-muhr/style";
import common from "../vip-tilla-muhr/vip.module.css";
import s from "./suzana.module.css";

const id="vip-suzana";
const palette={paper:"#F8F2E8",ink:"#4A2931",accent:"#7A2234",soft:"#EEDFD8"};
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode,{initialLanguage:"uz"});
  return <InvitationShell inv={inv} style={vipVars(palette)} fontsClassName={fontClasses} className={`${common.page} ${s.heritage}`} backdropClassName="bg-[#e8ded2]" pageColor={palette.paper} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:palette.paper,ink:palette.ink,line:"#B8924A",soft:palette.soft,accent:palette.accent,radius:"8px",buttonRadius:"24px"}} epilogue={<Closing inv={inv} id={id} ornate />}>
    <Envelope inv={inv} id={id} />
    <div inert={!inv.opened} aria-hidden={!inv.opened}>
      <section data-vip-section="hero" className={s.hero}><VipImage photo={vipPhotos(inv.data,id)[0]} eager /><div className={s.heroVeil} /><div className={s.heroBorder} /><div data-vip-hero-ink className={s.nameplate}><Branch ornate /><span className={common.eyebrow}>{t.occasionTitles.nikoh}</span><Names inv={inv} /><p className={s.heroDate}>{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></div><span className={s.scroll}>{copy(inv.lang).scroll} ↓</span></section>
      <main data-vip-layout="three-photos"><Greeting inv={inv} id={id} ornate /><DateSection inv={inv} /><Program inv={inv} ornate /><Venues inv={inv} /></main>
    </div>
  </InvitationShell>;
}
