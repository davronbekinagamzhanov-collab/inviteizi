"use client";
import type {TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {t,luxuryWeddingCopy as copy} from "@/texts/uz-cyrl";
import {Shell,Mono,Names,ScenePhoto,DateLine,Scroll,Portal,Flourish,Letter,Programme,Calendar,Venues} from "../vip-masterpiece/Parts";
import {Opening} from "../vip-masterpiece/Opening";
import s from "../vip-masterpiece/masterpiece.module.css";
const id="vip-ipak-ziyosi";
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"});return <Shell inv={inv} id={id}><Opening inv={inv} id={id}/><div inert={!inv.opened} aria-hidden={!inv.opened} data-master-layout="silk"><header data-vip-section="hero" className={s.silkHero}><span className={s.heroKicker}>{t.occasionTitles.nikoh}</span><div className={s.heroInitials} data-master-ink><Mono inv={inv}/></div><div className={s.heroPortal}><Portal><ScenePhoto inv={inv} id={id} slot={1} eager/></Portal></div><div className={s.heroSilk}/><div className={s.silkNames} data-master-ink><Names inv={inv}/><DateLine inv={inv}/></div><Flourish/><Scroll inv={inv}/></header><main><Letter inv={inv} id={id}/><Programme inv={inv}/><Calendar inv={inv}><ScenePhoto inv={inv} id={id} slot={3} className={s.thirdSilk}/><span data-photo-caption className={s.photoWhisper}>{copy(inv.lang).forever}</span></Calendar><Venues inv={inv}/></main></div></Shell>;}
