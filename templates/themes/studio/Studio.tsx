"use client";
import localFont from "next/font/local";
import Image from "next/image";
import { memo, useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { TemplateProps } from "../types";
import { designVars } from "../types";
import { useInvitation, type Invitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { Words, useFitWords } from "../../blocks/FitWords";
import { designTexts } from "@/texts/uz-cyrl";
import { monogram } from "../premium/monogram";
import s from "./studio.module.css";
const serif = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/Lora-Regular.woff2", weight: "400 700" },
    { path: "../../../assets/fonts/web/Lora-Italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--studio-serif",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#6c604a",
    primaryDark: "#3f4439",
    gold: "#aa9164",
    goldLight: "#dfd1b6",
    paper: "#f8f4e9",
    ink: "#353c34",
    muted: "#6e7267",
  },
  { display: "var(--studio-serif)", accent: "var(--studio-serif)", body: "var(--studio-serif)" },
);
export type StudioId =
  | "ipak-romol"
  | "rishton-koshin"
  | "marvarid-satr"
  | "dutor-navosi"
  | "kumush-taroq"
  | "sunnat-muqova"
  | "sunnat-nasab"
  | "sahar-ipagi"
  | "sahar-maktubi"
  | "umr-sahifalari"
  | "ehtirom-kartasi";
const looks: Record<StudioId, string> = {
  "ipak-romol": "editorial",
  "rishton-koshin": "heritage",
  "marvarid-satr": "blossom",
  "dutor-navosi": "voices",
  "kumush-taroq": "ceremony",
  "sunnat-muqova": "sash",
  "sunnat-nasab": "lineage",
  "sahar-ipagi": "dawn",
  "sahar-maktubi": "morning",
  "umr-sahifalari": "chapters",
  "ehtirom-kartasi": "honour",
};
const scrolls = new Set<StudioId>(["dutor-navosi", "kumush-taroq", "sunnat-nasab", "umr-sahifalari"]);
function Photo({ src, className = "", lazy = false }: { src: string; className?: string; lazy?: boolean }) {
  return (
    <Image
      src={src}
      unoptimized
      width={1080}
      height={1600}
      alt=""
      aria-hidden="true"
      className={className}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
    />
  );
}
function Fitted({ text, max = 44, heading = false }: { text?: string; max?: number; heading?: boolean }) {
  const ref = useFitWords<HTMLDivElement>(max);
  return (
    <div ref={ref} className={s.fitted} role={heading ? "heading" : undefined} aria-level={heading ? 1 : undefined}>
      <span style={{ fontSize: `var(--fit,${max}px)` }}>
        <Words text={text ?? ""} />
      </span>
    </div>
  );
}
function Names({ inv }: { inv: Invitation }) {
  const d = inv.data,
    t = designTexts("studio");
  return (
    <div className={s.names}>
      {d.occasion === "nikoh" ? (
        <>
          <Fitted text={d.groom} max={50} heading />
          <span className={s.and}>{t.cover.andWord}</span>
          <Fitted text={d.bride} max={50} heading />
        </>
      ) : (
        <Fitted text={d.person} max={d.occasion === "nahorgi" ? 30 : 46} heading />
      )}
    </div>
  );
}
function Seal({ inv }: { inv: Invitation }) {
  return (
    <div className={s.monogram} aria-hidden="true">
      {monogram(inv.data.groom, inv.data.bride)}
    </div>
  );
}
function Geometry() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={s.geometry}
      fill="none"
      stroke="currentColor"
      strokeWidth=".7"
    >
      <path d="M50 4 62 27 88 12 73 38 96 50 73 62 88 88 62 73 50 96 38 73 12 88 27 62 4 50 27 38 12 12 38 27Z" />
      <path d="m50 20 30 30-30 30-30-30Z" />
      <circle cx="50" cy="50" r="15" />
    </svg>
  );
}
function DateLine({ inv }: { inv: Invitation }) {
  const t = designTexts("studio"),
    w = inv.main.when;
  return (
    <p className={s.date}>
      {t.date.long(w.day, w.monthIndex, w.year)}
      <span>
        {t.weekdays[w.weekdayIndex]} · {t.date.at(inv.main.time)}
      </span>
    </p>
  );
}
function DatePlate({ inv }: { inv: Invitation }) {
  const t = designTexts("studio"),
    w = inv.main.when;
  return (
    <div className={s.datePlate}>
      <span>{String(w.day).padStart(2, "0")}</span>
      <div>
        {t.months[w.monthIndex]}
        <br />
        {w.year}
        <p>{t.date.at(inv.main.time)}</p>
      </div>
    </div>
  );
}
function Greeting({ inv }: { inv: Invitation }) {
  return (
    <section className={s.greeting}>
      <h2>{inv.text.greeting}</h2>
      <p>{inv.text.body}</p>
    </section>
  );
}
function Families({ inv }: { inv: Invitation }) {
  const t = designTexts("studio");
  return inv.sides ? (
    <section className={s.families}>
      {(["groom", "bride"] as const).map((side) =>
        inv.sides?.[side] ? (
          <div key={side}>
            <p className={s.label}>{t.sides[side]}</p>
            <Fitted text={inv.sides[side]} max={23} />
          </div>
        ) : null,
      )}
    </section>
  ) : null;
}
function Program({ inv }: { inv: Invitation }) {
  const t = designTexts("studio");
  return (
    <section className={s.program}>
      <h2>{t.venue.programTitle}</h2>
      {inv.program.map((e, i) => (
        <article data-event key={i} className={s.event}>
          <div className={s.eventRail}>
            <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <p>{t.date.clock(e.time)}</p>
          </div>
          <div className={s.eventCopy}>
            <h3>{e.title}</h3>
            <p className={s.eventDate}>{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
            <p className={s.venue}>{e.venueName}</p>
            <p>{e.address}</p>
            <MapButton href={e.mapHref} className={s.map} />
          </div>
        </article>
      ))}
    </section>
  );
}
function Timer({ inv }: { inv: Invitation }) {
  const t = designTexts("studio");
  return (
    <section className={s.timer}>
      <p>{t.countdown.title[inv.occasion]}</p>
      <Countdown
        startsAt={inv.main.when.startsAt}
        look={{ grid: s.countGrid, box: s.countBox, number: s.countNumber, label: s.countLabel, today: s.today }}
      />
    </section>
  );
}
function Closing({ inv }: { inv: Invitation }) {
  const t = designTexts("studio");
  return (
    <section className={s.closing}>
      <p className={s.blessing}>{inv.blessing}</p>
      <div className={s.rule} />
      <p className={s.label}>{t.hosts.respectDeep}</p>
      <Fitted text={inv.data.hosts} max={25} />
      <p className={s.waiting}>{t.hosts.waiting}</p>
    </section>
  );
}
function Chapter({ children, id }: { children: ReactNode; inv: Invitation; id: StudioId }) {
  return scrolls.has(id) ? (
    <Reveal effect={id === "kumush-taroq" ? "fade" : "rise"} className={s.chapter}>
      {children}
    </Reveal>
  ) : (
    <div className={s.chapter}>{children}</div>
  );
}
export function Studio({ data, mode, id }: TemplateProps & { id: StudioId }) {
  const animated = id === "sunnat-muqova" || id === "sahar-ipagi";
  const inv = useInvitation(data, mode, { opening: animated }),
    reduced = useReducedMotion(),
    timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeout.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timeout.current = setTimeout(inv.finishOpening, reduced ? 0 : 850);
  };
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={serif.variable}
      backdropClassName="bg-[#e8e3d9]"
      pageColor="#e8e3d9"
      className={`${s.page} ${s[looks[id]]}`}
    >
      <Layout inv={inv} id={id} />
      {animated && !inv.opened && (
        <button
          data-open
          data-started={inv.started}
          onClick={open}
          disabled={inv.started}
          aria-label={designTexts(id).opening.tapToOpen}
          className={s.opener}
        >
          <div className={s.openingSheet}>
            {id === "sunnat-muqova" ? (
              <>
                <div className={s.sashBand} />
                <div className={s.sashSeal}>
                  <Geometry />
                </div>
                <div className={s.sashTitle}>
                  <p className={s.eyebrow}>{designTexts(id).opening.invitation}</p>
                  <Fitted text={data.person} max={32} />
                  <p>{designTexts(id).occasionTitles[data.occasion]}</p>
                  <DateLine inv={inv} />
                </div>
              </>
            ) : (
              <>
                <div className={s.dawnSun} />
                <div className={s.dawnVeil} />
                <div className={s.dawnTitle}>
                  <p className={s.eyebrow}>{designTexts(id).opening.invitation}</p>
                  <p className={s.openingOccasion}>{designTexts(id).occasionTitles[data.occasion]}</p>
                  <Fitted text={data.person} max={38} />
                  <DateLine inv={inv} />
                </div>
              </>
            )}
          </div>
          <p className={s.prompt}>
            {designTexts(id).opening.tapToOpen}
            <span aria-hidden="true">↓</span>
          </p>
        </button>
      )}
    </InvitationShell>
  );
}
const Layout = memo(
  function Layout({ inv, id }: { inv: Invitation; id: StudioId }) {
    const t = designTexts(id),
      d = inv.data,
      w = inv.main.when;
    const greeting = <Greeting inv={inv} />,
      family = <Families inv={inv} />,
      program = <Program inv={inv} />,
      timer = <Timer inv={inv} />,
      closing = <Closing inv={inv} />;
    const section = (node: ReactNode) => (
      <Chapter inv={inv} id={id}>
        {node}
      </Chapter>
    );
    switch (id) {
      case "ipak-romol":
        return (
          <main>
            <header className={s.editorialHero}>
              <p className={s.eyebrow}>{t.opening.invitation}</p>
              <div className={s.editorialColumns}>
                <div className={s.verticalDate}>
                  <span>{w.day}</span>
                  {t.months[w.monthIndex]}
                  <br />
                  {w.year}
                </div>
                <div>
                  <Names inv={inv} />
                  <p className={s.editorialTime}>{t.date.at(inv.main.time)}</p>
                </div>
              </div>
              <div className={s.silkSignature}>
                <Seal inv={inv} />
                <p>{t.occasionTitles[d.occasion]}</p>
              </div>
            </header>
            <div className={s.body}>
              {greeting}
              {family}
              {program}
              {timer}
              {closing}
            </div>
          </main>
        );
      case "rishton-koshin":
        return (
          <main className={s.heritagePage}>
            <header className={s.heritageHero}>
              <div className={s.heritageMast}>
                <Geometry />
                <p className={s.eyebrow}>{t.occasionTitles[d.occasion]}</p>
              </div>
              <Names inv={inv} />
              <div className={s.heritageDate}>
                <DatePlate inv={inv} />
              </div>
            </header>
            <div className={s.body}>
              {greeting}
              {timer}
              {program}
              {family}
              {closing}
            </div>
          </main>
        );
      case "marvarid-satr":
        return (
          <main>
            <header className={s.blossomHero}>
              <Photo src="/art/bodom-guli.webp" className={s.blossomPicture} />
              <div className={s.blossomHeading}>
                <p className={s.eyebrow}>{t.opening.invitation}</p>
                <Seal inv={inv} />
              </div>
              <div className={s.blossomNames}>
                <Names inv={inv} />
                <DateLine inv={inv} />
              </div>
            </header>
            <div className={s.body}>
              {greeting}
              {family}
              {timer}
              {program}
              {closing}
            </div>
          </main>
        );
      case "dutor-navosi":
        return (
          <main>
            <header className={s.voicesHero}>
              <p className={s.eyebrow}>{t.opening.invitation}</p>
              <div className={s.voicesNames}>
                <Names inv={inv} />
              </div>
              <div className={s.voicesPhoto}>
                <Photo src="/art/gulbog-sahifa.webp" />
                <DateLine inv={inv} />
              </div>
            </header>
            <div className={s.body}>
              {section(
                <>
                  <Seal inv={inv} />
                  {greeting}
                </>,
              )}
              {section(family)}
              {section(<DatePlate inv={inv} />)}
              {section(program)}
              {section(timer)}
              {section(closing)}
            </div>
          </main>
        );
      case "kumush-taroq":
        return (
          <main>
            <header className={s.ceremonyHero}>
              <p className={s.eyebrow}>{t.occasionTitles[d.occasion]}</p>
              <div className={s.ceremonyDate}>
                <span>{String(w.day).padStart(2, "0")}</span>
                <i />
                {String(w.monthIndex + 1).padStart(2, "0")}
                <small>{w.year}</small>
              </div>
              <Names inv={inv} />
              <p>{t.date.at(inv.main.time)}</p>
            </header>
            <div className={s.body}>
              {section(greeting)}
              {section(
                <>
                  <Seal inv={inv} />
                  {family}
                </>,
              )}
              {section(program)}
              {section(timer)}
              {section(closing)}
            </div>
          </main>
        );
      case "sunnat-muqova":
        return (
          <main>
            <header className={s.sashHero}>
              <div className={s.sashTop}>
                <p className={s.eyebrow}>{t.opening.invitation}</p>
                <Geometry />
              </div>
              <p className={s.occasion}>{t.occasionTitles[d.occasion]}</p>
              <Names inv={inv} />
              <div className={s.sashDate}>
                <DatePlate inv={inv} />
              </div>
              <Fitted text={d.hosts} max={20} />
            </header>
            <div className={s.body}>
              {greeting}
              {program}
              {timer}
              {closing}
            </div>
          </main>
        );
      case "sunnat-nasab":
        return (
          <main>
            <header className={s.lineageHero}>
              <p className={s.eyebrow}>{t.occasionTitles[d.occasion]}</p>
              <div className={s.lineageFrame}>
                <span className={s.lineageCorner} />
                <Names inv={inv} />
                <Fitted text={d.hosts} max={23} />
              </div>
              <DateLine inv={inv} />
            </header>
            <div className={s.body}>
              {section(greeting)}
              {section(program)}
              {section(timer)}
              {section(closing)}
            </div>
          </main>
        );
      case "sahar-ipagi":
        return (
          <main>
            <header className={s.dawnHero}>
              <div className={s.sunDisc} />
              <p className={s.eyebrow}>{t.opening.invitation}</p>
              <p className={s.dawnClock}>{t.date.clock(inv.main.time)}</p>
              <h1>{t.occasionTitles[d.occasion]}</h1>
              <Names inv={inv} />
              <DateLine inv={inv} />
            </header>
            <div className={s.body}>
              {greeting}
              {program}
              {timer}
              {closing}
            </div>
          </main>
        );
      case "sahar-maktubi":
        return (
          <main className={s.morningPage}>
            <header className={s.morningHero}>
              <div className={s.morningHead}>
                <p className={s.eyebrow}>{t.opening.invitation}</p>
                <p>{w.year}</p>
              </div>
              <div className={s.rule} />
              <h1>{t.occasionTitles[d.occasion]}</h1>
              <div className={s.morningTime}>
                <span>{t.date.clock(inv.main.time)}</span>
                <p>{t.date.long(w.day, w.monthIndex, w.year)}</p>
              </div>
              <Names inv={inv} />
            </header>
            <div className={s.body}>
              {greeting}
              {program}
              {timer}
              {closing}
            </div>
          </main>
        );
      case "umr-sahifalari":
        return (
          <main>
            <header className={s.chaptersHero}>
              <p className={s.eyebrow}>{t.occasionTitles[d.occasion]}</p>
              {d.age && (
                <div className={s.age}>
                  {d.age}
                  <span>{t.ageLabel}</span>
                </div>
              )}
              <Names inv={inv} />
              <DateLine inv={inv} />
              <div className={s.chapterSignature}>
                {w.year}
                <i />
              </div>
            </header>
            <div className={s.body}>
              {section(greeting)}
              {section(
                <>
                  <Photo src="/art/lola-ehtirom.webp" className={s.chaptersFlowers} lazy />
                  {program}
                </>,
              )}
              {section(timer)}
              {section(closing)}
            </div>
          </main>
        );
      case "ehtirom-kartasi":
        return (
          <main className={s.honourPage}>
            <header className={s.honourHero}>
              <div className={s.honourCorners} />
              <p className={s.eyebrow}>{t.opening.invitation}</p>
              <div className={s.honourDate}>
                {w.day}
                <span>
                  {t.months[w.monthIndex]}
                  <br />
                  {w.year}
                </span>
              </div>
              <Names inv={inv} />
              {d.age && (
                <p className={s.honourAge}>
                  {d.age} {t.ageLabel}
                </p>
              )}
              <p className={s.honourOccasion}>{t.occasionTitles[d.occasion]}</p>
              <p>{t.date.at(inv.main.time)}</p>
            </header>
            <div className={s.body}>
              {greeting}
              {program}
              {timer}
              {closing}
            </div>
          </main>
        );
    }
  },
  (a, b) => a.inv.data === b.inv.data && a.inv.mode === b.inv.mode && a.inv.lang === b.inv.lang && a.id === b.id,
);
