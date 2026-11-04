"use client";
/**
 * «Ипак» — никоҳ, Анимацияли. Первый экран — живой шёлк (видео без звука) и кнопка ▶.
 * Дальше бежевая журнальная вёрстка: имена разворотом, фото в скруглённых рамках со смещением,
 * тонкие цифры таймера, каждое событие — своя «страница» с крупным временем.
 * Порядок: шёлк → имена → фото → приветствие → таймер → тадбирлар → «Сана» → «Манзил» → семьи → ответы → подпись.
 */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { designVars, type TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Words, useFitWords } from "../../blocks/FitWords";
import { t } from "@/texts/uz-cyrl";
import { naturalFonts } from "../natural/fonts";
import {
  Divider,
  HandCalendar,
  Medallion,
  Photo,
  Rise,
  Rosette,
  Script,
  tidy,
} from "../natural/kit";
import { creditsOf, shots, stock, venues } from "../natural/common";
import { localCredit, localPhoto } from "../natural/photos";
import { melody } from "./melody";
import s from "./ipak.module.css";

const vars = {
  ...designVars({
    primary: "#8c7764",
    primaryDark: "#3b322b",
    gold: "#8c7764",
    goldLight: "#e9e0d4",
    paper: "#efe8de",
    ink: "#3b322b",
    muted: "#7a6d62",
  }),
  "--n-paper": "#efe8de",
  "--n-ink": "#3b322b",
  "--n-accent": "#8c7764",
} as React.CSSProperties;

export default function Ipak({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1100);
  };

  const photos = shots(data, [
    { kind: "unsplash", slot: "x-earrings", w: 760, h: 1000 },
    { kind: "unsplash", slot: "ipak-bouquet", w: 520, h: 650 },
    { kind: "unsplash", slot: "ipak-hands", w: 400, h: 400 },
  ]);
  const silk = stock({
    kind: "unsplash",
    slot: "ipak-silk",
    w: 860,
    h: 640,
  });
  const video = localPhoto("ipak-silk-video");
  const [videoOn, setVideoOn] = useState(false);
  const w = inv.main.when;
  const groom = useFitWords<HTMLSpanElement>(54);
  const bride = useFitWords<HTMLSpanElement>(54);
  const places = venues(inv);

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={naturalFonts}
      pageColor="#efe8de"
      backdropClassName="bg-[#e4dbcf]"
      className={s.page}
      musicVariant="soft"
      brandVariant="soft"
      musicButtonClassName="bg-[#efe8de]/70 text-[#3b322b] ring-[#3b322b]/20"
      rsvpLook={{
        paper: "#f8f4ee",
        ink: "#3b322b",
        line: "#cdbfae",
        soft: "#e9e0d4",
        accent: "#3b322b",
        font: "var(--n-text)",
        radius: "26px",
        buttonRadius: "999px",
      }}
      credits={[
        ...creditsOf([...photos, silk]),
        localCredit("ipak-silk-video"),
      ]}
      creditClassName="text-[#3b322b]/60"
      epilogue={
        <Rise>
          <footer className={s.sign}>
            {photos[2].client && (
              <Photo
                src={photos[2].src}
                client
                shape="circle"
                ratio="1 / 1"
                className={s.signPhoto}
              />
            )}
            <Script text={t.natural.come} className={s.signScript} />
            <p className={s.signLead}>{t.hosts.respectDeep}</p>
            <p className={s.signHosts}>{data.hosts}</p>
          </footer>
        </Rise>
      }
    >
      <header className={s.spread}>
        <p className={s.vertical} aria-hidden>
          {t.date.long(w.day, w.monthIndex, w.year)}
        </p>
        <h1 className={s.names}>
          <span ref={groom} className={s.nameLine}>
            <Words text={data.groom ?? ""} />
          </span>
          <span className={s.brideRow}>
            <Script text={t.natural.and} className={s.and} />
            <span ref={bride} className={s.nameLine}>
              <Words text={data.bride ?? ""} />
            </span>
          </span>
        </h1>
        <p className={s.occasion}>{t.occasionTitles[inv.occasion]}</p>
      </header>

      <section className={s.photos}>
        <Photo
          src={photos[0].src}
          client={photos[0].client}
          shape="corner"
          ratio="3 / 4"
          eager
          className={s.photoBig}
        />
        <Photo
          src={photos[1].src}
          client={photos[1].client}
          shape="oval"
          ratio="3 / 4"
          className={s.photoSmall}
        />
        <Medallion className={s.medal}>
          <span className={s.medalDay}>{w.day}</span>
          <span className={s.medalMonth}>{t.date.monthYear(w.monthIndex, w.year).split(" ")[0]}</span>
        </Medallion>
      </section>

      <Rise stagger className={s.letter}>
        {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
        <p>{tidy(inv.text.body)}</p>
      </Rise>

      <section className={s.count}>
        <Rosette className={s.countRosette} petals={12} />
        <Script text={t.natural.wait} className={s.countScript} />
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

      <section className={s.events}>
        {inv.program.map((e, i) => (
          <Rise key={i} stagger className={`${s.event} ${i % 2 ? s.eventAlt : ""}`}>
            <p className={s.eventTime}>{t.date.clock(e.time)}</p>
            <div className={s.eventText}>
              <h3 data-event>{e.title}</h3>
              <p>{t.weekdays[e.when.weekdayIndex]}</p>
              <p>{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
              <p className={s.eventVenue}>{e.venueName}</p>
            </div>
          </Rise>
        ))}
        <Photo src={silk.src} shape="arch" ratio="4 / 5" className={s.silk} />
      </section>

      <Divider className={s.divider} />

      <section className={s.date}>
        <Script text={t.natural.date} className={s.sideScript} />
        <HandCalendar date={w} className={s.cal} />
      </section>

      <section className={s.place}>
        <Script
          text={t.natural.place}
          className={`${s.sideScript} ${s.right}`}
        />
        {places.map((e, i) => (
          <div key={i} className={s.venue}>
            <h3>{e.venueName}</h3>
            <p>{e.address}</p>
            <MapButton
              href={e.mapHref}
              className={s.map}
              iconClassName="text-[#efe8de]"
            />
          </div>
        ))}
      </section>

      {inv.sides && (
        <section className={s.sides}>
          <p>
            <span>{t.sides.groom}</span>
            {inv.sides.groom}
          </p>
          <p>
            <span>{t.sides.bride}</span>
            {inv.sides.bride}
          </p>
        </section>
      )}

      {!inv.opened && (
        <div className={s.opening} data-started={inv.started}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={video.poster} alt="" aria-hidden className={s.video} />
          <video
            className={`${s.video} ${s.videoFade} ${videoOn ? s.videoOn : ""}`}
            onPlaying={() => setVideoOn(true)}
            src={video.src}
            poster={video.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
          />
          <div className={s.veil} />
          <div className={s.openText}>
            <p className={s.openNames}>
              <span>{data.groom}</span>
              <Script text={t.natural.and} className={s.openAnd} />
              <span>{data.bride}</span>
            </p>
            <p className={s.openDate}>
              {t.date.long(w.day, w.monthIndex, w.year)}
            </p>
          </div>
          <button
            type="button"
            data-open
            onClick={open}
            disabled={inv.started}
            aria-label={t.natural.playHint}
            className={s.play}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
            </svg>
          </button>
          <Script text={t.natural.open} className={s.openWord} />
        </div>
      )}
    </InvitationShell>
  );
}
