"use client";

/* eslint-disable @next/next/no-img-element -- Local pre-sized WebP assets, with explicit opening decode and no remote image service. */
import type { TemplateProps } from "../types";
import { t } from "@/texts/uz-cyrl";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Envelope } from "../vip-tilla-muhr/Envelope";
import { Branch, Closing, DateSection, Greeting, Names, Program, Venues } from "../vip-tilla-muhr/Elements";
import { fontClasses, vipVars } from "../vip-tilla-muhr/style";
import common from "../vip-tilla-muhr/vip.module.css";
import s from "./suzana.module.css";

const id="vip-suzana";
const palette={paper:"#F8F2E8",ink:"#4A2931",accent:"#7A2234",soft:"#EEDFD8"};
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode);
  return <InvitationShell inv={inv} style={vipVars(palette)} fontsClassName={fontClasses} className={`${common.page} ${s.heritage}`} backdropClassName="bg-[#e8ded2]" pageColor={palette.paper} musicVariant="soft" brandVariant="soft" rsvpLook={{paper:palette.paper,ink:palette.ink,line:"#B8924A",soft:palette.soft,accent:palette.accent,radius:"8px",buttonRadius:"24px"}} epilogue={<Closing inv={inv} id={id} ornate />}>
    <Envelope inv={inv} id={id} lining />
    <div inert={!inv.opened} aria-hidden={!inv.opened}>
      <section data-vip-section="hero" className={s.hero}><img src={`/vip/${id}/hero.webp`} alt="" width="1170" height="1755" fetchPriority="high" /><div className={s.heroVeil} /><div className={s.heroBorder} /><div className={s.nameplate}><Branch ornate /><span className={common.eyebrow}>{t.occasionTitles.nikoh}</span><Names inv={inv} /><p className={s.heroDate}>{t.date.long(inv.main.when.day,inv.main.when.monthIndex,inv.main.when.year)}</p></div><span className={s.scroll}>{t.vip.scroll} ↓</span></section>
      <main><Greeting inv={inv} id={id} ornate /><Program inv={inv} id={id} ornate /><DateSection inv={inv} /><section data-vip-section="moments" className={s.textile}><div className={s.textileBand} aria-hidden="true" /><img className={s.silkPhoto} src={`/vip/${id}/glasses.webp`} alt="" width="780" height="780" loading="lazy" /><div className={s.detail}><span className={common.eyebrow}>{t.vip.withLove}</span><p>{inv.blessing}</p><Branch ornate /></div><img className={s.dutarPhoto} src={`/vip/${id}/music.webp`} alt="" width="780" height="780" loading="lazy" /></section><Venues inv={inv} id={id} /></main>
    </div>
  </InvitationShell>;
}
