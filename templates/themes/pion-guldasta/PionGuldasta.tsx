"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("pion-guldasta");
import type { TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Reveal } from "../../blocks/Reveal";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { RibbonEnvelope } from "./RibbonEnvelope";
import { BouquetFallback, GoldDefs, PetalDivider } from "./decor";
import { melody } from "./melody";
import { BORDO, CREAM, POWDER, fontClasses, vars } from "./style";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * №51 «Пион гулдаста» — юбилей, Анимацияли.
 * Конверт с бордовой лентой → «вырастает» пышный букет пионов → золотая «60» проявляется с бликом.
 */
export default function PionGuldasta({ data, mode, art }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const { main } = inv;
  const { when } = main;

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="bg-paper text-ink"
      backdropClassName="bg-[#F3DCD8]"
      pageColor={CREAM}
      musicButtonClassName="rounded-full bg-[#6E1E2E] text-[#F3D58A] shadow-[0_10px_24px_-8px_rgba(110,30,46,0.7)] ring-1 ring-[#F3D58A]/60"
    >
      <GoldDefs />
      <RibbonEnvelope inv={inv} age={data.age} />

      <Hero inv={inv} art={art} />

      <main className="relative px-6 pb-24 text-center">
        <Reveal>
          <p className="font-display text-[32px] font-semibold text-[#6E1E2E] italic">{inv.text.greeting}</p>
          <p className="mt-4 text-[17px] leading-[1.75]">{inv.text.body}</p>
        </Reveal>

        {/* Сана: бордовый бархатный ярлык */}
        <Section title={t.date.title[inv.occasion]}>
          <Reveal effect="spotlight">
            <div
              className="relative mx-auto max-w-[330px] overflow-hidden rounded-[28px] px-6 pt-7 pb-7 text-[#FFF1EC] shadow-[0_22px_44px_-22px_rgba(78,18,32,0.75)]"
              style={{ background: "radial-gradient(120% 80% at 30% 0%, #8E3247 0%, #6E1E2E 50%, #4A1220 100%)" }}
            >
              <span className="absolute inset-[8px] rounded-[22px] border border-[#F3D58A]/35" />
              <p className="text-[15px] tracking-[0.3em] text-[#F6D9D5] uppercase">{t.weekdays[when.weekdayIndex]}</p>
              <p className="gold-text font-display text-[92px] leading-[0.95] font-semibold italic lining-nums tabular-nums">{when.day}</p>
              <p className="font-display text-[28px] italic">
                {t.months[when.monthIndex]} {when.year}
              </p>
              <div className="mx-auto my-4 h-px w-20 gold-fill" />
              <p className="text-[18px]">
                {t.date.time}{" "}
                <span className="gold-text font-display text-[30px] font-semibold italic lining-nums tabular-nums">{main.time}</span>
              </p>
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
                box: "flex flex-col items-center rounded-[20px] bg-[linear-gradient(180deg,#FFFFFF,#F6E4E1)] px-1 pt-4 pb-3 shadow-[0_12px_26px_-16px_rgba(110,30,46,0.6)] ring-1 ring-[#B8892F]/35",
                number: "font-display text-[38px] font-semibold italic leading-[1.05] text-[#6E1E2E]",
                label: "mt-2.5 text-[12px] tracking-[0.1em] text-muted uppercase",
                today: "font-display text-[32px] font-semibold italic text-[#6E1E2E]",
              }}
            />
          </Reveal>
        </Section>

        {/* Манзил */}
        <Section title={t.venue.title}>
          <Reveal>
            <div className="rounded-[26px] px-6 pt-7 pb-8 ring-1 ring-[#B8892F]/30" style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${POWDER} 100%)` }}>
              <p className="font-display text-[34px] leading-tight font-semibold text-[#6E1E2E] italic">{main.venueName}</p>
              <p className="mt-1 text-[17px] text-muted">{main.address}</p>
              <MapButton
                href={main.mapHref}
                className="mt-6 rounded-full bg-[#6E1E2E] px-7 py-3.5 text-[16px] text-[#FFF1EC] shadow-[0_12px_26px_-12px_rgba(110,30,46,0.9)] ring-1 ring-[#F3D58A]/50"
                iconClassName="text-[#F3D58A]"
              />
            </div>
          </Reveal>
        </Section>

        {/* Чин юракдан и хозяева */}
        <Reveal>
          <div className="mt-16">
            <PetalDivider />
            <p className="mt-6 text-[18px] leading-[1.7] text-ink/85 italic">{t.heart.text[inv.occasion]}</p>
          </div>
        </Reveal>
        <Reveal effect="spotlight">
          <div className="mt-12">
            <p className="text-[16px] text-muted italic">{t.hosts.respectDeep}:</p>
            <p className="mt-2 font-display text-[40px] leading-[1.1] font-semibold italic" style={{ color: BORDO }}>
              {data.hosts}
            </p>
          </div>
        </Reveal>
      </main>
    </InvitationShell>
  );
}

type Inv = ReturnType<typeof useInvitation>;

/** Первый экран: крупная золотая «60», строка юбилея, ниже букет */
function Hero({ inv, art }: { inv: Inv; art?: string }) {
  const on = inv.started;
  const show = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.9, delay: on ? delay : 0, ease: EASE },
  });

  return (
    <header className="relative h-[100svh] min-h-[600px] overflow-hidden">
      <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${CREAM} 0%, ${POWDER} 55%, ${CREAM} 100%)` }} />

      {/* букет «вырастает» снизу */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[64%] origin-bottom"
        initial={{ opacity: 0, scale: 0.7, y: 40 }}
        animate={on ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: 40 }}
        transition={{ duration: 1.6, delay: on ? 1.2 : 0, ease: EASE }}
        style={{ maskImage: "linear-gradient(180deg, transparent 0%, #000 22%, #000 82%, transparent 100%)" }}
      >
        {art ? (
          <Image src={art} alt="" fill sizes="430px" loading="eager" fetchPriority="high" className="object-cover object-[50%_75%]" />
        ) : (
          <BouquetFallback className="absolute inset-x-[-4%] bottom-[6%] h-[92%] w-[108%]" />
        )}
      </motion.div>

      <div className="relative flex flex-col items-center px-6 pt-[5svh] text-center">
        <motion.div
          className="flex items-start"
          initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
          animate={on ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.85, filter: "blur(6px)" }}
          transition={{ duration: 1.2, delay: on ? 1.7 : 0, ease: EASE }}
        >
          <span className="gold-text gold-shine font-display text-[clamp(120px,min(40vw,22svh),170px)] leading-[0.9] font-bold italic">
            {inv.data.age}
          </span>
          <span className="mt-[0.6em] ml-1 font-display text-[34px] text-[#6E1E2E] italic">{t.ageLabel}</span>
        </motion.div>
        <motion.div {...show(2.1)}>
          <PetalDivider className="mt-2" />
        </motion.div>
        <motion.p {...show(2.25)} className="mt-3 max-w-[310px] font-display text-[clamp(26px,7.4vw,31px)] leading-[1.15] font-semibold text-[#6E1E2E] italic">
          {t.jubileeLine(inv.data)}
        </motion.p>
      </div>
    </header>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-16">
      <Reveal effect="fade">
        <h2 className="mb-7 font-display text-[42px] leading-tight font-semibold text-[#6E1E2E] italic">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}
