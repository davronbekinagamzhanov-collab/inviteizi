"use client";
/* eslint-disable @next/next/no-img-element -- Existing photographic artwork, used once. */
import type {TemplateProps} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {Frame,useMorning,Person,DateLine,Letter,Calendar,Timer,Events,Closing,mainEvent} from "../nahorgi-collection/kit";
import s from "./subhi.module.css";
export default function Design(props:TemplateProps){const inv=useMorning(props),e=mainEvent(inv);return <Frame inv={inv} className={s.page} ink="#315766" paper="#faf6ed" ending={<Closing inv={inv}/>}><main data-layout="subhi-editorial-portico" data-entry-mode="direct"><header data-section="hero" className={s.hero}><p className={s.kicker}>{celebrationCopy(inv.lang).respect}</p><h2>{t.occasionTitles.nahorgi}</h2><Person inv={inv} max={48}/><figure><img src="/art/celebrations/subhi-safo-hero.webp" width="941" height="1672" alt="" aria-hidden loading="eager"/></figure><div className={s.clockBand}><time dateTime={`${e.date}T${e.time}`}>{e.time}</time><DateLine inv={inv} showTime={false}/></div></header><Letter inv={inv}/><div className={s.date}><Calendar inv={inv}/><Timer inv={inv}/></div><div className={s.events}><Events inv={inv}/></div></main></Frame>;}
