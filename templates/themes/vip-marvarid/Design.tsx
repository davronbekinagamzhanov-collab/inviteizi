"use client";

import type {TemplateProps} from "../types";
import {t} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Reveal} from "../../blocks/Reveal";
import {AtelierOpening} from "../vip-atelier/Opening";
import {AtelierShell, Blessing, Calendar, DateLine, Letter, Monogram, Ornament, Photo, Program, ScrollNote, Title, Venues} from "../vip-atelier/Parts";
import s from "../vip-atelier/atelier.module.css";

const id="vip-marvarid";
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode);
  return <AtelierShell inv={inv} id={id}><AtelierOpening inv={inv} id={id}/><div inert={!inv.opened} aria-hidden={!inv.opened} data-atelier-content="pearl">
    <header data-vip-section="hero" className={s.pearlHero}><span className={s.cornerNote}>{t.vip.forever}</span><div className={s.pearlTitle} data-atelier-hero-ink><span className={s.eyebrow}>{t.occasionTitles.nikoh}</span><Monogram data={inv.data}/><Title inv={inv}/><DateLine inv={inv}/></div><Photo inv={inv} id={id} slot={1} eager className={s.pearlHeroPhoto}/><ScrollNote/></header>
    <main data-vip-layout="atelier-pearl"><Letter inv={inv}/><section data-vip-section="portrait" className={s.pearlPortrait}><Reveal><Photo inv={inv} id={id} slot={2}/><span className={s.verticalNote}>{t.vip.withLove}</span></Reveal></section><Calendar inv={inv}/><Venues inv={inv}/><section data-vip-section="memory" className={s.pearlMemory}><Photo inv={inv} id={id} slot={3}/><Reveal className={s.memoryCaption}><Ornament/><p>{t.vip.forever}</p></Reveal></section><Program inv={inv}/><Blessing inv={inv}/></main>
  </div></AtelierShell>;
}
