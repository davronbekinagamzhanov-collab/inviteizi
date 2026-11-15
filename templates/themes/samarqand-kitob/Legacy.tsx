"use client";
import localFont from "next/font/local";

import type { TemplateProps } from "../types";
import { designVars } from "../types";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { designTexts } from "@/texts/uz-cyrl";

const display = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/notoserif/NotoSerif[wdth,wght].woff2",
      weight: "100.0 900.0",
      style: "normal",
    },
    {
      path: "../../../assets/fonts/web/google/notoserif/NotoSerif-Italic[wdth,wght].woff2",
      weight: "100.0 900.0",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--sk-display",
});
const body = localFont({
  preload: false,
  src: [
    {
      path: "../../../assets/fonts/web/google/notosans/NotoSans[wdth,wght].woff2",
      weight: "100.0 900.0",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--sk-body",
});
const vars = designVars(
  {
    primary: "#466e72",
    primaryDark: "#315157",
    gold: "#b09966",
    goldLight: "#e5d6b3",
    paper: "#faf5e9",
    ink: "#3e4d4d",
    muted: "#7e8881",
    accent: "#b1bcb4",
  },
  { display: "var(--sk-display)", accent: "var(--sk-display)", body: "var(--sk-body)" },
);
const t = designTexts("samarqand-kitob");

/** A Samarkand keepsake album: a hinged cover, binding seam and a real panorama plate. */
export default function Design({ data, mode, art }: TemplateProps) {
  const inv = useInvitation(data, mode),
    when = inv.main.when,
    reduced = useReducedMotion(),
    names = useFitWords<HTMLHeadingElement>(40);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 100 : 2000);
  };
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={`${display.variable} ${body.variable}`}
      backdropClassName="bg-[#dce3dc]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <div className="relative border-l-[9px] border-[#6d8b83]/25 pl-2">
        <div aria-hidden className="absolute inset-y-0 left-1 w-px bg-primary/20" />
        <header className="px-7 pt-9 pb-8 text-center">
          <p className="text-[12px] tracking-[.15em] text-muted uppercase">{t.opening.invitation}</p>
          <div className="relative mt-6 h-[155px] overflow-hidden border border-gold/40">
            <PhotoBackdrop
              src={art ?? "/art/samarqand-kitob.webp"}
              fade="both"
              color="#faf5e9"
              position="50% 50%"
              opacity={0.83}
              strength={0.1}
              priority
            />
          </div>
          <p className="mt-6 text-[17px] text-primary">{t.occasionTitles[inv.occasion]}</p>
          <h1 ref={names} className="mt-5 w-full font-display font-normal leading-[1.18] [--fit:40px]">
            <span className="block text-[length:var(--fit)]">
              <Words text={data.groom ?? ""} />
            </span>
            <span className="my-3 block text-[24px] italic text-primary">{t.cover.andWord}</span>
            <span className="block text-[length:var(--fit)]">
              <Words text={data.bride ?? ""} />
            </span>
          </h1>
          <p className="mt-7 text-[18px]">{t.date.long(when.day, when.monthIndex, when.year)}</p>
          <p className="mt-3 text-[17px] text-muted">
            {t.weekdays[when.weekdayIndex]} · {t.date.at(inv.main.time)}
          </p>
        </header>
        <main className="px-7 pb-16">
          <Reveal className="border-y border-gold/30 py-6">
            <h2 className="font-display text-[24px] italic">{inv.text.greeting}</h2>
            <p className="mt-4 text-[18px] leading-[1.85]">{inv.text.body}</p>
          </Reveal>
          <section className="mt-10">
            <Reveal>
              <h2 className="mb-4 font-display text-[28px]">{t.venue.programTitle}</h2>
            </Reveal>
            {inv.program.map((e, i) => (
              <Reveal key={i} className="border-b border-primary/20 py-6">
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center border border-gold/50 text-[15px] text-muted">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-[24px]">{e.title}</h3>
                </div>
                <p className="mt-4 text-[17px] text-primary">
                  {t.date.long(e.when.day, e.when.monthIndex, e.when.year)}
                </p>
                <p className="mt-2 text-[20px]">{t.date.at(e.time)}</p>
                <p className="mt-4 text-[19px]">{e.venueName}</p>
                <p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
                <MapButton
                  href={e.mapHref}
                  className="mt-5 rounded-none border-b border-primary/50 pb-2 text-primary"
                  iconClassName="text-primary"
                />
              </Reveal>
            ))}
          </section>
          <Reveal className="mt-8 text-center">
            <p className="text-[17px] text-muted">{t.countdown.title[inv.occasion]}</p>
            <Countdown
              startsAt={when.startsAt}
              look={{
                grid: "mt-4 grid grid-cols-4",
                box: "flex min-w-0 flex-col items-center",
                number: "font-display text-[28px] text-primary",
                label: "mt-2 text-[12px] whitespace-nowrap text-muted",
                today: "font-display text-[27px]",
              }}
            />
          </Reveal>
          {inv.sides && (
            <Reveal className="mt-8 space-y-4 border-y border-gold/30 py-5 text-[17px]">
              <p>
                <span className="block text-muted">{t.sides.groom}</span>
                {inv.sides.groom}
              </p>
              <p>
                <span className="block text-muted">{t.sides.bride}</span>
                {inv.sides.bride}
              </p>
            </Reveal>
          )}
          <Reveal className="mt-10">
            <p className="font-display text-[23px] italic leading-relaxed">{inv.blessing}</p>
            <p className="mt-8 text-[16px] text-muted">{t.hosts.respectDeep}</p>
            <p className="mt-3 font-display text-[27px] leading-snug">{data.hosts}</p>
            <p className="mt-5 text-[17px]">{t.hosts.waiting}</p>
          </Reveal>
        </main>
      </div>
      {!inv.opened && (
        <button
          data-open
          type="button"
          onClick={open}
          disabled={inv.started}
          aria-label={t.opening.tapToOpen}
          className="absolute inset-x-0 top-0 z-40 h-svh min-h-[560px] overflow-hidden"
          style={{ perspective: 1400 }}
        >
          <motion.div
            animate={{ opacity: inv.started ? 0 : 1 }}
            transition={{ duration: reduced ? 0 : 0.7 }}
            className="absolute inset-0 bg-[#dfe6de]"
          />
          <motion.div
            initial={false}
            animate={{ rotateY: inv.started ? -155 : 0 }}
            transition={{ duration: reduced ? 0 : 1.8, ease: [0.35, 0, 0.2, 1] }}
            className="absolute inset-x-7 top-[12%] h-[76%] border-l-[12px] border-[#294c51] bg-[#517a79] p-5 text-[#f5e9c9] shadow-[8px_10px_15px_#23423d33]"
            style={{ transformOrigin: "left center", backfaceVisibility: "hidden" }}
          >
            <div className="flex h-full flex-col items-center justify-center border border-[#cbb77e] px-5 text-center">
              <Rosette />
              <p className="mt-8 text-[13px] tracking-[.12em] uppercase">{t.opening.invitation}</p>
              <p className="mt-6 font-display text-[33px]">{t.occasionTitles[inv.occasion]}</p>
              <div aria-hidden className="my-8 h-px w-12 bg-[#cbb77e]" />
              <p className="text-[17px]">{t.opening.tapToOpen}</p>
            </div>
          </motion.div>
        </button>
      )}
    </InvitationShell>
  );
}
function Rosette() {
  return (
    <svg
      aria-hidden
      data-decor
      viewBox="0 0 100 100"
      className="h-20 w-20"
      fill="none"
      stroke="#dfc98c"
      strokeWidth="1"
    >
      <path d="m50 3 11 19 22-5-5 22 19 11-19 11 5 22-22-5-11 19-11-19-22 5 5-22L3 50l19-11-5-22 22 5Z" />
      <circle cx="50" cy="50" r="22" />
      <path d="m50 19 31 31-31 31-31-31Z" />
      <circle cx="50" cy="50" r="9" />
    </svg>
  );
}
