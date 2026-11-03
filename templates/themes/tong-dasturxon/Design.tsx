"use client";
/**
 * «Тонгги дастурхон» — наҳорги ош, Варақланадиган (без экрана открытия). Тёплая бумага, один цвет — тёмный гранат.
 * Спокойно и уважительно: настоящий плов во весь экран с рваным краем, огромное утреннее время, без лишнего.
 * Порядок: плов → «эрталаб» + время → повод и имя → приветствие → «Сана» → программа →
 * «Манзил» → нон и чай (или фото клиента) → хозяева → таймер → ответы → подпись.
 */
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
import { melody } from "./melody";
import s from "./tong.module.css";

const vars = {
  ...designVars({
    primary: "#7a3b2e",
    primaryDark: "#3a2a22",
    gold: "#7a3b2e",
    goldLight: "#efe1d0",
    paper: "#f5ede1",
    ink: "#3a2a22",
    muted: "#7a6657",
  }),
  "--n-paper": "#f5ede1",
  "--n-ink": "#3a2a22",
  "--n-accent": "#7a3b2e",
} as React.CSSProperties;

export default function TongDasturxon({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  // Плов — всегда настоящий плов (это суть наҳорги ош); фото клиента встают вместо нона и чая
  const plov = stock({
    kind: "unsplash",
    slot: "dastur-plov-top",
    w: 860,
    h: 860,
  });
  const photos = shots(data, [
    { kind: "local", slot: "dastur-non" },
    { kind: "unsplash", slot: "dastur-tea-warm", w: 560, h: 700 },
  ]);
  const w = inv.main.when;
  const morning = inv.program[0] ?? inv.main;
  const name = useFitWords<HTMLHeadingElement>(50);
  const places = venues(inv);

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={naturalFonts}
      pageColor="#f5ede1"
      backdropClassName="bg-[#e9dfd0]"
      className={s.page}
      musicVariant="soft"
      brandVariant="soft"
      musicButtonClassName="bg-[#f5ede1]/70 text-[#7a3b2e] ring-[#7a3b2e]/25"
      rsvpLook={{
        paper: "#fbf6ee",
        ink: "#3a2a22",
        line: "#d9c7b2",
        soft: "#efe1d0",
        accent: "#7a3b2e",
        font: "var(--n-text)",
        radius: "16px",
        buttonRadius: "999px",
      }}
      credits={creditsOf([plov, ...photos])}
      creditClassName="text-[#3a2a22]/60"
      epilogue={
        <Rise>
          <footer className={s.sign}>
            <p className={s.signLead}>{t.hosts.respectDeep}</p>
            <Script text={t.natural.wait} className={s.signScript} />
          </footer>
        </Rise>
      }
    >
      <header className={s.hero}>
        <Photo
          src={plov.src}
          shape="torn"
          ratio="1 / 1"
          eager
          position="50% 50%"
          className={s.plov}
        />
        <div className={s.timeBlock}>
          <p className={s.bigTime}>{t.date.clock(morning.time)}</p>
          <Script text={t.natural.morning} className={s.morning} />
        </div>
      </header>

      <section className={s.who}>
        <p className={s.cause}>{t.causeLine(data)}</p>
        <h1 ref={name} className={s.name}>
          <Words text={data.person ?? ""} />
        </h1>
        <p className={s.title}>{t.occasionTitles[inv.occasion]}</p>
      </section>

      <Rise stagger className={s.letter}>
        {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
        <p>{tidy(inv.text.body)}</p>
      </Rise>

      <Script text={t.natural.date} className={`${s.script} ${s.dateTitle}`} />
      <section className={s.date}>
        <Medallion className={s.medal}>
          <span className={s.weekday}>{t.weekdays[w.weekdayIndex]}</span>
          <strong className={s.dayNum}>{w.day}</strong>
        </Medallion>
        <HandCalendar date={w} className={s.cal} />
      </section>

      {inv.program.length > 1 && (
        <section className={s.program}>
          <Script
            text={t.natural.program}
            className={`${s.script} ${s.right}`}
          />
          <ol className={s.rows}>
            {inv.program.map((e, i) => (
              <li key={i} data-event className={s.row}>
                <span className={s.rowTime}>{t.date.clock(e.time)}</span>
                <span className={s.rowText}>
                  <strong>{e.title}</strong>
                  <span>
                    {t.date.long(e.when.day, e.when.monthIndex, e.when.year)}
                  </span>
                  <span>{e.venueName}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={s.place}>
        <Script text={t.natural.place} className={s.script} />
        {places.map((e, i) => (
          <Rise key={i}>
            <div className={s.venue}>
              <h3>{e.venueName}</h3>
              <p>{e.address}</p>
              <MapButton
                href={e.mapHref}
                className={s.map}
                iconClassName="text-[#7a3b2e]"
              />
            </div>
          </Rise>
        ))}
      </section>

      <section className={s.pair}>
        <Photo
          src={photos[0].src}
          client={photos[0].client}
          shape="tornTop"
          ratio="4 / 5"
          className={s.non}
        />
        <Photo
          src={photos[1].src}
          client={photos[1].client}
          shape="circle"
          ratio="1 / 1"
          className={s.tea}
        />
      </section>

      <Divider className={s.divider} />

      <section className={s.hosts}>
        <Rosette className={s.hostsRosette} />
        <p className={s.hostsLabel}>{t.natural.sides}</p>
        <p className={s.hostsName}>{data.hosts}</p>
      </section>

      <section className={s.count}>
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
    </InvitationShell>
  );
}
