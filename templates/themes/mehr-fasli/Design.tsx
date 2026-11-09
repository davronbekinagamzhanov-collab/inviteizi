"use client";
import type {TemplateProps} from "../types";
import {designVars} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {useInvitation} from "../../blocks/useInvitation";
import {Shell,Art,Name,DateLine,Letter,Calendar,Timer,Events,Ending} from "../celebration-preview/Parts";
import {Opening} from "../celebration-preview/Opening";
import s from "./mehr.module.css";
const id="mehr-fasli";
const palette={primary:"#834d50",primaryDark:"#5d3538",gold:"#af906f",goldLight:"#ecd9c5",paper:"#f9f0e7",ink:"#623e3c",muted:"#937c70"};
export default function Design({data,mode}:TemplateProps){const inv=useInvitation(data,mode,{initialLanguage:"uz"});return <Shell inv={inv} id={id} className={s.page} style={designVars(palette,{display:"var(--occasion-display)",accent:"var(--occasion-display)",body:"var(--occasion-body)"})} ending={<Ending inv={inv} id={id} className={s.ending}/>}>{!inv.opened&&<Opening inv={inv} id={id} className={s.opening}/>}<div data-celebration-layout="botanical-jubilee" inert={!inv.opened} aria-hidden={!inv.opened}><header data-section="hero" className={s.hero}><span className={s.intro}>{t.occasionTitles.yubiley}</span>{inv.data.age!=null&&<div className={s.age} data-age><strong>{inv.data.age}</strong><span>{t.ageLabel}</span></div>}<Name inv={inv} max={56}/><span className={s.dedication}>{celebrationCopy(inv.lang).family}</span><Art id={id} eager className={s.heroArt}/><DateLine inv={inv}/></header><main><Letter inv={inv} className={s.letter}/><section data-section="dedication" className={s.dedicationScene}><p>{inv.blessing}</p><span>{inv.data.hosts}</span></section><Calendar inv={inv} className={s.calendar}><Timer inv={inv}/></Calendar><Events inv={inv} className={s.venues}/></main></div></Shell>;}
