"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("oq-ot");
import type { TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Petals } from "../../blocks/Petals";
import { Curtain } from "./Curtain";
import { CornerFlourish, GirihMedallion, GoldDefs, RegistanSilhouette, Swirl } from "./decor";
import { melody } from "./melody";
import { IVORY, ROYAL, SKY, fontClasses, vars } from "./style";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * №31 «Оқ от» — суннат тўйи, Анимацияли.
 * Синий бархатный занавес → картина «шаҳзода на белом коне у Регистана» растворяется в слоновую кость.
 */
export default function OqOt({ data, mode, art }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const { main } = inv;
  const { when } = main;
  const name = data.person ?? "";

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="bg-paper text-ink"
      backdropClassName="bg-[#E9EEF6]"
      pageColor={IVORY}
      musicButtonClassName="rounded-full bg-[#1F3A6E] text-[#F3D58A] shadow-[0_10px_26px_-8px_rgba(31,58,110,0.7)] ring-1 ring-[#F3D58A]/60"
    >
      <GoldDefs />
      <Curtain inv={inv} name={name} />
      {inv.started && <Petals />}

      <Hero inv={inv} art={art} name={name} />

      <main className="relative px-6 pb-24">
        {/* Текст приглашения в карточке с уголками */}
        <Reveal>
          <div className="relative mx-auto mt-2 rounded-[22px] bg-white/70 px-7 pt-9 pb-8 text-center shadow-[0_20px_44px_-28px_rgba(31,58,110,0.55)] ring-1 ring-[#B8892F]/30">
            <CornerFlourish className="absolute top-2 left-2 h-10 w-10" />
            <CornerFlourish className="absolute top-2 right-2 h-10 w-10 -scale-x-100" />
            <CornerFlourish className="absolute bottom-2 left-2 h-10 w-10 -scale-y-100" />
            <CornerFlourish className="absolute right-2 bottom-2 h-10 w-10 -scale-100" />
            <p className="font-display text-[27px] font-semibold text-[#1F3A6E] italic">{inv.text.greeting}</p>
            <p className="mt-4 text-[18px] leading-[1.65]">{inv.text.body}</p>
          </div>
        </Reveal>

        {/* Сана */}
        <Section title={t.date.title[inv.occasion]}>
          <Reveal effect="spotlight">
            <div className="flex items-stretch justify-center gap-4">
              <div className="flex w-[30%] flex-col justify-center border-y border-[#B8892F]/45 py-3">
                <p className="text-[17px] text-muted">{t.weekdays[when.weekdayIndex]}</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[14px] tracking-[0.3em] text-[#B8892F] uppercase">{t.months[when.monthIndex]}</p>
                <p className="font-display text-[84px] leading-[0.95] font-semibold text-[#1F3A6E] lining-nums tabular-nums">{when.day}</p>
              </div>
              <div className="flex w-[30%] flex-col justify-center border-y border-[#B8892F]/45 py-3">
                <p className="text-[17px] text-muted lining-nums tabular-nums">
                  {when.year} {t.date.year}
                </p>
              </div>
            </div>
            <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-full bg-[#1F3A6E] px-6 py-3 text-[#F4EBD6] shadow-[0_12px_28px_-14px_rgba(31,58,110,0.8)]">
              <span className="text-[16px]">{main.title}</span>
              <span className="h-4 w-px bg-[#F3D58A]/60" />
              <span className="gold-text font-display text-[22px] font-semibold lining-nums tabular-nums">
                {t.date.time.toLowerCase()} {main.time}
              </span>
            </div>
          </Reveal>
        </Section>

        {/* Таймер */}
        <Section title={t.countdown.title[inv.occasion]}>
          <Reveal>
            <Countdown
              startsAt={when.startsAt}
              look={{
                grid: "grid grid-cols-4 gap-2.5",
                box: "relative flex flex-col items-center overflow-hidden rounded-2xl px-1 pt-4 pb-3 shadow-[0_12px_26px_-14px_rgba(31,58,110,0.8)] ring-1 ring-[#F3D58A]/40 bg-[linear-gradient(160deg,#2A4C8C,#1F3A6E_55%,#162C58)]",
                number: "gold-text font-display text-[36px] font-semibold leading-none",
                label: "mt-2 text-[13px] tracking-[0.12em] text-[#DCE6F2] uppercase",
                today: "font-display text-[30px] font-semibold text-[#1F3A6E]",
              }}
            />
          </Reveal>
        </Section>

        {/* Манзил */}
        <Section title={t.venue.title}>
          <Reveal>
            <div className="relative overflow-hidden rounded-[22px] px-6 pt-8 pb-8 text-center ring-1 ring-[#B8892F]/30" style={{ background: `linear-gradient(180deg, ${SKY} 0%, #FFFFFF 100%)` }}>
              <GirihMedallion className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 opacity-30" />
              <p className="font-display text-[28px] leading-tight font-semibold text-[#1F3A6E]">{main.venueName}</p>
              <p className="mt-1 text-[17px] text-muted">{main.address}</p>
              <MapButton
                href={main.mapHref}
                className="mt-6 rounded-full bg-[#1F3A6E] px-7 py-3.5 text-[16px] text-[#F4EBD6] shadow-[0_12px_26px_-12px_rgba(31,58,110,0.9)] ring-1 ring-[#F3D58A]/60"
                iconClassName="text-[#F3D58A]"
              />
            </div>
          </Reveal>
        </Section>

        {inv.program.some(e => e !== main) && <Section title={t.venue.programTitle}>
          <div className="space-y-5">
            {inv.program.filter(e => e !== main).map((event, i) => <Reveal key={i}>
              <div className="rounded-[22px] border border-primary/20 bg-white/60 px-5 py-6 text-center [overflow-wrap:anywhere]">
                <p className="font-display text-[25px] leading-snug text-primary">{event.title}</p>
                <p className="mt-3 text-[17px]">{t.date.long(event.when.day, event.when.monthIndex, event.when.year)} · {t.date.at(event.time)}</p>
                <p className="mt-4 font-display text-[25px] leading-snug">{event.venueName}</p>
                <p className="mt-2 text-[17px] text-muted">{event.address}</p>
                <MapButton href={event.mapHref} className="mt-5 rounded-full border border-primary/40 px-5 py-3 text-primary" iconClassName="text-primary"/>
              </div>
            </Reveal>)}
          </div>
        </Section>}

        {/* Чин юракдан и хозяева */}
        <Reveal>
          <div className="mt-16 text-center">
            <Swirl className="mx-auto h-6 w-40" />
            <p className="mt-6 text-[18px] leading-[1.65] text-ink/85 italic">{t.heart.text[inv.occasion]}</p>
          </div>
        </Reveal>
        <Reveal effect="spotlight">
          <div className="mt-12 text-center">
            <p className="text-[14px] tracking-[0.32em] text-[#B8892F] uppercase">{t.hosts.respect}</p>
            <p className="mt-3 font-display text-[32px] leading-tight font-semibold text-[#1F3A6E]">{data.hosts}</p>
            <p className="mt-5 text-[17px] text-muted">{t.hosts.closing}</p>
            <GirihMedallion className="mx-auto mt-8 h-16 w-16" />
          </div>
        </Reveal>
      </main>
    </InvitationShell>
  );
}

type Inv = ReturnType<typeof useInvitation>;

/** Первый экран: картина (или временный фон) растворяется в слоновую кость, заголовок на светлом верху */
function Hero({ inv, art, name }: { inv: Inv; art?: string; name: string }) {
  const on = inv.started;
  const show = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.9, delay: on ? delay : 0, ease: EASE },
  });

  return (
    <header className="relative h-[100svh] min-h-[600px] overflow-hidden">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.1 }}
        animate={{ scale: on ? 1 : 1.1 }}
        transition={{ duration: 3.2, ease: EASE }}
        style={{ maskImage: "linear-gradient(180deg, #000 0%, #000 72%, transparent 100%)" }}
      >
        {art ? (
          <Image
            src={art}
            alt=""
            fill
            sizes="430px"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[50%_65%]"
          />
        ) : (
          <FallbackScene />
        )}
      </motion.div>
      {/* верх светлеет — для заголовка; низ уходит в слоновую кость */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${IVORY}F0 0%, ${IVORY}B3 22%, ${IVORY}00 42%, ${IVORY}00 70%, ${IVORY} 100%)`,
        }}
      />

      <div className="relative flex flex-col items-center px-6 pt-[9svh] text-center">
        <motion.p {...show(0.9)} className="gold-text text-[14px] font-bold tracking-[0.42em] uppercase">
          {t.occasionTitles.sunnat}
        </motion.p>
        <motion.div {...show(1.05)}>
          <Swirl className="mx-auto mt-3 h-5 w-36" />
        </motion.div>
        <motion.p {...show(1.2)} className="mt-3 font-display text-[21px] text-muted italic">
          {inv.data.relation && t.relationWord(inv.data.relation, name)}
        </motion.p>
        <motion.h1
          {...show(1.35)}
          className="font-display leading-[1.05] font-semibold"
          style={{ color: ROYAL, textShadow: "0 2px 18px rgba(247,241,230,0.9)", fontSize: nameSize(name) }}
        >
          {name}
        </motion.h1>
      </div>

      <motion.div
        aria-hidden
        className="absolute bottom-7 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={inv.opened ? { opacity: 0.8, y: [0, 6, 0] } : { opacity: 0 }}
        transition={{ opacity: { delay: 0.6 }, y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke={ROYAL} strokeWidth="1.5">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.div>
    </header>
  );
}

/** Временный фон, пока нет картины: утреннее небо, солнце, Регистан, медальон */
function FallbackScene() {
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, #FBF7EE 0%, ${SKY} 45%, #C7D5EA 100%)` }}>
      <div
        className="absolute top-[38%] left-1/2 h-[70vw] max-h-[300px] w-[70vw] max-w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,236,190,0.95) 0%, rgba(255,228,170,0.5) 35%, rgba(255,228,170,0) 70%)" }}
      />
      <GirihMedallion className="absolute top-[44%] left-1/2 h-[46vw] max-h-[200px] w-[46vw] max-w-[200px] -translate-x-1/2 -translate-y-1/2 opacity-40" />
      <RegistanSilhouette className="absolute inset-x-[-6%] bottom-[16%] h-[34%] w-[112%] opacity-90" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-16 text-center">
      <Reveal effect="fade">
        <h2 className="font-display text-[34px] leading-tight font-semibold text-[#1F3A6E]">{title}</h2>
        <Swirl className="mx-auto mt-2 mb-7 h-5 w-32" />
      </Reveal>
      {children}
    </section>
  );
}

/**
 * Кегль имени: обычно 40–54px, но самое длинное слово («Абдураҳмонжон») всегда целиком
 * помещается в колонку (ширина экрана, не больше 430px, минус поля 48px).
 */
function nameSize(name: string) {
  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length));
  return `min(54px, 12.4vw, calc((min(100vw, 430px) - 56px) / ${(longest * 0.62).toFixed(2)}))`;
}
