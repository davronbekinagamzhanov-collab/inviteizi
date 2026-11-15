"use client";

import type {TemplateProps} from "../types";
import {t} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {AtelierOpening} from "../vip-atelier/Opening";
import {AtelierShell, Blessing, Calendar, DateLine, Letter, Ornament, Photo, Program, ScrollNote, Title, Venues} from "../vip-atelier/Parts";
import s from "../vip-atelier/atelier.module.css";

const id="vip-oq-tulpor";
export default function Design({data,mode}:TemplateProps) {
  const inv=useInvitation(data,mode);
  return <AtelierShell inv={inv} id={id}><AtelierOpening inv={inv} id={id}/><div inert={!inv.opened} aria-hidden={!inv.opened} data-atelier-content="horse">
    <header data-vip-section="hero" className={s.horseHero}><Photo inv={inv} id={id} slot={1} eager/><div className={s.horseHeroTitle} data-atelier-hero-ink><span className={s.eyebrow}>{t.occasionTitles.sunnat}</span><Title inv={inv}/><DateLine inv={inv}/></div><ScrollNote/></header>
    <main data-vip-layout="atelier-horse"><Letter inv={inv}><Ornament/></Letter><Program inv={inv}/><Calendar inv={inv}/><Blessing inv={inv}/><Venues inv={inv}/></main>
  </div></AtelierShell>;
}
