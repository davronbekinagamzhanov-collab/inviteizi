"use client";
/**
 * «Боғ» — суннат, Варақланадиган (без экрана открытия). Светлый шалфей на белой бумаге, настоящая акварельная зелень (умеренно).
 * Праздничный, но не мультяшный: фото мальчика в круге (или тюльпаны), дальше спокойная вёрстка влево/вправо.
 * Порядок: «кем приходится» + имя → круг с фото → приветствие → «Сана» → тадбирлар с завитками →
 * «Манзил» → таймер → тюльпаны в рваной рамке → ответы → хозяева.
 */
import { designVars, type TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { Words, useFitWords } from "../../blocks/FitWords";
import { t } from "@/texts/uz-cyrl";
import { naturalFonts } from "../natural/fonts";
import { HandCalendar, Photo, Script, Squiggle, useSeen } from "../natural/kit";
import { creditsOf, shots, venues } from "../natural/common";
import { localCredit, localPhoto } from "../natural/photos";
import { melody } from "./melody";
import s from "./bog.module.css";

const vars = {
  ...designVars({
    primary: "#5f8270",
    primaryDark: "#2f3d36",
    gold: "#5f8270",
    goldLight: "#dfe8e1",
    paper: "#f6f7f3",
    ink: "#2f3d36",
    muted: "#66756c",
  }),
  "--n-paper": "#f6f7f3",
  "--n-ink": "#2f3d36",
  "--n-accent": "#5f8270",
} as React.CSSProperties;

export default function Bog({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  // 1 — круг (фото мальчика или тюльпаны), 2 — белые тюльпаны в рваной рамке
  const photos = shots(data, [
    { kind: "unsplash", slot: "bog-tulips", w: 640, h: 640 },
    { kind: "unsplash", slot: "bog-tulips-2", w: 860, h: 640 },
  ]);
  const extra = (data.photos ?? []).slice(2);
  const w = inv.main.when;
  const name = useFitWords<HTMLHeadingElement>(56);
  const [evRef, evSeen] = useSeen<HTMLOListElement>();
  const places = venues(inv);

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={naturalFonts}
      pageColor="#f6f7f3"
      backdropClassName="bg-[#e3e9e3]"
      className={s.page}
      musicButtonClassName="bg-[#2f3d36] text-white"
      rsvpLook={{
        paper: "#ffffff",
        ink: "#2f3d36",
        line: "#c4d3c8",
        soft: "#e6eee8",
        accent: "#5f8270",
        font: "var(--n-text)",
        radius: "14px",
      }}
      credits={[
        ...creditsOf(photos),
        localCredit("garland"),
        localCredit("sprig"),
      ]}
      creditClassName="text-[#2f3d36]/60"
      epilogue={
        <Reveal effect="fade">
          <footer className={s.sign}>
            <Script text={t.natural.wait} className={s.signScript} />
            <p className={s.signLead}>{t.hosts.respect}</p>
            <p className={s.signHosts}>{data.hosts}</p>
          </footer>
        </Reveal>
      }
    >
      <header className={s.hero}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={localPhoto("garland").src}
          alt=""
          aria-hidden
          className={s.garland}
          data-decor
        />
        <p className={s.relation}>
          {t.relationWord(data.relation ?? "ogil", data.person)}
        </p>
        <h1 ref={name} className={s.name}>
          <Words text={data.person ?? ""} />
        </h1>
        <p className={s.cause}>{t.occasionTitles[inv.occasion]}</p>
        <div className={s.circleWrap}>
          <Photo
            src={photos[0].src}
            client={photos[0].client}
            shape="circle"
            ratio="1 / 1"
            eager
            className={s.circle}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={localPhoto("sprig").src}
            alt=""
            aria-hidden
            className={s.sprig}
            data-decor
          />
        </div>
      </header>

      <Reveal effect="fade">
        <section className={s.letter}>
          {inv.text.greeting && <h2>{inv.text.greeting}</h2>}
          <p>{inv.text.body}</p>
        </section>
      </Reveal>

      <section className={s.date}>
        <div className={s.dateHead}>
          <Script text={t.natural.date} className={s.script} />
          <p className={s.dateBig}>
            <strong>{w.day}</strong>
            <span>{t.weekdays[w.weekdayIndex]}</span>
          </p>
        </div>
        <HandCalendar date={w} className={s.cal} />
      </section>

      <section className={s.events}>
        <Script text={t.natural.program} className={`${s.script} ${s.right}`} />
        <ol ref={evRef} className={s.steps}>
          {inv.program.map((e, i) => (
            <li key={i} data-event className={s.step}>
              <p className={s.time}>{t.date.clock(e.time)}</p>
              <h3>{e.title}</h3>
              <p className={s.meta}>
                {t.date.long(e.when.day, e.when.monthIndex, e.when.year)}
              </p>
              <p className={s.meta}>{e.venueName}</p>
              {i < inv.program.length - 1 && (
                <Squiggle dir="down" seen={evSeen} className={s.arrow} />
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className={s.place}>
        <Script text={t.natural.place} className={s.script} />
        {places.map((e, i) => (
          <Reveal key={i} effect="fade">
            <div className={s.venue}>
              <h3>{e.venueName}</h3>
              <p>{e.address}</p>
              <MapButton
                href={e.mapHref}
                className={s.map}
                iconClassName="text-white"
              />
            </div>
          </Reveal>
        ))}
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

      <section className={s.table}>
        <Photo
          src={photos[1].src}
          client={photos[1].client}
          shape="torn"
          ratio="4 / 3"
        />
      </section>

      {extra.length > 0 && (
        <section className={s.extra}>
          <Photo src={extra[0]} client shape="round" ratio="4 / 5" />
        </section>
      )}

    </InvitationShell>
  );
}
