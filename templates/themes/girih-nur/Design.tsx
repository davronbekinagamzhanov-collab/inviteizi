"use client";
import localFont from "next/font/local";
import { memo, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { InvitationData } from "@/lib/types";
import { designVars, type TemplateProps } from "../types";
import { useInvitation, type Invitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { Reveal } from "../../blocks/Reveal";
import { MapButton } from "../../blocks/MapButton";
import { designTexts } from "@/texts/uz-cyrl";
import styles from "./opening.module.css";
const font = localFont({
  preload: false,
  src: "../../../assets/fonts/web/PTSerif-Regular.woff2",
  variable: "--gn-font",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#54746a",
    primaryDark: "#385449",
    gold: "#ae9767",
    goldLight: "#e5d6b6",
    paper: "#faf6e9",
    ink: "#424e43",
    muted: "#626e5d",
  },
  { display: "var(--gn-font)", accent: "var(--gn-font)", body: "var(--gn-font)" },
);
const t = designTexts("girih-nur");
/** An inlaid girih field contracts cell by cell; no hinges, ribbons or sliding cover panels. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode),
    reduced = useReducedMotion(),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1100);
  };
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#dce4d6]"
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
          <div className={styles.ground} />
          <div aria-hidden className={styles.field}>
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className={styles.tile}
                style={{ transitionDelay: `${((i % 3) + Math.floor(i / 3)) * 0.04}s` }}
              >
                <Girih />
              </div>
            ))}
          </div>
          <div className={styles.label}>
            <p className="text-[12px] tracking-[.2em] uppercase">{t.opening.invitation}</p>
            <p className="mt-5 text-[34px]">{t.occasionTitles[inv.occasion]}</p>
            <p className="mt-9 text-[17px]">{t.opening.tapToOpen}</p>
          </div>
        </button>
      )}
    </InvitationShell>
  );
}
const Content = memo(
  function Content({ data, inv }: { data: InvitationData; inv: Invitation }) {
    const names = useFitWords<HTMLHeadingElement>(44),
      hosts = useFitWords<HTMLParagraphElement>(26),
      groom = useFitWords<HTMLParagraphElement>(24),
      bride = useFitWords<HTMLParagraphElement>(24);
    return (
      <>
        <header className="px-7 pt-8 pb-10 text-center">
          <div className="mx-auto w-[180px]">
            <Girih />
          </div>
          <p className="mt-3 text-[12px] uppercase tracking-[.18em] text-muted">{t.opening.invitation}</p>
          <h1 ref={names} className="mt-7 w-full leading-tight [--fit:44px]">
            <span className="block text-[length:var(--fit)]">
              <Words text={data.groom ?? ""} />
            </span>
            <span className="my-4 block text-[22px] text-primary">{t.cover.andWord}</span>
            <span className="block text-[length:var(--fit)]">
              <Words text={data.bride ?? ""} />
            </span>
          </h1>
          <p className="mt-7 text-[19px] text-primary">
            {t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}
          </p>
        </header>
        <main className="px-6 pb-24">
          <Reveal className="border-double border-y-4 border-gold/40 py-8 text-center">
            <h2 className="text-[28px] leading-snug">{inv.text.greeting}</h2>
            <p className="mt-6 text-[19px] leading-[1.9]">{inv.text.body}</p>
          </Reveal>
          {inv.sides && (
            <section className="space-y-7 py-10">
              <div className="mr-5 border-l-[3px] border-primary/45 bg-[#edf0e0] p-5">
                <p className="text-[14px] text-muted">{t.sides.groom}</p>
                <p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]">
                  <span className="text-[length:var(--fit)]">
                    <Words text={inv.sides.groom ?? ""} />
                  </span>
                </p>
              </div>
              <div className="ml-5 border-r-[3px] border-primary/45 bg-[#edf0e0] p-5 text-right">
                <p className="text-[14px] text-muted">{t.sides.bride}</p>
                <p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]">
                  <span className="text-[length:var(--fit)]">
                    <Words text={inv.sides.bride ?? ""} />
                  </span>
                </p>
              </div>
            </section>
          )}
          <section className="pt-2">
            <h2 className="mb-8 text-center text-[30px] text-primary">{t.venue.programTitle}</h2>
            {inv.program.map((e, i) => (
              <Reveal key={i} className="mb-9">
                <div data-event className="border border-primary/25 px-5 py-6">
                  <div className="mb-5 flex items-center gap-4">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 rotate-45 items-center justify-center border border-gold"
                    >
                      <span className="-rotate-45 text-[14px]">{i + 1}</span>
                    </span>
                    <p className="text-[25px] text-primary">{t.date.clock(e.time)}</p>
                  </div>
                  <h3 className="text-[23px] leading-snug">{e.title}</h3>
                  <p className="mt-3 text-[15px] text-muted">
                    {t.date.long(e.when.day, e.when.monthIndex, e.when.year)}
                  </p>
                  <p className="mt-5 text-[21px] leading-snug">{e.venueName}</p>
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
          <Reveal className="pt-4 text-center">
            <p className="text-[22px] leading-[1.8]">{inv.blessing}</p>
            <p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p>
            <p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]">
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
const Girih = memo(function Girih() {
  return (
    <svg data-decor aria-hidden="true" viewBox="0 0 180 180" className="w-full" fill="none">
      <path
        d="m90 7 19 38 43-17-17 43 38 19-38 19 17 43-43-17-19 38-19-38-43 17 17-43L7 90l38-19-17-43 43 17Z"
        fill="#e9e1c8"
        stroke="#ae9767"
        strokeWidth="1"
      />
      <path d="m90 28 15 39 39 23-39 15-15 39-15-39-39-15 39-23Z" fill="#8aa394" fillOpacity=".6" stroke="#54746a" />
      <path d="m90 52 38 38-38 38-38-38Z" fill="#faf6e9" stroke="#ae9767" />
      <path
        d="M90 7V52M173 90H128M90 173V128M7 90H52M45 45l26 26M135 45l-26 26M135 135l-26-26M45 135l26-26"
        stroke="#ae9767"
        strokeWidth=".8"
      />
      <path d="m90 70 20 20-20 20-20-20Z" stroke="#54746a" />
      <circle cx="90" cy="90" r="4" fill="#ae9767" />
    </svg>
  );
});
