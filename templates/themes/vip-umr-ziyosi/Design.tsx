"use client";

import type {TemplateProps} from "../types";
import {t} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Reveal} from "../../blocks/Reveal";
import {AtelierOpening} from "../vip-atelier/Opening";
import {AtelierShell, Blessing, Calendar, DateLine, Letter, Ornament, Photo, Program, ScrollNote, Title, Venues} from "../vip-atelier/Parts";
import s from "../vip-atelier/atelier.module.css";

const id="vip-umr-ziyosi";
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode);
  return <AtelierShell inv={inv} id={id}><AtelierOpening inv={inv} id={id}/><div inert={!inv.opened} aria-hidden={!inv.opened} data-atelier-content="album">
    <header data-vip-section="hero" className={s.albumHero}><Photo inv={inv} id={id} slot={1} eager/><div className={s.albumHeroTitle} data-atelier-hero-ink><span className={s.eyebrow}>{t.occasionTitles.yubiley}</span><span className={s.heroAge}>{inv.data.age}<small>{t.ageLabel}</small></span><Title inv={inv}/><DateLine inv={inv}/></div><ScrollNote/></header>
    <main data-vip-layout="atelier-album"><Letter inv={inv}/><section data-vip-section="portrait" className={s.albumPortrait}><Reveal><div className={s.albumPhotoMount}><Photo inv={inv} id={id} slot={2}/></div><p>{t.vip.withLove}</p></Reveal></section><Blessing inv={inv}/><Calendar inv={inv}/><Program inv={inv}/><Venues inv={inv}/><section data-vip-section="memory" className={s.albumMemory}><Photo inv={inv} id={id} slot={3}/><Reveal><Ornament/><p>{t.hosts.thanks}</p></Reveal></section></main>
  </div></AtelierShell>;
}
