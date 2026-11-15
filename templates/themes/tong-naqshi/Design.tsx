"use client";
/* eslint-disable @next/next/no-img-element -- One generated photographic textile border, no client-photo capability. */
import type {TemplateProps} from "../types";
import {t,celebrationCopy} from "@/texts/uz-cyrl";
import {Frame,useMorning,Person,Letter,Calendar,Events,Closing,mainEvent} from "../nahorgi-collection/kit";
import s from "./woven.module.css";
export default function Design(props:TemplateProps){const inv=useMorning(props),e=mainEvent(inv),d=e.when;return <Frame inv={inv} className={s.page} ink="#29485c" paper="#f8f3e9" simple><article data-layout="woven-single-poster" data-entry-mode="direct" className={s.poster}><img className={s.textile} src="/art/nahorgi-collection/tong-naqshi.webp" alt="" aria-hidden width="850" height="1275" loading="eager"/><div className={s.print}><header className={s.heading}><p>{celebrationCopy(inv.lang).respect}</p><h2>{t.occasionTitles.nahorgi}</h2></header><div className={s.stamp}><strong>{d.day}</strong><div><p>{t.date.monthYear(d.monthIndex,d.year)}</p><time dateTime={`${e.date}T${e.time}`}>{e.time}</time></div></div><Person inv={inv} max={36}/><Letter inv={inv} compact/><Events inv={inv} compact/><Calendar inv={inv} compact/><Closing inv={inv} compact/></div></article></Frame>;}
