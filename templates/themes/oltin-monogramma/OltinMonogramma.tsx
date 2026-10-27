"use client";

import {Words,useFitWords} from "../../blocks/FitWords";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { t } from "@/texts/uz-cyrl";
import type { TemplateProps } from "../types";
import { useInvitation, type InvitationEventView } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Reveal } from "../../blocks/Reveal";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Petals } from "../../blocks/Petals";
import { Envelope } from "./Envelope";
import { Divider, EmbossedPaper, GoldDefs, RingsIcon, SunriseIcon, Wreath } from "./decor";
import { melody } from "./melody";
import { PAPER, PEARL, fontClasses, vars } from "./style";

/**
 * №1 «Олтин монограмма» — никоҳ тўйи, Анимацияли.
 * Самый дорогой и нежный: слоновая кость, жемчуг, золотая монограмма в венке.
 */
export default function OltinMonogramma({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const initials: [string, string] = [data.groom?.charAt(0) ?? "", data.bride?.charAt(0) ?? ""];
  const { main } = inv;
  const groomFamily=useFitWords<HTMLParagraphElement>(26),brideFamily=useFitWords<HTMLParagraphElement>(26);

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="bg-paper text-ink"
      backdropClassName="bg-[#EFE6D6]"
      pageColor={PAPER}
      musicButtonClassName="rounded-full bg-[#F8F3EA]/90 text-[#A87A28] shadow-[0_8px_24px_-8px_rgba(59,42,30,0.45)] ring-1 ring-[#B8892F]/60 backdrop-blur"
    >
      <GoldDefs />
      <Envelope inv={inv} initials={initials} />
      {inv.started && <Petals />}

      <div className="relative">
        <EmbossedPaper />
        <Cover inv={inv} initials={initials} />

        <main className="relative px-6 pb-24">
          {/* Текст приглашения */}
          <Section>
            <Reveal>
              {inv.text.greeting && (
                <p className="font-display text-[30px] leading-tight font-semibold italic">{inv.text.greeting}</p>
              )}
              <p className="mt-5 text-[17px] leading-[1.8] text-ink/85">{inv.text.body}</p>
            </Reveal>
          </Section>

          {/* Тўй санаси */}
          <Section title={t.date.title[inv.occasion]}>
            <Reveal effect="spotlight">
              <DateRow event={main} />
            </Reveal>
          </Section>

          {/* Календарь */}
          <Reveal effect="fade">
            <Card className="mt-2 px-4 pt-6 pb-4">
              <Calendar
                date={main.when}
                marker="heart"
                markerClassName="[&_path]:[fill:url(#om-gold)] drop-shadow-[0_3px_4px_rgba(168,122,40,0.35)]"
                markedDayClassName="text-white"
                weekendClassName="text-[#A87A28]"
              />
            </Card>
          </Reveal>

          {/* Таймер */}
          <Section title={t.countdown.title[inv.occasion]}>
            <Reveal>
              <Countdown
                startsAt={main.when.startsAt}
                look={{
                  grid: "grid grid-cols-4 gap-2.5",
                  box: "flex flex-col items-center rounded-2xl bg-white/70 px-1 pt-4 pb-3 shadow-[0_10px_28px_-16px_rgba(59,42,30,0.45)] ring-1 ring-[#B8892F]/35",
                  number: "gold-text font-display text-[40px] font-semibold leading-none",
                  label: "mt-2 text-[12px] tracking-[0.14em] text-muted uppercase",
                  today: "gold-text font-display text-[34px] font-semibold",
                }}
              />
            </Reveal>
          </Section>

          {/* Тўй дастури: у каждого тадбира своё время, место и карта */}
          <Section title={t.venue.programTitle}>
            <div className="space-y-5">
              {inv.events.map((ev, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <EventCard event={ev} icon={ev.kind === "nahorgi" ? SunriseIcon : RingsIcon} />
                </Reveal>
              ))}
            </div>
          </Section>

          {/* Чин юракдан */}
          <Section>
            <Reveal>
              <p className="text-[13px] tracking-[0.32em] text-[#A87A28] uppercase">{t.heart.title}</p>
              <p className="mt-4 font-display text-[23px] leading-[1.5] text-ink/90 italic">
                {t.heart.text[inv.occasion]}
              </p>
            </Reveal>
          </Section>

          {/* Хозяева */}
          <Reveal effect="spotlight">
            <div className="mt-14 text-center">
              <Divider />
              <p className="mt-8 font-display text-[40px] leading-none font-semibold">{t.hosts.waiting}</p>
              <p className="mt-6 text-[17px] text-muted italic">{t.hosts.respectDeep}:</p>
              {inv.sides ? <div className="mt-5 space-y-5 text-center [overflow-wrap:anywhere]"><div><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groomFamily} className="mt-2 w-full [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p></div><div><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={brideFamily} className="mt-2 w-full [--fit:26px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></div></div> : <p className="gold-text mt-2 font-display text-[34px] leading-tight font-semibold">{data.hosts}</p>}
              <MiniMonogram initials={initials} />
            </div>
          </Reveal>
        </main>
      </div>
    </InvitationShell>
  );
}

type Inv = ReturnType<typeof useInvitation>;

