"use client";

import { motion } from "motion/react";
import { t } from "@/texts/uz-cyrl";
import { useInvitation } from "@/templates/blocks/useInvitation";
import { InvitationShell } from "@/templates/blocks/InvitationShell";
import { Reveal } from "@/templates/blocks/Reveal";
import { Countdown } from "@/templates/blocks/Countdown";
import { Calendar } from "@/templates/blocks/Calendar";
import { MapButton } from "@/templates/blocks/MapButton";
import { designVars, type TemplateProps } from "../types";
import { ScrollOpening, SHEET_INSET } from "./ScrollOpening";
import {
  ArchFrame,
  BandDivider,
  Roll,
  Rod,
  SideBorders,
  SmallStar,
  StarMedallion,
  parchment,
  starrySky,
} from "./decor";
import { uramaFontVars } from "./fonts";
import { uramaPalettes, type UramaColor } from "./palettes";

/**
 * Премиум №4 «Ўрама»: свиток раскатывается сверху вниз → вся страница — длинный
 * пергамент с бордюром миниатюры. Имена в арке-михрабе, текст с буквицей,
 * таймер из звёзд-медальонов. Блоки «разворачиваются» сверху вниз.
 */
export default function Urama({ data, mode, color }: TemplateProps) {
  const inv = useInvitation(data, mode);
  const palette = uramaPalettes[color as UramaColor] ?? uramaPalettes.lojuvard;
  const { date } = inv;

  const appear = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: inv.started ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.9, delay: 2.5 + delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const label = "font-accent text-[15px] font-bold tracking-[0.25em] text-accent lowercase";
  const greeting = inv.inviteText.greeting;

  return (
    <InvitationShell
      inv={inv}
      className={uramaFontVars}
      style={{
        ...designVars(palette, {
          display: "var(--f-urama-display)",
          accent: "var(--f-urama-accent)",
          body: "var(--f-urama-body)",
        }),
        ...starrySky,
      }}
      musicButtonClassName="rounded-xl bg-primary text-gold-light shadow-lg ring-2 ring-gold"
    >
      {!inv.opened && (
        <ScrollOpening palette={palette} onOpenStart={inv.start} onOpened={inv.finishOpening} />
      )}

      <main className="relative mx-auto max-w-[480px] pb-6">
        <Rod />
        <div className={`relative ${SHEET_INSET} text-ink`} style={parchment}>
          <SideBorders colors={palette} />

          <div className="px-9">
            {/* 1. Обложка: имена в арке */}
            <section className="flex min-h-[calc(100svh-28px)] flex-col items-center justify-center py-10 text-center">
              <motion.div className="w-full" {...appear(0)}>
                <ArchFrame>
                  <p className={label}>{t.cover.eyebrow}</p>
                  <h1 className="mt-6 font-display text-primary">
                    <span className="block text-[3.2rem] leading-[1.05]">{data.groom}</span>
                    <span className="my-2 flex items-center justify-center gap-3 text-gold">
                      <span className="h-px w-8 bg-gold" />
                      <span className="font-display text-3xl text-accent">{t.cover.and}</span>
                      <span className="h-px w-8 bg-gold" />
                    </span>
                    <span className="block text-[3.2rem] leading-[1.05]">{data.bride}</span>
                  </h1>
                  <SmallStar className="mx-auto mt-7 h-4 w-4 text-gold" />
                </ArchFrame>
              </motion.div>

              {/* дата на ленте-картуше */}
              <motion.div className="relative mt-6" {...appear(0.4)}>
                <svg viewBox="0 0 280 52" className="h-[52px] w-[280px]" aria-hidden>
                  <path d="M0 8h24v36H0l10-18z M280 8h-24v36h24l-10-18z" fill="var(--c-accent)" opacity="0.85" />
                  <rect x="18" y="2" width="244" height="48" rx="3" fill="var(--c-primary)" />
                  <rect x="23" y="7" width="234" height="38" rx="2" fill="none" stroke="var(--c-gold)" strokeWidth="1" />
                </svg>
                <p className="absolute inset-0 flex items-center justify-center font-display text-xl text-gold-light">
                  {t.date.long(date.day, date.monthIndex, date.year)}
                </p>
              </motion.div>

              <motion.p className="mt-10 font-body text-sm text-muted" {...appear(0.8)}>
                {t.cover.scrollHint} ↓
              </motion.p>
            </section>
          </div>

          <BandDivider colors={palette} className="mx-4" />

          {/* 2. Текст с буквицей, выровнен по левому краю — как в рукописи */}
          <section className="px-9 py-12 text-left">
            <Reveal effect="unroll">
              <p className="text-center font-display text-[1.9rem] leading-tight text-primary">{greeting}</p>
              <p className="mt-6 font-body text-[1.12rem] leading-[1.8]">
                <span className="float-left mt-1 mr-2 font-display text-[3.6rem] leading-[0.85] text-accent">
                  {inv.inviteText.body(data.groom, data.bride).charAt(0)}
                </span>
                {inv.inviteText.body(data.groom, data.bride).slice(1)}
              </p>
            </Reveal>
          </section>

          {/* 3. Таймер из звёзд-медальонов */}
          <section className="px-7 pb-12 text-center">
            <Reveal effect="unroll">
              <p className={label}>{t.countdown.title}</p>
              <div className="mt-6">
                <Countdown
                  startsAt={date.startsAt}
                  look={{
                    grid: "grid grid-cols-4 gap-1",
                    today: "font-display text-3xl text-primary",
                    renderUnit: (u) => <StarMedallion value={u.value} label={u.label} />,
                  }}
                />
              </div>
            </Reveal>
          </section>

          <BandDivider colors={palette} className="mx-4" />

          {/* 4. Дата и календарь */}
          <section className="px-9 py-12 text-center">
            <Reveal effect="unroll">
              <p className={label}>{t.date.title}</p>
              <p className="mt-3 font-display text-[1.7rem] text-primary capitalize">
                {t.date.monthYear(date.monthIndex, date.year)}
              </p>
              <p className="mt-1 mb-6 font-body text-base">
                {t.date.dayAndTime(date.weekdayIndex, date.time)}
              </p>
              <Calendar
                date={date}
                showMonthTitle={false}
                marker="star"
                markerClassName="text-accent"
                markedDayClassName="text-paper"
                weekendClassName="text-accent/80"
              />
            </Reveal>
          </section>

          {/* 5. Тойхона — в двойной лазуритовой рамке со звёздами */}
          <section className="px-8 pb-12 text-center">
            <Reveal effect="unroll">
              <div className="relative border-[3px] border-double border-primary px-5 py-9">
                {["-top-2.5 -left-2.5", "-top-2.5 -right-2.5", "-bottom-2.5 -left-2.5", "-right-2.5 -bottom-2.5"].map((pos) => (
                  <SmallStar key={pos} className={`absolute h-5 w-5 text-gold ${pos}`} />
                ))}
                <p className={label}>{t.venue.title}</p>
                <p className="mt-4 font-display text-[1.8rem] leading-tight text-primary">{data.venueName}</p>
                <p className="mt-2 mb-7 font-body text-base text-muted">{data.address}</p>
                <MapButton
                  href={inv.mapHref}
                  className="rounded-lg bg-primary px-6 py-3 font-accent tracking-wider text-gold-light ring-2 ring-gold/70 ring-offset-2 ring-offset-[var(--c-paper)]"
                  iconClassName="text-gold"
                />
              </div>
            </Reveal>
          </section>

          <BandDivider colors={palette} className="mx-4" />

          {/* 6. Хозяева */}
          <section className="px-9 pt-12 pb-12 text-center">
            <Reveal effect="unroll">
              <p className={label}>{t.hosts.title}</p>
              <p className="mt-4 font-display text-[2.3rem] leading-tight text-primary">{data.hosts}</p>
              <div className="my-7 flex items-center justify-center gap-2 text-gold">
                <SmallStar className="h-3 w-3" />
                <SmallStar className="h-5 w-5 text-accent" />
                <SmallStar className="h-3 w-3" />
              </div>
              <p className="font-body text-xl">{t.hosts.closing}</p>
            </Reveal>
            <p className="mt-12 font-accent text-[11px] tracking-wider text-muted/80">{t.footer.madeWith}</p>
          </section>
        </div>
        {/* конец свитка */}
        <Roll className="-mt-1" />
      </main>
    </InvitationShell>
  );
}
