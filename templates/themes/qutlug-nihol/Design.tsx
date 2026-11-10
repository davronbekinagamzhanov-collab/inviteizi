"use client";
import type {TemplateProps} from "../types";
import {designVars} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Shell,Photo,Name,DateLine,Letter,Calendar,Timer,Events,Ending} from "../celebration-preview/Parts";
import {Opening} from "../celebration-preview/Opening";
import s from "./nihol.module.css";
const id="qutlug-nihol";
const palette={primary:"#456e60",primaryDark:"#2f5044",gold:"#a8956e",goldLight:"#e7dec8",paper:"#f6f0e5",ink:"#35584a",muted:"#7d8a75"};
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"});return <Shell inv={inv} id={id} className={s.page} style={designVars(palette)} ending={<Ending inv={inv} id={id} className={s.ending}/>}>{!inv.opened&&<Opening inv={inv} id={id} className={s.opening}/>}<div data-celebration-layout="photographic-sunnat-v2" inert={!inv.opened} aria-hidden={!inv.opened}><header data-section="hero" className={s.hero}><Photo id={id} eager className={s.heroPhoto}/><div className={s.heroInk}><span className={s.intro}>{celebrationCopy(inv.lang).joy}</span><span className={s.occasion}>{t.occasionTitles.sunnat}</span><Name inv={inv} max={54}/><DateLine inv={inv}/></div><span className={s.scroll}>{celebrationCopy(inv.lang).scroll}<i>↓</i></span></header><main><Letter inv={inv} className={s.letter}/><Calendar inv={inv} className={s.calendar}><Timer inv={inv}/></Calendar><Events inv={inv} className={s.venues}/></main></div></Shell>;}
