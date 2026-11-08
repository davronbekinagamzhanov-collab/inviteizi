"use client";

import type {TemplateProps} from "../types";
import {t} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {SignatureOpening} from "../vip-signature/Opening";
import {Arrival,Calendar,DateLine,Letter,Memory,Monogram,Names,Photo,Programme,ScrollNote,SignatureShell} from "../vip-signature/Parts";
import s from "../vip-signature/signature.module.css";
const id="vip-zarrin-ahd";
export default function Design({data,mode}:TemplateProps){
  const inv=useInvitation(data,mode);
  return <SignatureShell inv={inv} id={id}><SignatureOpening inv={inv} id={id}/><div inert={!inv.opened} aria-hidden={!inv.opened} data-signature-layout="royal">
    <header data-vip-section="hero" className={s.royalHero}><div className={s.royalHeroTitle} data-signature-ink><span className={s.eyebrow}>{t.occasionTitles.nikoh}</span><Monogram data={inv.data}/><Names inv={inv}/><DateLine inv={inv}/></div><Photo inv={inv} id={id} slot={1} eager className={s.royalHeroPhoto}/><ScrollNote/></header>
    <main><Arrival inv={inv}/><Letter inv={inv} id={id}/><div className={s.royalDay}><Calendar inv={inv}/><Programme inv={inv} primaryVenueShown/></div><Memory inv={inv} id={id}/></main>
  </div></SignatureShell>;
}
