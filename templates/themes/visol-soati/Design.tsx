"use client";
import localFont from "next/font/local";
import { memo, useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import type { InvitationData } from "@/lib/types";
import { designVars, type TemplateProps } from "../types";
import { useInvitation, type Invitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { Calendar } from "../../blocks/Calendar";
import { designTexts } from "@/texts/uz-cyrl";
import styles from "./opening.module.css";
const font = localFont({
  preload: false,
  src: "../../../assets/fonts/web/PTSerif-Regular.woff2",
  variable: "--vs-font",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#6b603d",
    primaryDark: "#584d30",
    gold: "#af9863",
    goldLight: "#e5d7ad",
    paper: "#faf6e9",
    ink: "#504c3a",
    muted: "#6c6750",
  },
  { display: "var(--vs-font)", accent: "var(--vs-font)", body: "var(--vs-font)" },
);
const t = designTexts("visol-soati");
/** The hands of a brass dial set themselves to the submitted event time, then reveal the invitation. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode),
    reduced = useReducedMotion(),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1400);
  };
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#e0dcc8]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <Content data={data} inv={inv} />
      {!inv.opened && (
        <button
          data-open
          data-started={inv.started}
          type="button"
          disabled={inv.started}
          onClick={open}
          aria-label={t.opening.tapToOpen}
          className={styles.cover}
        >
          <div className={styles.paper} />
          <div className={styles.clock}>
            <Clock time={inv.main.time} opening />
          </div>
          <div className={styles.label}>
            <p className="text-[12px] uppercase tracking-[.2em]">{t.opening.invitation}</p>
            <p className="mt-5 text-[34px]">{t.occasionTitles[inv.occasion]}</p>
            <p className="mt-8 text-[17px]">{t.opening.tapToOpen}</p>
          </div>
        </button>
      )}
    </InvitationShell>
  );
}
const Content = memo(
  function Content({ data, inv }: { data: InvitationData; inv: Invitation }) {
    const names = useFitWords<HTMLHeadingElement>(45),
      hosts = useFitWords<HTMLParagraphElement>(25),
      groom = useFitWords<HTMLParagraphElement>(24),
      bride = useFitWords<HTMLParagraphElement>(24);
    return (
      <>
        <header className="px-7 pt-8 pb-10">
          <div className="grid grid-cols-[minmax(0,1fr)_105px] items-center gap-4">
            <div>
              <p className="text-[12px] uppercase tracking-[.15em] text-muted">{t.opening.invitation}</p>
              <p className="mt-4 text-[24px] leading-snug text-primary">{t.occasionTitles[inv.occasion]}</p>
            </div>
            <Clock time={inv.main.time} />
          </div>
          <h1 ref={names} className="mt-7 w-full leading-tight [--fit:45px]">
            <span className="block text-[length:var(--fit)]">
              <Words text={data.groom ?? ""} />
            </span>
            <span className="my-4 block text-[22px] text-primary">{t.cover.andWord}</span>
            <span className="block text-right text-[length:var(--fit)]">
              <Words text={data.bride ?? ""} />
            </span>
          </h1>
          <div className="mt-7 border-y border-gold/50 py-4">
            <p className="text-[19px] text-primary">
              {t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}
            </p>
            <p className="mt-2 text-[17px] text-muted">{t.date.at(inv.main.time)}</p>
          </div>
        </header>
        <main className="px-7 pb-24">
          <Reveal>
            <h2 className="text-[29px] leading-snug">{inv.text.greeting}</h2>
            <p className="mt-6 text-[20px] leading-[1.85]">{inv.text.body}</p>
          </Reveal>
          {inv.sides && (
            <section className="my-10 border-y border-gold/50 py-8">
              <p className="text-[14px] text-muted">{t.sides.groom}</p>
              <p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]">
                <span className="text-[length:var(--fit)]">
                  <Words text={inv.sides.groom ?? ""} />
                </span>
              </p>
              <div aria-hidden className="my-7 h-px w-12 bg-gold/60" />
              <p className="text-[14px] text-muted">{t.sides.bride}</p>
              <p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]">
                <span className="text-[length:var(--fit)]">
                  <Words text={inv.sides.bride ?? ""} />
                </span>
              </p>
            </section>
          )}
          <Reveal className="bg-[#eeead8] px-3 py-8">
            <p className="mb-6 text-[26px] text-primary">{t.date.title[inv.occasion]}</p>
            <Calendar
              date={inv.main.when}
              marker="circle"
              markerClassName="text-primary"
              markedDayClassName="text-paper"
            />
          </Reveal>
          <section className="pt-11">
            <h2 className="mb-8 text-[30px] text-primary">{t.venue.programTitle}</h2>
            {inv.program.map((e, i) => (
              <Reveal key={i} className="mb-9">
                <div data-event className="border-t border-gold/50 pt-6">
                  <p className="text-[14px] text-muted">
                    0{i + 1} · {t.date.long(e.when.day, e.when.monthIndex, e.when.year)}
                  </p>
                  <p className="mt-3 text-[37px] text-primary">{t.date.clock(e.time)}</p>
                  <h3 className="mt-3 text-[25px] leading-snug">{e.title}</h3>
                  <p className="mt-5 text-[22px] leading-snug">{e.venueName}</p>
                  <p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
                  <MapButton
                    href={e.mapHref}
                    className="mt-5 border-b border-primary/50 pb-2 text-primary"
                    iconClassName="text-primary"
                  />
                </div>
              </Reveal>
            ))}
          </section>
          <Reveal className="border-y border-gold/40 py-8">
            <p className="text-[23px] leading-[1.8]">{inv.blessing}</p>
            <p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p>
            <p ref={hosts} className="mt-3 w-full leading-snug [--fit:25px]">
              <span className="text-[length:var(--fit)]">
                <Words text={data.hosts} />
              </span>
            </p>
            <p className="mt-6 text-[18px] text-primary">{t.hosts.waiting}</p>
          </Reveal>
        </main>
      </>
    );
  },
  (a, b) => a.data === b.data && a.inv.mode === b.inv.mode && a.inv.lang === b.inv.lang,
);
const Clock = memo(function Clock({ time, opening = false }: { time: string; opening?: boolean }) {
  const [h, m] = time.split(":").map(Number),
    angles = { "--hour": `${(h % 12) * 30 + m * 0.5}deg`, "--minute": `${m * 6}deg` } as CSSProperties;
  return (
    <svg
      data-decor
      aria-hidden="true"
      viewBox="0 0 200 200"
      className={`w-full ${opening ? styles.dial : ""}`}
      style={angles}
      fill="none"
    >
      <circle cx="100" cy="100" r="94" fill="#eee3c3" stroke="#af9863" />
      <circle cx="100" cy="100" r="85" fill="#faf6e9" stroke="#c4b182" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M100 20V28" transform={`rotate(${i * 30} 100 100)`} stroke="#8c7a4f" strokeWidth="1.5" />
      ))}
      <g className={styles.hour}>
        <path d="M100 105V55" stroke="#71613d" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className={styles.minute}>
        <path d="M100 112V38" stroke="#af9863" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="5" fill="#af9863" />
      <path d="m91 141 9-10 9 10-9 10Z" stroke="#af9863" />
    </svg>
  );
});
