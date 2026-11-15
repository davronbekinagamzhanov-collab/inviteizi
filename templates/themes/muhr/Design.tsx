"use client";
/**
 * «Муҳр» — никоҳ, Анимацияли. Пыльно-голубая бумага, фотографический сургуч с оливковыми ветвями.
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
  SideTitle,
  Squiggle,
  tidy,
  useSeen,
} from "../natural/kit";
import { venues } from "../natural/common";
import { weddingShots } from "../nikoh-envelope/photos";
import { WeddingOpening } from "../nikoh-envelope/Opening";
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
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1750);
  };

  // Три свадебных кадра; клиентские URL имеют приоритет в каждом месте.
  const photos = weddingShots(data,"muhr");
  const extra = (data.photos ?? []).slice(1);
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
      musicVariant="soft"
      brandVariant="soft"
      musicButtonClassName="bg-[#f3f4f2]/75 text-[#2c3b49] ring-[#2c3b49]/20"
      rsvpLook={{
        paper: "#ffffff",
        ink: "#2c3b49",
        line: "#b9c7d3",
        soft: "#e8eef3",
        accent: "#4f6b85",
        font: "var(--n-text)",
        radius: "18px",
        buttonRadius: "999px",
      }}
      credits={[]}
      creditClassName="text-[#2c3b49]/60"
      epilogue={
        <Rise>
          <footer className={s.sign}>
            <p className={s.signLead}>{t.hosts.respect}</p>
            <p className={s.signHosts}>{data.hosts}</p>
            <Script text={t.natural.wait} className={s.signScript} />
          </footer>
        </Rise>
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

      <Rise stagger className={s.letter}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={localPhoto("eucalyptus").src}
            alt=""
            aria-hidden
            className={s.sprig}
            data-decor
          />
          {inv.text.greeting && (
            <h2 className={s.greeting}>{tidy(inv.text.greeting)}</h2>
          )}
          <p className={s.body}>{tidy(inv.text.body)}</p>
      </Rise>

      <Divider className={s.divider} />

      <section className={s.dateBlock}>
        <Rosette className={s.rosette} petals={12} />
        <Script text={t.natural.date} className={s.bigScript} />
        <div className={s.dateRow}>
          <HandCalendar date={w} className={s.cal} />
          <Medallion className={s.medal}>
            <span className={s.medalDay}>{t.weekdays[w.weekdayIndex]}</span>
            <strong className={s.medalTime}>{t.date.clock(inv.main.time)}</strong>
          </Medallion>
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
            <Rise key={i}>
              <div className={s.venue}>
                <h3>{e.venueName}</h3>
                <p>{e.address}</p>
                <MapButton
                  href={e.mapHref}
                  className={s.map}
                  iconClassName="text-[#4f6b85]"
                />
              </div>
            </Rise>
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

      {!inv.opened && <WeddingOpening kind="muhr" data={data} date={t.date.short(w.day,w.monthIndex,w.year)} started={inv.started} onOpen={open}/>}

    </InvitationShell>
  );
}
