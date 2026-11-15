"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("anor-bogi");
import type { TemplateProps } from "../types";
import { useInvitation, type Invitation, type InvitationEventView } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { Reveal } from "../../blocks/Reveal";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { CardOpening } from "./Opening";
import { FallingGarden } from "./FallingGarden";
import {
  AnorOutline,
  FruitNode,
  GardenDefs,
  HalfAnor,
  InlineSeed,
  PaperGrain,
  PowderHalo,
  SEED,
  Seed,
  SeedRow,
  BranchCrest,
  StemLeaves,
  goldInk,
} from "./decor";
import { melody } from "./melody";
import { GARNET, GARNET_DEEP, PAPER, fontClasses, vars } from "./style";

const ART = "/art/anor-bogi.webp";
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * №64 «Анор боғи» — никоҳ тўйи, Анимацияли.
 * Пудра, гранатовая ветвь на фото, тающая в пудру; половинка анора тонкой линией,
 * зёрна граната — разделители. Открытие — открытка-разворот.
 */
export default function Design({ data, mode, art }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const photo = art ?? ART;
  // первый экран начинает проявляться ещё под открыткой (когда она «приближается»)
  const [revealed, setRevealed] = useState(false);
  const show = revealed || inv.opened;

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="bg-paper text-ink"
      backdropClassName="bg-[#E9D5CE]"
      pageColor={PAPER}
      musicButtonClassName="rounded-full bg-[#FBF2EE]/90 text-[#9E2338] shadow-[0_10px_26px_-10px_rgba(110,22,38,0.55)] ring-1 ring-[#B4893A]/60 backdrop-blur"
    >
      <GardenDefs />
      <CardOpening inv={inv} art={photo} onReveal={() => setRevealed(true)} />
      {show && <FallingGarden />}

      <div className="relative overflow-hidden">
        <Hero inv={inv} photo={photo} show={show} />

        <main className="relative px-6 pb-4">
          {/* Текст приглашения */}
          <Section className="pt-6">
            <Reveal>
              {inv.text.greeting && (
                <p className="font-display text-[34px] leading-[1.15] italic" style={{ color: GARNET_DEEP }}>
                  {inv.text.greeting}
                </p>
              )}
              <p className="mx-auto mt-4 max-w-[340px] text-[19px] leading-[1.75] text-balance text-ink/90">
                {inv.text.body}
              </p>
            </Reveal>
          </Section>

          {/* Куёв томони / Келин томони */}
          {inv.sides && (
            <Section>
              <Reveal effect="fade">
                <Sides groom={inv.sides.groom} bride={inv.sides.bride} />
              </Reveal>
            </Section>
          )}

          {/* Тўй санаси: число внутри контура анора */}
          <Section title={t.date.title[inv.occasion]}>
            <Reveal effect="spotlight">
              <DateFruit event={inv.main} />
            </Reveal>
          </Section>

          {/* Календарь: день отмечен зерном граната */}
          <Reveal effect="fade">
            <div className="relative mt-12 pt-9 pb-2 text-center">
              <span aria-hidden className="gold-fill absolute top-0 left-6 right-6 h-px opacity-60" />
              <Seed className="absolute top-0 left-1/2 h-[16px] w-[13px] -translate-x-1/2 -translate-y-1/2" />
              <Calendar
                date={inv.main.when}
                marker="circle"
                markerClassName="[&_path]:[fill:url(#ab-seed)] drop-shadow-[0_4px_5px_rgba(110,22,38,0.35)]"
                markedDayClassName="text-white"
                weekendClassName="text-[#9E2338]"
              />
              <span aria-hidden className="gold-fill absolute bottom-0 left-6 right-6 h-px opacity-60" />
            </div>
          </Reveal>

          {/* Таймер: между числами — зёрна */}
          <Section title={t.countdown.title[inv.occasion]}>
            <Reveal>
              <Countdown
                startsAt={inv.main.when.startsAt}
                look={{
                  grid: "grid grid-cols-4",
                  today: "font-display text-[34px] leading-tight italic text-[#6E1626]",
                  renderUnit: (u) => (
                    <div className="relative flex flex-col items-center pt-1">
                      {u.key !== "days" && (
                        <Seed
                          className="absolute top-[22px] left-0 h-[11px] w-[9px] -translate-x-1/2"
                          rotate={u.key === "minutes" ? 0 : 18}
                        />
                      )}
                      <span
                        className="font-body text-[46px] leading-none font-medium lining-nums tabular-nums"
                        style={goldInk}
                      >
                        {u.value}
                      </span>
                      <span className="mt-2 text-[16px] text-muted italic">{u.label}</span>
                    </div>
                  ),
                }}
              />
            </Reveal>
          </Section>

          {/* Тўй дастури: тадбиры — плоды на одной гранатовой ветке */}
          <Section title={t.venue.programTitle}>
            <Program events={inv.program} />
          </Section>

          {/* Оқ фотиҳа */}
          <Section className="pt-16">
            <Reveal effect="spotlight">
              <Blessing text={inv.blessing} />
            </Reveal>
          </Section>
        </main>

        <Finale inv={inv} photo={photo} />
        <PaperGrain opacity={0.2} />
      </div>
    </InvitationShell>
  );
}

