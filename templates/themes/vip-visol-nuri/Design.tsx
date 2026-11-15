"use client";

import type {TemplateProps} from "../types";
import {t} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {SignatureOpening} from "../vip-signature/Opening";
import {Calendar,DateLine,Letter,Memory,Monogram,Names,Photo,Programme,ScrollNote,SignatureShell} from "../vip-signature/Parts";
import s from "../vip-signature/signature.module.css";
const id="vip-visol-nuri";
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode,{initialLanguage:"uz"});
  return <SignatureShell inv={inv} id={id}><SignatureOpening inv={inv} id={id}/><div inert={!inv.opened} aria-hidden={!inv.opened} data-wedding-collection="standard" data-signature-layout="cinema">
    <header data-vip-section="hero" className={s.cinemaHero}><Photo inv={inv} id={id} slot={1} eager/><div className={s.cinemaShade}/><div className={s.cinemaHeroTop} data-signature-ink><span className={s.eyebrow}>{t.occasionTitles.nikoh}</span><Monogram data={inv.data}/></div><div className={s.cinemaHeroNames} data-signature-ink><Names inv={inv}/><DateLine inv={inv}/></div><ScrollNote/></header>
    <main><Letter inv={inv} id={id}/><Calendar inv={inv}/><Memory inv={inv} id={id}/><Programme inv={inv}/></main>
  </div></SignatureShell>;
}
