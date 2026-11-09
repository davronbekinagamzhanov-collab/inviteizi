"use client";
import type {TemplateProps} from "../types";
import {designVars} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Shell,Art,Name,Letter,Calendar,Timer,Events,Ending} from "../celebration-preview/Parts";
import {Opening} from "../celebration-preview/Opening";
import {mainEvent} from "../celebration-preview/model";
import s from "./subhi.module.css";
const id="subhi-safo";
const palette={primary:"#365e70",primaryDark:"#244552",gold:"#a59473",goldLight:"#e8decb",paper:"#f6f1e6",ink:"#304e59",muted:"#748084"};
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"}),e=mainEvent(inv);return <Shell inv={inv} id={id} className={s.page} style={designVars(palette,{display:"var(--occasion-sturdy)",accent:"var(--occasion-display)",body:"var(--occasion-body)"})} ending={<Ending inv={inv} id={id} className={s.ending}/>}>{!inv.opened&&<Opening inv={inv} id={id} className={s.opening}/>}<div data-celebration-layout="morning-portico" inert={!inv.opened} aria-hidden={!inv.opened}><header data-section="hero" className={s.hero}><span className={s.intro}>{celebrationCopy(inv.lang).respect}</span><h2>{t.occasionTitles.nahorgi}</h2><Name inv={inv} max={32}/><Art id={id} eager className={s.heroArt}/><div className={s.heroTime}><span>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}</span><time dateTime={`${e.date}T${e.time}`}>{e.time}</time><span>{celebrationCopy(inv.lang).morning}</span></div></header><main><Events inv={inv} className={s.venues}/><Letter inv={inv} className={s.letter}/><Calendar inv={inv} className={s.calendar}><Timer inv={inv}/></Calendar></main></div></Shell>;}
