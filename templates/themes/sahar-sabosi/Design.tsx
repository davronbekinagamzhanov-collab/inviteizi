"use client";
import type {TemplateProps} from "../types";
import {designVars} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Shell,Art,Name,DateLine,Letter,Calendar,Timer,Events,Ending,Leaf} from "../celebration-preview/Parts";
import {Opening} from "../celebration-preview/Opening";
import s from "./sahar.module.css";
const id="sahar-sabosi";
const palette={primary:"#52674c",primaryDark:"#35452f",gold:"#a48b5c",goldLight:"#e8dec7",paper:"#f8f4e8",ink:"#3e4b36",muted:"#737b64"};
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"});return <Shell inv={inv} id={id} className={s.page} style={designVars(palette,{display:"var(--occasion-sturdy)",accent:"var(--occasion-display)",body:"var(--occasion-body)"})} ending={<Ending inv={inv} id={id} className={s.ending}/>}>{!inv.opened&&<Opening inv={inv} id={id} className={s.opening}/>}<div data-celebration-layout="garden-letter" inert={!inv.opened} aria-hidden={!inv.opened}><header data-section="hero" className={s.hero}><span className={s.intro}>{celebrationCopy(inv.lang).morning}</span><h2 className={s.occasion}>{t.occasionTitles.nahorgi}</h2><Name inv={inv} max={36} className={s.person}/><DateLine inv={inv}/><Art id={id} eager className={s.heroArt}/><span className={s.scroll}>{celebrationCopy(inv.lang).scroll}<i>↓</i></span></header><main><Letter inv={inv} className={s.letter}/><Calendar inv={inv} className={s.calendar}><Leaf/><Timer inv={inv}/></Calendar><Events inv={inv} className={s.venues}/></main></div></Shell>;}
