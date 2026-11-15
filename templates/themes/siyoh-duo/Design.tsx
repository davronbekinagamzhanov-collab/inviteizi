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
import { Calendar } from "../../blocks/Calendar";
import { designTexts } from "@/texts/uz-cyrl";
import styles from "./opening.module.css";
const font = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/Lora-Regular.woff2" },
    { path: "../../../assets/fonts/web/Lora-Italic.woff2", style: "italic" },
  ],
  variable: "--sd-font",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#78594e",
    primaryDark: "#5d4238",
    gold: "#b3976d",
    goldLight: "#e9d8bc",
    paper: "#fcf7ee",
    ink: "#56463e",
    muted: "#726353",
  },
  { display: "var(--sd-font)", accent: "var(--sd-font)", body: "var(--sd-font)" },
);
const t = designTexts("siyoh-duo");
/** A finite pen-drawn arabesque, then ink becoming translucent over the invitation. No moving shutters. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode),
    reduced = useReducedMotion(),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1450);
  };
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#e7dccc]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <Content data={data} inv={inv} />
      {!inv.opened && (
        <button
          data-open
          data-started={inv.started}
          type="button"
          onClick={open}
          disabled={inv.started}
          aria-label={t.opening.tapToOpen}
          className={styles.cover}
        >
          <div className={styles.paper} />
          <div className={styles.stroke}>
            <Flourish />
          </div>
          <div className={styles.words}>
            <p className="text-[12px] uppercase tracking-[.2em]">{t.opening.invitation}</p>
            <p className="mt-6 text-[36px] italic">{t.occasionTitles[inv.occasion]}</p>
            <p data-open-prompt className="mt-12 text-[17px]">{t.opening.tapToOpen}</p>
          </div>
        </button>
      )}
    </InvitationShell>
  );
}
const Content = memo(
  function Content({ data, inv }: { data: InvitationData; inv: Invitation }) {
    const names = useFitWords<HTMLHeadingElement>(48),
      hosts = useFitWords<HTMLParagraphElement>(26),
      groom = useFitWords<HTMLParagraphElement>(25),
      bride = useFitWords<HTMLParagraphElement>(25);
    return (
      <>
        <header className="px-7 pt-9 pb-10">
          <p className="text-[12px] tracking-[.2em] uppercase text-muted">{t.opening.invitation}</p>
          <div className="mt-5 h-[145px] overflow-hidden">
            <Flourish />
          </div>
          <h1 ref={names} className="mt-5 w-full border-l border-gold/60 pl-5 leading-[1.2] [--fit:48px]">
            <span className="block text-[length:var(--fit)] italic">
              <Words text={data.groom ?? ""} />
            </span>
            <span className="my-4 block text-[23px] text-muted">{t.cover.andWord}</span>
            <span className="block text-[length:var(--fit)] italic">
              <Words text={data.bride ?? ""} />
            </span>
          </h1>
          <p className="mt-8 text-right text-[18px] text-primary">
            {t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}
          </p>
        </header>
        <main className="px-7 pb-24">
          <Reveal className="border-y border-gold/40 py-9">
            <h2 className="text-[30px] italic leading-snug">{inv.text.greeting}</h2>
            <p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p>
          </Reveal>
          {inv.sides && (
            <section className="py-10">
              <p className="text-[14px] text-muted">{t.sides.groom}</p>
              <p ref={groom} className="mt-3 w-full leading-snug [--fit:25px]">
                <span className="text-[length:var(--fit)]">
                  <Words text={inv.sides.groom ?? ""} />
                </span>
              </p>
              <div aria-hidden className="my-7 h-px w-16 bg-gold/60" />
              <p className="text-[14px] text-muted">{t.sides.bride}</p>
              <p ref={bride} className="mt-3 w-full leading-snug [--fit:25px]">
                <span className="text-[length:var(--fit)]">
                  <Words text={inv.sides.bride ?? ""} />
                </span>
              </p>
            </section>
          )}
          <Reveal className="border-y border-gold/40 py-8">
            <p className="mb-6 text-[26px] italic">{t.date.title[inv.occasion]}</p>
            <Calendar
              date={inv.main.when}
              marker="circle"
              markerClassName="text-primary"
              markedDayClassName="text-paper"
            />
          </Reveal>
          <section className="pt-11">
            <h2 className="mb-8 text-[31px] italic text-primary">{t.venue.programTitle}</h2>
            {inv.program.map((e, i) => (
              <Reveal key={i} className="mb-9">
                <div data-event className="border-b border-gold/40 pb-8">
                  <p className="text-[14px] text-muted">{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
                  <div className="mt-4 flex items-baseline gap-3">
                    <span aria-hidden className="text-[13px] text-muted">
                      {i + 1}.
                    </span>
                    <h3 className="text-[24px] leading-snug">{e.title}</h3>
                  </div>
                  <p className="mt-3 text-[33px] italic text-primary">{t.date.clock(e.time)}</p>
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
          <Reveal>
            <p className="text-[24px] italic leading-[1.8]">{inv.blessing}</p>
            <p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p>
            <p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]">
              <span className="text-[length:var(--fit)]">
                <Words text={data.hosts} />
              </span>
            </p>
            <p className="mt-5 text-[18px] text-primary">{t.hosts.waiting}</p>
          </Reveal>
        </main>
      </>
    );
  },
  (a, b) => a.data === b.data && a.inv.mode === b.inv.mode && a.inv.lang === b.inv.lang,
);
const Flourish = memo(function Flourish() {
  return (
    <svg
      data-decor
      aria-hidden="true"
      viewBox="0 0 320 160"
      className="w-full"
      fill="none"
      stroke="#a38760"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path
        pathLength="1"
        d="M12 105C60 151 121 70 100 36C88 15 62 57 96 76C140 101 185 17 201 29C217 41 172 122 145 112C124 104 169 79 219 83C257 87 278 62 300 30M40 128Q86 151 137 124M203 96Q266 122 308 81"
      />
      <path
        pathLength="1"
        d="M86 63Q49 47 45 24Q76 28 86 63ZM117 92q-29 30-44 14q18-19 44-14ZM225 83q-10-35 13-47q12 25-13 47ZM261 84q27-20 39-4q-14 18-39 4Z"
      />
      <path pathLength="1" d="M23 95q1-26 24-25M248 111q16 25 38 9" stroke="#78594e" />
    </svg>
  );
});
