"use client";
import localFont from "next/font/local";

import type { TemplateProps } from "../types";
import { designVars } from "../types";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { Reveal } from "../../blocks/Reveal";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { designTexts } from "@/texts/uz-cyrl";

const display = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/google/vollkorn/Vollkorn[wght].woff2", weight: "400.0 900.0", style: "normal" },
    {
      path: "../../../assets/fonts/web/google/vollkorn/Vollkorn-Italic[wght].woff2",
      weight: "400.0 900.0",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--nm-display",
});
const body = localFont({
  preload: false,
  src: [{ path: "../../../assets/fonts/google/ptserif/PT_Serif-Web-Regular.woff2", weight: "400", style: "normal" }],
  display: "swap",
  variable: "--nm-body",
});
const vars = designVars(
  {
    primary: "#94683e",
    primaryDark: "#65492f",
    gold: "#b68b51",
    goldLight: "#e9d4a8",
    paper: "#fcf5e6",
    ink: "#564632",
    muted: "#8d795f",
    accent: "#b37f54",
  },
  { display: "var(--nm-display)", accent: "var(--nm-display)", body: "var(--nm-body)" },
);
const t = designTexts("non-muhr");

/** A chekich-inspired embossed sun seal, pressed into honey-coloured paper. No food imitation. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode),
    when = inv.main.when,
    reduced = useReducedMotion();
  const name = useFitWords<HTMLHeadingElement>(45),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 100 : 1500);
  };
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={`${display.variable} ${body.variable}`}
      backdropClassName="bg-[#e9dfc9]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <header className="px-7 pt-10 pb-8 text-center">
        <p className="text-[14px] tracking-[.18em] text-muted uppercase">{t.opening.invitation}</p>
        <div className="relative mx-auto mt-7 h-[240px] w-[240px]">
          <Seal className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-x-10 top-[60px]">
            <p className="font-display text-[50px] leading-none">{when.day}</p>
            <p className="mt-2 text-[17px]">{t.months[when.monthIndex]}</p>
            <p className="mt-1 text-[14px] text-muted">{when.year}</p>
          </div>
        </div>
        <p className="mt-6 font-display text-[36px]">{t.occasionTitles[inv.occasion]}</p>
        <h1 ref={name} className="mt-3 w-full font-display leading-tight [--fit:45px]">
          <span className="text-[length:var(--fit)]">
            <Words text={data.person ?? ""} />
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-[300px] text-[18px] leading-relaxed italic text-muted">{t.causeLine(data)}</p>
        <p className="mt-6 text-[20px]">
          {t.weekdays[when.weekdayIndex]} · {t.date.at(inv.main.time)}
        </p>
      </header>
      <main className="px-7 pb-16">
        <Reveal className="border-y border-gold/35 py-7 text-center">
          <h2 className="font-display text-[27px] italic">{inv.text.greeting}</h2>
          <p className="mt-4 text-[18px] leading-[1.9]">{inv.text.body}</p>
        </Reveal>
        <Reveal className="mx-auto mt-10 max-w-[310px] text-center">
          <p className="mb-5 font-display text-[28px]">{t.date.title[inv.occasion]}</p>
          <Calendar date={when} marker="circle" markerClassName="text-primary" markedDayClassName="text-paper" />
        </Reveal>
        <Reveal className="mt-9 text-center">
          <p className="text-[17px] text-muted">{t.countdown.title[inv.occasion]}</p>
          <Countdown
            startsAt={when.startsAt}
            look={{
              grid: "mt-5 grid grid-cols-4 gap-2",
              box: "flex min-w-0 flex-col items-center border-t border-gold/40 pt-3",
              number: "font-display text-[31px] text-primary",
              label: "text-[12px] whitespace-nowrap text-muted",
              today: "font-display text-[28px]",
            }}
          />
        </Reveal>
        <section className="mt-12">
          <Reveal>
            <h2 className="mb-4 text-center font-display text-[31px]">{t.venue.programTitle}</h2>
          </Reveal>
          {inv.program.map((e, i) => (
            <Reveal key={i} className="relative border-b border-gold/35 py-7 text-center">
              <div className="mx-auto mb-4 flex w-fit items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-gold/50" />
                <p className="font-display text-[29px]">{t.date.clock(e.time)}</p>
                <span aria-hidden className="h-px w-8 bg-gold/50" />
              </div>
              <h3 className="text-[20px]">{e.title}</h3>
              <p className="mt-2 text-[16px] text-muted">{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
              <p className="mt-4 text-[20px]">{e.venueName}</p>
              <p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
              <MapButton
                href={e.mapHref}
                className="mt-5 border border-gold/60 bg-[#f3e8d1] px-6 py-3 text-primary"
                iconClassName="text-primary"
              />
            </Reveal>
          ))}
        </section>
        <Reveal className="mt-10 text-center">
          <Seal className="mx-auto mb-6 h-16 w-16" />
          <p className="text-[18px] leading-[1.9] italic">{inv.blessing}</p>
          <p className="mt-8 text-[16px] text-muted">{t.hosts.respectDeep}</p>
          <p className="mt-3 font-display text-[29px] leading-snug">{data.hosts}</p>
          <p className="mt-4 text-[18px]">{t.hosts.waiting}</p>
        </Reveal>
      </main>
      {!inv.opened && (
        <button
          data-open
          type="button"
          onClick={open}
          disabled={inv.started}
          aria-label={t.opening.tapToOpen}
          className="absolute inset-x-0 top-0 z-40 h-svh min-h-[560px] overflow-hidden text-center"
        >
          <motion.div
            initial={false}
            animate={{ opacity: inv.started ? 0 : 1 }}
            transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 0.2 }}
            className="absolute inset-0 bg-[#f0e1c4]"
          />
          <motion.div
            initial={false}
            animate={{ rotate: inv.started ? 75 : 0, scale: inv.started ? 2.8 : 1, opacity: inv.started ? 0 : 1 }}
            transition={{ duration: reduced ? 0 : 1.35, ease: [0.3, 0, 0.25, 1] }}
            className="absolute inset-x-8 top-[16%] aspect-square rounded-full bg-paper shadow-[0_6px_35px_#76532b33]"
          >
            <Seal className="absolute inset-0 h-full w-full" />
            <motion.div
              animate={{ opacity: inv.started ? 0 : 1 }}
              transition={{ duration: 0.12 }}
              className="absolute inset-x-12 top-[34%]"
            >
              <p className="font-display text-[30px]">{t.occasionTitles[inv.occasion]}</p>
            </motion.div>
          </motion.div>
          <motion.p
            animate={{ opacity: inv.started ? 0 : 1 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-5 bottom-[14%] text-[17px]"
          >
            {t.opening.tapToOpen}
          </motion.p>
        </button>
      )}
    </InvitationShell>
  );
}
function Seal({ className }: { className: string }) {
  return (
    <svg aria-hidden data-decor viewBox="0 0 240 240" className={className} fill="none" stroke="#b68b51">
      <circle cx="120" cy="120" r="113" strokeOpacity=".6" />
      <circle cx="120" cy="120" r="101" strokeWidth=".7" />
      <circle cx="120" cy="120" r="77" strokeOpacity=".45" />
      {Array.from({ length: 32 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 11.25} 120 120)`}>
          <path d="M120 13v14M120 34q8 10 0 18q-8-8 0-18Z" strokeWidth=".8" />
          <circle cx="120" cy="61" r="1.1" fill="#b68b51" />
        </g>
      ))}
      <circle cx="120" cy="120" r="70" strokeDasharray="1 5" />
    </svg>
  );
}
