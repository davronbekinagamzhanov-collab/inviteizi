"use client";
import type {TemplateProps} from "../types";
import {designVars} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Shell,Photo,Name,DateLine,Letter,Calendar,Timer,Events,Ending} from "../celebration-preview/Parts";
import {Opening} from "../celebration-preview/Opening";
import s from "./sahar.module.css";
const id="sahar-sabosi";
const palette={primary:"#52664c",primaryDark:"#35462f",gold:"#a58a61",goldLight:"#e8dcc7",paper:"#f6f0e5",ink:"#3d4936",muted:"#78806b"};
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"});return <Shell inv={inv} id={id} className={s.page} style={designVars(palette)} ending={<Ending inv={inv} id={id} className={s.ending}/>}>{!inv.opened&&<Opening inv={inv} id={id} className={s.opening}/>}<div data-celebration-layout="photographic-garden-v2" inert={!inv.opened} aria-hidden={!inv.opened}><header data-section="hero" className={s.hero}><Photo id={id} eager className={s.heroPhoto}/><span className={s.intro}>{celebrationCopy(inv.lang).morning}</span><div className={s.heroInk}><span className={s.occasion}>{t.occasionTitles.nahorgi}</span><Name inv={inv} max={66}/><DateLine inv={inv}/><p className={s.hosts}>{inv.data.hosts}</p></div><span className={s.scroll}>{celebrationCopy(inv.lang).scroll}</span></header><main><Events inv={inv} className={s.venues}/><Letter inv={inv} className={s.letter}/><Calendar inv={inv} className={s.calendar}><Timer inv={inv}/></Calendar></main></div></Shell>;}
