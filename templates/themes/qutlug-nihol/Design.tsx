"use client";
import type {TemplateProps} from "../types";
import {designVars} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Shell,Art,Name,DateLine,Letter,Calendar,Timer,Events,Ending} from "../celebration-preview/Parts";
import {Opening} from "../celebration-preview/Opening";
import s from "./nihol.module.css";
const id="qutlug-nihol";
const palette={primary:"#47786a",primaryDark:"#2d554a",gold:"#aa9c66",goldLight:"#e8e3c5",paper:"#f5f3e3",ink:"#37594b",muted:"#7e8b71"};
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"});return <Shell inv={inv} id={id} className={s.page} style={designVars(palette,{display:"var(--occasion-display)",accent:"var(--occasion-display)",body:"var(--occasion-body)"})} ending={<Ending inv={inv} id={id} className={s.ending}/>}>{!inv.opened&&<Opening inv={inv} id={id} className={s.opening}/>}<div data-celebration-layout="almond-celebration" inert={!inv.opened} aria-hidden={!inv.opened}><header data-section="hero" className={s.hero}><span className={s.intro}>{celebrationCopy(inv.lang).joy}</span><h2>{t.occasionTitles.sunnat}</h2><Name inv={inv} max={53}/><DateLine inv={inv}/><Art id={id} eager className={s.heroArt}/><svg className={s.heroStitch} viewBox="0 0 320 42" fill="none" aria-hidden="true"><path d="M4 23q65-30 129 0q27 15 53 0q66-30 130 0M4 29q65-30 129 0q27 15 53 0q66-30 130 0" stroke="currentColor"/><path d="M154 22q-24-26-27-9q5 18 27 9q23-27 28-9q-6 18-28 9Z" stroke="currentColor"/></svg></header><main><Calendar inv={inv} className={s.calendar}><Timer inv={inv}/></Calendar><Letter inv={inv} className={s.letter}/><Events inv={inv} className={s.venues}/></main></div></Shell>;}
