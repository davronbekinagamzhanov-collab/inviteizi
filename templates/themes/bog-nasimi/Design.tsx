"use client";
import type {TemplateProps} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {Frame,useMorning,Person,DateLine,PhotoGrid,Letter,Calendar,Events,Closing} from "../nahorgi-collection/kit";
import s from "./garden.module.css";
export default function Design(props:TemplateProps){const inv=useMorning(props);return <Frame inv={inv} className={s.page} ink="#435e44" paper="#fbf8ee" simple><article data-layout="garden-single-card" data-entry-mode="direct" className={s.card}><PhotoGrid photos={inv.data.photos}/><div className={s.ink}><header className={s.heading}><p>{celebrationCopy(inv.lang).invitation}</p><h2>{t.occasionTitles.nahorgi}</h2><Person inv={inv} max={38}/></header><DateLine inv={inv}/><Calendar inv={inv} compact/><Letter inv={inv} compact/><Events inv={inv} compact/><Closing inv={inv} compact/></div></article></Frame>;}
