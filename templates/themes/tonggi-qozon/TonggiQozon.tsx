"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("tonggi-qozon");
import type { TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Dawn } from "./Dawn";
import { GoldDefs, KazanScene, Pomegranate, PomegranateDivider, Steam } from "./decor";
import { melody } from "./melody";
import { CREAM, POMEGRANATE, fontClasses, vars } from "./style";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * №41 «Тонгги қозон» — наҳорги ош, Анимацияли.
 * Рассвет: экран светлеет, проявляется казан плова, над ним тянется пар.
 */
export default function TonggiQozon({ data, mode, art }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const { main } = inv;
  const { when } = main;

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="bg-paper text-ink"
      backdropClassName="bg-[#F3E6D0]"
      pageColor={CREAM}
      musicButtonClassName="rounded-full bg-[#8E2A2A] text-[#F6D58E] shadow-[0_10px_24px_-8px_rgba(142,42,42,0.7)] ring-1 ring-[#F6D58E]/60"
    >
      <GoldDefs />
      <Dawn inv={inv} />

      <Hero inv={inv} art={art} />

      <main className="relative px-6 pb-24 text-center">
        {/* Текст */}
        <Reveal>
          <p className="font-display text-[28px] font-bold text-[#8E2A2A] italic">{inv.text.greeting}</p>
          <p className="mt-4 text-[17px] leading-[1.75]">{inv.text.body}</p>
        </Reveal>

        {/* Время крупно и дата */}
        <Section title={t.date.title[inv.occasion]}>
          <Reveal effect="spotlight">
            <div className="relative mx-auto max-w-[320px] rounded-[30px] px-6 pt-6 pb-7" style={{ background: "radial-gradient(120% 90% at 50% 0%, #FFF3D6 0%, #FBE7C2 60%, #F5D9A8 100%)" }}>
              <p className="text-[14px] tracking-[0.34em] text-muted uppercase">{t.date.time}</p>
              <p
                className="font-display text-[clamp(84px,26vw,104px)] leading-none font-extrabold lining-nums tabular-nums"
                style={{
                  // тёмное шафрановое золото: на креме читается лучше светлого блика
                  background: "linear-gradient(100deg, #9A6418 0%, #C68A2E 35%, #E9B65A 50%, #C68A2E 65%, #8A5A16 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {main.time}
              </p>
              <PomegranateDivider className="my-4" />
              <p className="font-display text-[26px] font-bold">
                {when.day} {t.months[when.monthIndex]} {when.year}
              </p>
              <p className="mt-1 text-[17px] text-muted">{t.weekdays[when.weekdayIndex]}</p>
            </div>
          </Reveal>
        </Section>

        {/* Манзил */}
        <Section title={t.venue.title}>
          <Reveal>
            <div className="rounded-[26px] bg-white/75 px-6 pt-7 pb-8 shadow-[0_18px_40px_-26px_rgba(94,26,26,0.55)] ring-1 ring-[#C68A2E]/30">
              <Pomegranate className="mx-auto h-9 w-9" />
              <p className="mt-3 font-display text-[28px] leading-tight font-bold">{main.venueName}</p>
              <p className="mt-1 text-[17px] text-muted">{main.address}</p>
              <MapButton
                href={main.mapHref}
                className="mt-6 rounded-full bg-[#8E2A2A] px-7 py-3.5 text-[16px] text-[#FFF3DC] shadow-[0_12px_26px_-12px_rgba(142,42,42,0.9)] ring-1 ring-[#F6D58E]/50"
                iconClassName="text-[#F6D58E]"
              />
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
                box: "flex flex-col items-center rounded-full aspect-square justify-center bg-[radial-gradient(circle_at_35%_30%,#FFF6E2,#F7DFB2)] shadow-[0_10px_22px_-12px_rgba(142,90,30,0.7)] ring-1 ring-[#C68A2E]/40",
                number: "font-display text-[30px] font-extrabold leading-none text-[#8E2A2A]",
                label: "mt-1 text-[12px] text-muted uppercase",
                today: "font-display text-[30px] font-bold text-[#8E2A2A]",
              }}
            />
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
          <div className="mt-16">
            <PomegranateDivider />
            <p className="mt-6 text-[18px] leading-[1.7] text-ink/85 italic">{t.heart.text[inv.occasion]}</p>
          </div>
        </Reveal>
        <Reveal effect="spotlight">
          <div className="mt-12">
            <p className="text-[16px] text-muted italic">{t.hosts.respect}:</p>
            <p className="mt-2 font-display text-[34px] leading-tight font-bold" style={{ color: POMEGRANATE }}>
              {data.hosts}
            </p>
          </div>
        </Reveal>
      </main>
    </InvitationShell>
  );
}

type Inv = ReturnType<typeof useInvitation>;

/** Первый экран: «Наҳорги ош», повод, ниже картина с паром */
function Hero({ inv, art }: { inv: Inv; art?: string }) {
  const on = inv.started;
  const show = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.9, delay: on ? delay : 0, ease: EASE },
  });

  return (
    <header className="relative h-[100svh] min-h-[600px] overflow-hidden">
      {/* тёплое утреннее небо (под картиной и вместо неё) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #FFFBF2 0%, #FCEFD6 40%, #F8DDB0 70%, #FBF4E8 100%)" }}
      />
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.06 }}
        animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.06 }}
        transition={{ duration: 2.6, delay: on ? 0.5 : 0, ease: EASE }}
        style={{ maskImage: "linear-gradient(180deg, transparent 0%, #000 30%, #000 80%, transparent 100%)" }}
      >
        {art ? (
          <Image src={art} alt="" fill sizes="430px" loading="eager" fetchPriority="high" className="object-cover object-[50%_70%]" />
        ) : (
          <>
            {/* тёплое свечение за казаном: на нём виден белый пар */}
            <div className="absolute top-[30%] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle, rgba(246,190,100,0.75) 0%, rgba(246,200,120,0.35) 45%, rgba(246,200,120,0) 70%)" }} />
            <KazanScene className="absolute inset-x-0 bottom-[14%] h-[50%] w-full" />
          </>
        )}
      </motion.div>
      {/* пар над казаном */}
      <Steam className={`absolute inset-x-[18%] h-[240px] ${art ? "bottom-[38%]" : "bottom-[50%]"}`} />

      <div className="relative flex flex-col items-center px-6 pt-[8svh] text-center">
        <motion.p {...show(1)} className="text-[14px] tracking-[0.4em] text-muted uppercase">
          {t.cover.inviteEyebrow}
        </motion.p>
        <motion.h1
          {...show(1.15)}
          className="mt-3 font-display text-[clamp(48px,14.5vw,62px)] leading-none font-extrabold"
          style={{ color: POMEGRANATE, textShadow: "0 2px 20px rgba(251,244,232,0.95)" }}
        >
          {t.occasionTitles.nahorgi}
        </motion.h1>
        <motion.div {...show(1.3)}>
          <PomegranateDivider className="mt-4" />
        </motion.div>
        <motion.p {...show(1.45)} className="mt-4 max-w-[300px] text-[18px] leading-snug italic" style={{ textShadow: "0 1px 12px rgba(251,244,232,0.95)" }}>
          {t.causeLine(inv.data)}
        </motion.p>
      </div>
    </header>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-16">
      <Reveal effect="fade">
        <h2 className="mb-7 font-display text-[36px] leading-tight font-bold">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}
