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
import { Curtain } from "./Curtain";
import { Fringe, ProgrammeFrame, StageDivider, Valance } from "./decor";
import { pardaFontVars } from "./fonts";
import { pardaPalettes, type PardaColor } from "./palettes";

/**
 * Премиум №2 «Парда»: бархатный занавес раздвигается → тёмная сцена в луче прожектора.
 * Имена по диагонали, дата-«билет», блоки в рамках театральной программки.
 */
export default function Parda({ data, mode, color }: TemplateProps) {
  const inv = useInvitation(data, mode);
  const palette = pardaPalettes[color as PardaColor] ?? pardaPalettes.qirmizi;
  const { date } = inv;

  // Обложка проявляется, пока полотна уходят в стороны
  const onStage = (delay: number, from: { x?: number; y?: number } = { y: 16 }) => ({
    initial: { opacity: 0, ...from },
    animate: inv.started ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...from },
    transition: { duration: 1, delay: 0.9 + delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const label = "font-accent text-[15px] tracking-[0.35em] text-gold uppercase";

  return (
    <InvitationShell
      inv={inv}
      className={`${pardaFontVars} bg-paper text-ink`}
      style={designVars(palette, {
        display: "var(--f-parda-display)",
        accent: "var(--f-parda-accent)",
        body: "var(--f-parda-body)",
      })}
      musicButtonClassName="rounded-full border border-gold bg-black/60 text-gold-light shadow-lg backdrop-blur"
    >
      {!inv.opened && (
        <Curtain initials={inv.initials} onOpenStart={inv.start} onOpened={inv.finishOpening} />
      )}

      <main className="relative mx-auto max-w-[480px] overflow-hidden bg-paper text-center">
        {/* 1. Сцена: луч прожектора, имена по диагонали */}
        <section
          className="relative flex min-h-svh flex-col justify-center px-7 pt-32 pb-24"
          style={{
            backgroundImage: [
              "radial-gradient(ellipse 55% 60% at 50% 18%, color-mix(in srgb, var(--c-gold-light) 22%, transparent), transparent 70%)",
              "linear-gradient(180deg, transparent 70%, color-mix(in srgb, var(--c-primary) 35%, transparent))",
            ].join(","),
          }}
        >
          <Valance className="absolute inset-x-0 top-0 h-24" />
          {/* боковые подхваты занавеса */}
          <div className="absolute top-20 bottom-0 left-0 w-5 opacity-90" style={{ background: "linear-gradient(90deg, var(--c-primary-dark), transparent)" }} />
          <div className="absolute top-20 right-0 bottom-0 w-5 opacity-90" style={{ background: "linear-gradient(270deg, var(--c-primary-dark), transparent)" }} />

          <motion.p className={label} {...onStage(0)}>
            {t.cover.eyebrow}
          </motion.p>

          <h1 className="mt-10 font-display">
            <motion.span
              className="block text-left text-[3.6rem] leading-none text-ink"
              {...onStage(0.2, { x: -30 })}
            >
              {data.groom}
            </motion.span>
            <motion.span
              className="gold-text my-3 block font-display text-[3rem] leading-none"
              {...onStage(0.4, { y: 0 })}
            >
              {t.cover.and}
            </motion.span>
            <motion.span
              className="block text-right text-[3.6rem] leading-none text-ink"
              {...onStage(0.6, { x: 30 })}
            >
              {data.bride}
            </motion.span>
          </h1>

          {/* Дата — «театральный билет» */}
          <motion.div
            className="mx-auto mt-12 grid w-full max-w-[300px] grid-cols-[1fr_auto_1fr_auto_1fr] items-center border-y border-gold/70 py-3 font-display text-gold-light"
            {...onStage(0.9)}
          >
            <span className="text-3xl">{String(date.day).padStart(2, "0")}</span>
            <span className="h-8 w-px bg-gold/50" />
            <span className="font-accent text-lg tracking-[0.2em] uppercase">
              {t.months[date.monthIndex]}
            </span>
            <span className="h-8 w-px bg-gold/50" />
            <span className="text-3xl">{date.year}</span>
          </motion.div>

          <motion.p
            className="mt-14 font-accent text-xs tracking-[0.3em] text-muted uppercase"
            {...onStage(1.3)}
          >
            {t.cover.scrollHint}
          </motion.p>
        </section>

        <Fringe className="h-5 w-full" />

        {/* 2. Текст приглашения */}
        <section className="px-6 py-16">
          <Reveal effect="spotlight">
            <span className="block font-display text-7xl leading-none text-gold/70">“</span>
            <p className="-mt-4 font-display text-3xl text-gold-light">{inv.inviteText.greeting}</p>
            <p className="mt-6 text-[1.15rem] leading-[1.85] text-ink/90 italic">
              {inv.inviteText.body(data.groom, data.bride)}
            </p>
            <StageDivider className="mx-auto mt-10 w-48 text-gold" />
          </Reveal>
        </section>

        {/* 3. Таймер — цифры в ряд, разделены золотыми линиями */}
        <section className="px-6 pb-16">
          <Reveal effect="spotlight">
            <p className={label}>{t.countdown.title}</p>
            <div className="mt-8">
              <Countdown
                startsAt={date.startsAt}
                look={{
                  grid: "grid grid-cols-4 divide-x divide-gold/40",
                  box: "flex flex-col items-center",
                  number: "font-display text-[2.6rem] leading-none text-gold-light",
                  label: "mt-3 font-accent text-[12px] tracking-[0.2em] text-muted uppercase",
                  today: "font-display text-3xl text-gold-light",
                }}
              />
            </div>
          </Reveal>
        </section>

        {/* 4. Дата и календарь — в рамке программки */}
        <section className="px-5 pb-14">
          <Reveal effect="spotlight">
            <ProgrammeFrame>
              <p className={label}>{t.date.title}</p>
              <p className="mt-4 font-display text-[1.7rem] text-ink">
                {t.date.long(date.day, date.monthIndex, date.year)}
              </p>
              <p className="mt-1 mb-7 font-accent text-lg tracking-wider text-gold-light">
                {t.date.dayAndTime(date.weekdayIndex, date.time)}
              </p>
              <Calendar
                date={date}
                showMonthTitle={false}
                marker="circle"
                markerClassName="text-gold"
                markedDayClassName="text-paper"
                weekendClassName="text-gold/90"
              />
            </ProgrammeFrame>
          </Reveal>
        </section>

        {/* 5. Тойхона */}
        <section className="px-5 pb-14">
          <Reveal effect="spotlight">
            <ProgrammeFrame>
              <p className={label}>{t.venue.title}</p>
              <p className="mt-5 font-display text-[1.9rem] leading-tight text-ink">{data.venueName}</p>
              <p className="mt-3 mb-8 text-[15px] text-muted">{data.address}</p>
              <MapButton
                href={inv.mapHref}
                className="border border-gold bg-gold/10 px-7 py-3.5 font-accent tracking-[0.15em] text-gold-light uppercase"
                iconClassName="text-gold"
              />
            </ProgrammeFrame>
          </Reveal>
        </section>

        {/* 6. Хозяева */}
        <section className="px-6 pt-4 pb-10">
          <Reveal effect="spotlight">
            <p className={label}>{t.hosts.title}</p>
            <p className="gold-text mt-4 font-display text-[2.4rem] leading-tight">{data.hosts}</p>
            <StageDivider className="mx-auto my-8 w-48 text-gold" />
            <p className="text-xl text-ink/90 italic">{t.hosts.closing}</p>
          </Reveal>
          <p className="mt-14 font-accent text-[11px] tracking-[0.2em] text-muted/70">{t.footer.madeWith}</p>
        </section>

        {/* Занавес внизу сцены */}
        <div className="relative h-16" style={{ background: "var(--c-primary)" }}>
          <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.4) 0 14px, rgba(255,255,255,0.08) 22px, rgba(0,0,0,0.4) 44px)" }} />
          <Fringe className="absolute inset-x-0 top-0 h-5 rotate-180" />
        </div>
      </main>
    </InvitationShell>
  );
}
