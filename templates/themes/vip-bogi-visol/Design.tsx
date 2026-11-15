"use client";

import type {TemplateProps} from "../types";
import {t} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Reveal} from "../../blocks/Reveal";
import {AtelierOpening} from "../vip-atelier/Opening";
import {AtelierShell, Blessing, Calendar, DateLine, Letter, Monogram, Ornament, Photo, Program, ScrollNote, Title, Venues} from "../vip-atelier/Parts";
import s from "../vip-atelier/atelier.module.css";

const id="vip-bogi-visol";
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode);
  return <AtelierShell inv={inv} id={id}><AtelierOpening inv={inv} id={id}/><div inert={!inv.opened} aria-hidden={!inv.opened} data-atelier-content="garden">
    <header data-vip-section="hero" className={s.gardenHero}><Photo inv={inv} id={id} slot={1} eager/><div className={s.gardenShade}/><div data-atelier-hero-ink className={s.gardenHeroTitle}><span className={s.eyebrow}>{t.vip.forever}</span><Monogram data={inv.data}/><Title inv={inv}/><DateLine inv={inv}/></div><ScrollNote/></header>
    <main data-vip-layout="atelier-garden"><Calendar inv={inv}/><section data-vip-section="portrait" className={s.gardenPortrait}><Reveal><div className={s.gardenWindow}><Photo inv={inv} id={id} slot={2}/></div><span className={s.eyebrow}>{t.vip.withLove}</span></Reveal></section><Letter inv={inv}/><Program inv={inv}/><section data-vip-section="memory" className={s.gardenMemory}><Photo inv={inv} id={id} slot={3}/><Reveal className={s.gardenMemoryCaption}><Ornament/><p>{t.vip.saveDate}</p></Reveal></section><Venues inv={inv}/><Blessing inv={inv}/></main>
  </div></AtelierShell>;
}
