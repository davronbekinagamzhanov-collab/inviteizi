"use client";
import type {TemplateProps} from "../types";
import {designVars} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Shell,Photo,Name,DateLine,Letter,Calendar,Timer,Events,Ending} from "../celebration-preview/Parts";
import {Opening} from "../celebration-preview/Opening";
import s from "./mehr.module.css";
const id="mehr-fasli";
const palette={primary:"#7d4047",primaryDark:"#542d33",gold:"#ad8c67",goldLight:"#ebd8c3",paper:"#f7eee5",ink:"#613d3b",muted:"#92786d"};
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"});return <Shell inv={inv} id={id} className={s.page} style={designVars(palette)} ending={<Ending inv={inv} id={id} className={s.ending}/>}>{!inv.opened&&<Opening inv={inv} id={id} className={s.opening}/>}<div data-celebration-layout="photographic-jubilee-v2" inert={!inv.opened} aria-hidden={!inv.opened}><header data-section="hero" className={s.hero}><Photo id={id} eager className={s.heroPhoto}/><span className={s.intro}>{t.occasionTitles.yubiley}</span>{inv.data.age!=null&&<div className={s.age} data-age><strong>{inv.data.age}</strong><span>{t.ageLabel}</span></div>}<div className={s.heroInk}><span className={s.family}>{celebrationCopy(inv.lang).family}</span><Name inv={inv} max={57}/><DateLine inv={inv}/></div></header><main><Letter inv={inv} className={s.letter}/><Events inv={inv} className={s.venues}/><Calendar inv={inv} className={s.calendar}><Timer inv={inv}/></Calendar></main></div></Shell>;}