/** Первый экран: монограмма в венке, имена, дата */
function Cover({ inv, initials }: { inv: Inv; initials: [string, string] }) {
  const on = inv.opened;
  const { when } = inv.main;
  const show = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: { duration: 0.9, delay: on ? delay : 0, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <header className="relative flex min-h-svh flex-col items-center justify-center px-6 pt-[6svh] pb-24 text-center">
      <motion.p {...show(0.1)} className="text-[13px] tracking-[0.38em] text-[#A87A28] uppercase">
        {t.cover.inviteEyebrow}
      </motion.p>

      <div className="relative mt-[3svh] aspect-square w-[min(72vw,280px,38svh)]">
        <Wreath draw={on} className="absolute inset-0 h-full w-full" />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 1.1, delay: on ? 0.35 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="gold-text gold-shine font-display text-[clamp(64px,min(25vw,13svh),108px)] leading-none font-semibold">
            {initials[0]}
          </span>
          <span className="gold-text mx-2 font-display text-[40px] leading-none">·</span>
          <span className="gold-text gold-shine font-display text-[clamp(64px,min(25vw,13svh),108px)] leading-none font-semibold">
            {initials[1]}
          </span>
        </motion.div>
      </div>

      <motion.p {...show(0.7)} className="mt-[3svh] text-[15px] tracking-[0.32em] text-muted uppercase">
        {t.occasionTitles[inv.occasion]}
      </motion.p>

      <motion.h1 {...show(0.85)} className="mt-3 font-display leading-[0.95] font-medium">
        <span className="block text-[clamp(46px,min(15vw,8.4svh),62px)]">{inv.data.groom}</span>
        <span className="gold-text my-1 block text-[clamp(30px,5svh,38px)] italic">{t.cover.and}</span>
        <span className="block text-[clamp(46px,min(15vw,8.4svh),62px)]">{inv.data.bride}</span>
      </motion.h1>

      <motion.div {...show(1.05)} className="mt-[4svh] flex items-center gap-4">
        <span className="gold-fill h-px w-10" />
        <span className="text-[18px] tracking-[0.28em] lining-nums tabular-nums">
          {t.date.short(when.day, when.monthIndex, when.year).replaceAll(".", " · ")}
        </span>
        <span className="gold-fill h-px w-10" />
      </motion.div>

      <motion.div
        aria-hidden
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={on ? { opacity: 0.7, y: [0, 6, 0] } : { opacity: 0 }}
        transition={{ opacity: { delay: 1.6 }, y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="url(#om-gold)" strokeWidth="1.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.div>
    </header>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="pt-16 text-center">
      {title && (
        <Reveal effect="fade">
          <h2 className="mb-7 font-display text-[38px] leading-tight font-semibold italic">{title}</h2>
        </Reveal>
      )}
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[26px] ring-1 ring-[#B8892F]/30 shadow-[0_18px_40px_-24px_rgba(59,42,30,0.5)] ${className}`}
      style={{ background: `linear-gradient(180deg, #FFFDF8 0%, ${PEARL} 140%)` }}
    >
      {children}
    </div>
  );
}

/** «Тўй санаси»: день недели · крупное число · месяц · время · год */
function DateRow({ event }: { event: InvitationEventView }) {
  const { when } = event;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <p className="border-y border-[#B8892F]/40 py-3 font-display text-[21px] italic">{t.weekdays[when.weekdayIndex]}</p>
      <div className="px-1">
        <p className="text-[14px] tracking-[0.3em] text-[#A87A28] uppercase">{t.months[when.monthIndex]}</p>
        <p className="gold-text font-display text-[88px] leading-[0.95] font-semibold lining-nums tabular-nums">{when.day}</p>
        <p className="font-display text-[24px] font-semibold lining-nums tabular-nums text-ink">{event.time}</p>
      </div>
      <p className="border-y border-[#B8892F]/40 py-3 font-display text-[21px] lining-nums tabular-nums">
        {when.year} <span className="text-[16px] italic">{t.date.year}</span>
      </p>
    </div>
  );
}

function EventCard({
  event,
  icon: Icon,
}: {
  event: InvitationEventView;
  icon: (p: { className?: string }) => ReactNode;
}) {
  const { when } = event;
  return (
    <Card className="px-6 pt-7 pb-7">
      <Icon className="mx-auto h-11 w-11" />
      <h3 className="mt-3 font-display text-[30px] leading-tight font-semibold">{event.title}</h3>
      <p className="mt-2 text-[16px] text-muted">
        {when.day} {t.months[when.monthIndex]}, {t.weekdays[when.weekdayIndex]}
      </p>
      <p className="gold-text mt-1 font-display text-[46px] leading-none font-semibold lining-nums tabular-nums">{event.time}</p>
      <div className="mx-auto my-5 h-px w-24 gold-fill opacity-70" />
      <p className="font-display text-[24px] leading-snug font-semibold">{event.venueName}</p>
      <p className="mt-1 text-[16px] text-muted">{event.address}</p>
      <MapButton
        href={event.mapHref}
        className="gold-fill mt-6 rounded-full px-7 py-3.5 text-[16px] text-[#3B2A1E] shadow-[0_10px_24px_-10px_rgba(168,122,40,0.8)]"
        iconClassName="text-[#3B2A1E]"
      />
    </Card>
  );
}

function MiniMonogram({ initials }: { initials: [string, string] }) {
  return (
    <div className="mx-auto mt-12 flex h-16 w-16 items-center justify-center rounded-full ring-1 ring-[#B8892F]/50">
      <span className="gold-text font-display text-[24px] font-semibold">
        {initials[0]}·{initials[1]}
      </span>
    </div>
  );
}