/** Первый экран: ветвь граната тает в пудру, половинка анора, имена пером, дата */
function Hero({ inv, photo, show }: { inv: Invitation; photo: string; show: boolean }) {
  const { when } = inv.main;
  const appear = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.9, delay: show ? delay : 0, ease: EASE },
  });

  return (
    <header className="relative flex min-h-svh flex-col items-center justify-end px-6 pb-[8svh] text-center">
      {/* фото медленно «дышит»: чуть приближается после открытия */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[64svh] origin-top"
        initial={{ scale: 1.08 }}
        animate={{ scale: show ? 1 : 1.08 }}
        transition={{ duration: 2.6, ease: EASE }}
      >
        <PhotoBackdrop src={photo} color={PAPER} fade="to-bottom" strength={0.62} position="30% 40%" priority />
      </motion.div>
      <PowderHalo className="bottom-[2svh] left-1/2 h-[66svh] w-[150%] -translate-x-1/2" />

      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <PowderHalo className="-inset-6" />
        <HalfAnor draw={show} delay={0.15} className="relative w-[min(30vw,118px,15svh)]" />
      </motion.div>

      <motion.p
        {...appear(0.5)}
        className="relative mt-[1.6svh] text-[19px] tracking-[0.04em] italic"
        style={{ color: GARNET }}
      >
        {t.occasionTitles[inv.occasion]}
      </motion.p>

      <motion.h1 {...appear(0.7)} className="relative mt-[1.2svh] font-display leading-[0.95] font-normal italic">
        <span className="block text-[clamp(44px,min(14vw,8svh),60px)] break-words">{inv.data.groom}</span>
        <span className="my-[0.4svh] block text-[clamp(28px,4.6svh,36px)] leading-none" style={goldInk}>
          {t.cover.and}
        </span>
        <span className="block text-[clamp(44px,min(14vw,8svh),60px)] break-words">{inv.data.bride}</span>
      </motion.h1>

      <motion.div {...appear(0.95)} className="relative mt-[2.4svh]">
        <SeedRow />
      </motion.div>

      <motion.p {...appear(1.1)} className="relative mt-[1.8svh] text-[19px] lining-nums tabular-nums">
        {t.weekdays[when.weekdayIndex]}
        <InlineSeed />
        {when.day} {t.months[when.monthIndex]} {when.year}
      </motion.p>

      <motion.div
        aria-hidden
        className="absolute bottom-3 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 0.75, y: [0, 6, 0] } : { opacity: 0 }}
        transition={{ opacity: { delay: 1.8 }, y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="url(#ab-gold)"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.div>
    </header>
  );
}

function Section({
  title,
  className = "pt-20",
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`text-center ${className}`}>
      {title && (
        <Reveal effect="fade">
          <h2 className="mb-6 font-display text-[38px] leading-[1.1] font-normal italic">{title}</h2>
        </Reveal>
      )}
      {children}
    </section>
  );
}

/** «Куёв томони · Келин томони»: две семьи, между ними — стебель с зёрнами */
function Sides({ groom, bride }: { groom?: string; bride?: string }) {
  const side = (label: string, name?: string) => (
    <div className="min-w-0">
      <p className="font-display text-[23px] leading-none whitespace-nowrap italic" style={{ color: GARNET }}>
        {label}
      </p>
      <p className="mt-3 text-[18px] leading-snug font-medium text-balance break-words">{name}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      {side(t.sides.groom, groom)}
      <svg aria-hidden viewBox="0 0 16 96" className="h-24 w-4">
        {/* стебель — прямоугольник: у линии нулевой ширины градиент не рисуется */}
        <rect x="7.5" y="2" width="1" height="92" fill="url(#ab-gold)" />
        <g transform="translate(8 30) scale(0.85)">
          <path d={SEED} fill="url(#ab-seed)" />
        </g>
        <g transform="translate(8 48) scale(1.1)">
          <path d={SEED} fill="url(#ab-seed)" />
        </g>
        <g transform="translate(8 66) scale(0.85)">
          <path d={SEED} fill="url(#ab-seed)" />
        </g>
      </svg>
      {side(t.sides.bride, bride)}
    </div>
  );
}

/** «Тўй санаси»: месяц, крупное число и время внутри тонкого контура плода */
function DateFruit({ event }: { event: InvitationEventView }) {
  const { when } = event;
  return (
    <div>
      <div className="relative mx-auto aspect-[120/124] w-[min(72vw,262px)]">
        <AnorOutline className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 top-[30%] bottom-[8%] flex flex-col items-center justify-center">
          <p className="text-[20px] italic" style={{ color: GARNET }}>
            {t.months[when.monthIndex]}
          </p>
          <p className="font-body text-[96px] leading-[0.9] font-medium lining-nums tabular-nums" style={goldInk}>
            {when.day}
          </p>
          <p className="mt-1 text-[21px] lining-nums tabular-nums">{t.date.at(t.date.clock(event.time))}</p>
        </div>
      </div>
      <p className="mt-5 text-[19px] lining-nums tabular-nums">
        {t.weekdays[when.weekdayIndex]}
        <InlineSeed />
        {when.year} {t.date.year}
      </p>
    </div>
  );
}

/** «Тўй дастури»: вертикальная гранатовая ветка, каждый тадбир — плод на ней */
function Program({ events }: { events: InvitationEventView[] }) {
  return (
    <ol className="relative mx-auto max-w-[350px] text-left">
      {/* стебель */}
      <span
        aria-hidden
        className="absolute top-6 bottom-16 left-[19px] w-px"
        style={{ background: "linear-gradient(180deg, #B4893A, #E2C27C 40%, #8E6A26 100%)" }}
      />
      {events.map((ev, i) => (
        <li key={i} className="relative pb-12 pl-[58px] last:pb-6">
          <Reveal delay={0.05}>
            <FruitNode className="absolute top-0 left-0 h-[44px] w-[40px] drop-shadow-[0_6px_8px_rgba(110,22,38,0.3)]" />
            {i < events.length - 1 && (
              <StemLeaves className="absolute top-[54%] -left-[1px] h-[60px] w-[40px] opacity-90" />
            )}
            <p className="font-body text-[42px] leading-none font-medium lining-nums tabular-nums" style={goldInk}>
              {t.date.clock(ev.time)}
            </p>
            <h3 className="mt-2 font-display text-[30px] leading-[1.1] font-normal italic">{ev.title}</h3>
            <p className="mt-1.5 text-[17px] text-muted">
              {ev.when.day} {t.months[ev.when.monthIndex]}, {t.weekdays[ev.when.weekdayIndex]}
            </p>
            {ev.kind === "nahorgi" && (
              <p className="text-[17px] italic" style={{ color: GARNET }}>
                {t.date.morningAt(ev.time)}
              </p>
            )}
            <p className="mt-4 text-[21px] leading-snug font-semibold break-words">{ev.venueName}</p>
            <p className="mt-0.5 text-[17px] leading-snug text-muted">{ev.address}</p>
            <MapButton
              href={ev.mapHref}
              className="mt-5 rounded-full bg-[#FBF2EE] px-6 py-3 text-[16px] text-[#6E1626] shadow-[0_10px_22px_-14px_rgba(110,22,38,0.6)] ring-1 ring-[#B4893A]/70"
              iconClassName="text-[#9E2338]"
            />
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

/** Оқ фотиҳа: тонкая двойная рамка, по диагонали — веточки граната с цветком */
function Blessing({ text }: { text: string }) {
  return (
    <div className="relative mx-1 px-7 pt-14 pb-10">
      <span aria-hidden className="absolute inset-0 rounded-[28px] border border-[#B4893A]/60" />
      <span aria-hidden className="absolute inset-[6px] rounded-[23px] border border-[#B4893A]/25" />
      {/* гребень на верхней линии: под ним пудра «разрывает» рамку */}
      <div className="absolute -top-[30px] left-1/2 w-[250px] -translate-x-1/2 bg-paper px-1">
        <BranchCrest className="h-[60px] w-full" />
      </div>

      <h2 className="relative font-display text-[36px] leading-none font-normal italic" style={{ color: GARNET_DEEP }}>
        {t.blessing.title}
      </h2>
      <p className="relative mt-5 text-[21px] leading-[1.65] text-balance italic">{text}</p>
      <SeedRow className="relative mt-6" width="w-10" />
      <p
        className="relative mx-auto mt-5 max-w-[300px] text-[17px] leading-[1.6] text-balance"
        style={{ color: GARNET }}
      >
        {t.design["anor-bogi"].anorWish /* читается при рендере: язык выбирает гость */}
      </p>
    </div>
  );
}

/** Финал: хозяева, а внизу снова гранатовый сад — тает вверх в пудру */
function Finale({ inv, photo }: { inv: Invitation; photo: string }) {
  return (
    <footer className="relative mt-20 text-center">
      <Reveal effect="spotlight" className="relative z-[1] px-6">
        <HalfAnor className="mx-auto w-[72px]" />
        <p className="mt-6 font-display text-[42px] leading-none italic">{t.hosts.waiting}</p>
        <p className="mt-6 text-[18px] text-muted italic">{t.hosts.respectDeep}:</p>
        <p className="mt-2 text-[26px] leading-snug font-semibold text-balance break-words" style={goldInk}>
          {inv.data.hosts}
        </p>
        <SeedRow className="mt-7" />
      </Reveal>
      {/* гранатовый сад снова: тает вверх в пудру, ниже текста */}
      <PhotoBackdrop
        src={photo}
        color={PAPER}
        fade="to-top"
        strength={0.72}
        opacity={0.9}
        position="22% 70%"
        className="relative -mt-[4svh] h-[48svh]"
      />
    </footer>
  );
}
