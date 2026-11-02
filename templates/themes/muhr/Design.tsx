"use client";
/**
 * «Муҳр» — никоҳ, Анимацияли. Пыльно-голубой бумажный конверт с сургучной печатью-монограммой.
 * Порядок: конверт → имена у арки с фото → приветствие → календарь «Сана» → программа со стрелками →
 * «МАНЗИЛ» сбоку → две семьи → фото клиента → «Кутамиз» → ответы → подпись.
 */
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { designVars, type TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { Words, useFitWords } from "../../blocks/FitWords";
import { t } from "@/texts/uz-cyrl";
import { naturalFonts } from "../natural/fonts";
import {
  HandCalendar,
  Photo,
  Script,
  SideTitle,
  Squiggle,
  useSeen,
} from "../natural/kit";
import { creditsOf, initial, shots, venues } from "../natural/common";
import { localPhoto } from "../natural/photos";
import { melody } from "./melody";
import s from "./muhr.module.css";

const vars = {
  ...designVars({
    primary: "#7f97ad",
    primaryDark: "#2c3b49",
    gold: "#7f97ad",
    goldLight: "#dfe7ee",
    paper: "#f3f4f2",
    ink: "#2c3b49",
    muted: "#6b7884",
  }),
  "--n-paper": "#f3f4f2",
  "--n-ink": "#2c3b49",
  "--n-accent": "#6f8aa3",
} as React.CSSProperties;

export default function Muhr({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1700);
  };

  // Фото: 1 — арка (фото пары клиента или кольца), 2–3 — маленькие кружки в программе / фото клиента
  const photos = shots(data, [
    { kind: "unsplash", slot: "muhr-rings", w: 760, h: 1000 },
    { kind: "unsplash", slot: "muhr-hands", w: 300, h: 300 },
    { kind: "unsplash", slot: "muhr-table", w: 300, h: 300 },
  ]);
  const extra = (data.photos ?? []).slice(1);
  const mono = [initial(data.groom), initial(data.bride)];
  const w = inv.main.when;
  const names = useFitWords<HTMLHeadingElement>(46);
  const [progRef, progSeen] = useSeen<HTMLOListElement>();
  const places = venues(inv);

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={naturalFonts}
      pageColor="#f3f4f2"
      backdropClassName="bg-[#e6eaed]"
      className={s.page}
      musicButtonClassName="bg-[#2c3b49] text-white"
      rsvpLook={{
        paper: "#ffffff",
        ink: "#2c3b49",
        line: "#b9c7d3",
        soft: "#e8eef3",
        accent: "#4f6b85",
        font: "var(--n-text)",
        radius: "4px",
      }}
      credits={creditsOf(photos)}
      creditClassName="text-[#2c3b49]/60"
      epilogue={
        <Reveal effect="fade">
          <footer className={s.sign}>
            <p className={s.signLead}>{t.hosts.respect}</p>
            <p className={s.signHosts}>{data.hosts}</p>
            <Script text={t.natural.wait} className={s.signScript} />
          </footer>
        </Reveal>
      }
    >
      <header className={s.hero}>
        <p className={s.kicker}>{t.occasionTitles[inv.occasion]}</p>
        <div className={s.heroArt}>
          <Photo
            src={photos[0].src}
            client={photos[0].client}
            shape="arch"
            ratio="3 / 4"
            eager
            className={s.arch}
          />
          <span className={s.heroMono} aria-hidden>
            {mono[0]}
            <i />
            {mono[1]}
          </span>
        </div>
        <h1 ref={names} className={s.names}>
          <span className={s.groom}>
            <Words text={data.groom ?? ""} />
          </span>
          <Script text={t.natural.and} className={s.and} />
          <span className={s.bride}>
            <Words text={data.bride ?? ""} />
          </span>
        </h1>
        <p className={s.heroDate}>
          {String(w.day).padStart(2, "0")}.
          {String(w.monthIndex + 1).padStart(2, "0")}.{w.year}
        </p>
      </header>

      <Reveal effect="fade">
        <section className={s.letter}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={localPhoto("eucalyptus").src}
            alt=""
            aria-hidden
            className={s.sprig}
            data-decor
          />
          {inv.text.greeting && (
            <h2 className={s.greeting}>{inv.text.greeting}</h2>
          )}
          <p className={s.body}>{inv.text.body}</p>
        </section>
      </Reveal>

      <section className={s.dateBlock}>
        <Script text={t.natural.date} className={s.bigScript} />
        <div className={s.dateRow}>
          <HandCalendar date={w} className={s.cal} />
          <p className={s.dateNote}>
            <span>{t.weekdays[w.weekdayIndex]}</span>
            <strong>{t.date.clock(inv.main.time)}</strong>
          </p>
        </div>
      </section>

      <section className={s.program}>
        <Script
          text={t.natural.program}
          className={`${s.bigScript} ${s.right}`}
        />
        <ol ref={progRef} className={s.steps}>
          {inv.program.map((e, i) => {
            const side = i % 2 === 0 ? "left" : "right";
            const pic = photos[1 + (i % 2)];
            return (
              <li key={i} data-event className={`${s.step} ${s[side]}`}>
                <Photo
                  src={pic.src}
                  client={pic.client}
                  shape="circle"
                  ratio="1 / 1"
                  className={s.stepPic}
                />
                <div className={s.stepText}>
                  <p className={s.time}>{t.date.clock(e.time)}</p>
                  <h3 className={s.stepTitle}>{e.title}</h3>
                  <p className={s.stepMeta}>
                    {t.date.long(e.when.day, e.when.monthIndex, e.when.year)}
                  </p>
                  <p className={s.stepMeta}>{e.venueName}</p>
                </div>
                {i < inv.program.length - 1 && (
                  <Squiggle
                    dir={side === "left" ? "right" : "left"}
                    seen={progSeen}
                    className={s.arrow}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className={s.place}>
        <SideTitle className={s.placeTitle}>{t.natural.place}</SideTitle>
        <div className={s.placeList}>
          {places.map((e, i) => (
            <Reveal key={i} effect="fade">
              <div className={s.venue}>
                <h3>{e.venueName}</h3>
                <p>{e.address}</p>
                <MapButton
                  href={e.mapHref}
                  className={s.map}
                  iconClassName="text-[#4f6b85]"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {inv.sides && (
        <section className={s.sides}>
          <div>
            <p>{t.sides.groom}</p>
            <h3>{inv.sides.groom}</h3>
          </div>
          <span aria-hidden />
          <div>
            <p>{t.sides.bride}</p>
            <h3>{inv.sides.bride}</h3>
          </div>
        </section>
      )}

      {extra.length > 0 && (
        <section className={`${s.gallery} ${extra.length === 1 ? s.one : ""}`}>
          {extra.map((src, i) => (
            <Photo
              key={src}
              src={src}
              client
              shape={i === 0 ? "round" : "arch"}
              ratio={i === 0 ? "4 / 5" : "3 / 4"}
              className={s.galleryPic}
            />
          ))}
        </section>
      )}

      <section className={s.count}>
        <Script text={t.natural.come} className={s.bigScript} />
        <p className={s.countLead}>{t.countdown.title[inv.occasion]}</p>
        <Countdown
          startsAt={w.startsAt}
          look={{
            grid: s.countGrid,
            box: s.countBox,
            number: s.countNum,
            label: s.countLabel,
            today: s.countToday,
          }}
        />
      </section>

      {!inv.opened && (
        <button
          type="button"
          data-open
          data-started={inv.started}
          onClick={open}
          disabled={inv.started}
          aria-label={t.natural.playHint}
          className={s.opening}
        >
          <span className={s.envelope}>
            <span className={s.card}>
              <span className={s.cardNames}>
                {data.groom}
                <br />
                <Script text={t.natural.and} className={s.cardAnd} />
                <br />
                {data.bride}
              </span>
            </span>
            <span className={s.pocket} />
            <span className={s.flap} />
            <span className={s.seal} aria-hidden>
              <svg viewBox="0 0 100 100" className={s.wax}>
                {/* Сургуч: толща воска темнее к краю (объём, без блика) */}
                <defs>
                  <radialGradient id="muhr-wax" cx="42%" cy="38%" r="65%">
                    <stop offset="0" stopColor="#4d6a87" />
                    <stop offset=".7" stopColor="#3b5672" />
                    <stop offset="1" stopColor="#2c4259" />
                  </radialGradient>
                </defs>
                <path d="M50 3c7 0 10 4 16 5s11 0 15 5 2 10 5 15 8 9 8 16-5 10-6 16 1 11-3 16-10 5-15 8-9 8-16 8-10-5-16-6-11 1-16-3-5-10-8-15-8-9-8-16 5-10 6-16-1-11 3-16 10-5 15-8 9-8 16-8z" />
                <circle cx="50" cy="50" r="33" className={s.waxRing} />
              </svg>
              <span className={s.sealMono}>
                {mono[0]}
                <i />
                {mono[1]}
              </span>
            </span>
          </span>
          <Script text={t.natural.open} className={s.openWord} />
        </button>
      )}
    </InvitationShell>
  );
}
