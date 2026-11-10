"use client";
import type {TemplateProps} from "../types";
import {designVars} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Shell,Photo,Name,Letter,Calendar,Timer,Events,Ending} from "../celebration-preview/Parts";
import {Opening} from "../celebration-preview/Opening";
import {mainEvent} from "../celebration-preview/model";
import s from "./subhi.module.css";
const id="subhi-safo";
const palette={primary:"#315b68",primaryDark:"#244650",gold:"#a79776",goldLight:"#e8dcc8",paper:"#f6f0e6",ink:"#304e57",muted:"#79837e"};
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"}),e=mainEvent(inv);return <Shell inv={inv} id={id} className={s.page} style={designVars(palette)} ending={<Ending inv={inv} id={id} className={s.ending}/>}>{!inv.opened&&<Opening inv={inv} id={id} className={s.opening}/>}<div data-celebration-layout="photographic-portico-v2" inert={!inv.opened} aria-hidden={!inv.opened}><header data-section="hero" className={s.hero}><Photo id={id} eager className={s.heroPhoto}/><span className={s.intro}>{celebrationCopy(inv.lang).respect}</span><div className={s.heroInk}><span className={s.occasion}>{t.occasionTitles.nahorgi}</span><Name inv={inv} max={43}/><div className={s.dateRow}><time dateTime={`${e.date}T${e.time}`}>{e.time}</time><p>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</p></div></div></header><main><Calendar inv={inv} className={s.calendar}><Timer inv={inv}/></Calendar><Letter inv={inv} className={s.letter}/><Events inv={inv} className={s.venues}/></main></div></Shell>;}
