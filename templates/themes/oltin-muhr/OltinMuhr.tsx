"use client";

import { motion } from "motion/react";
import { t } from "@/texts/uz-cyrl";
import { useInvitation } from "@/templates/blocks/useInvitation";
import { InvitationShell } from "@/templates/blocks/InvitationShell";
import { Reveal } from "@/templates/blocks/Reveal";
import { Countdown } from "@/templates/blocks/Countdown";
import { Calendar } from "@/templates/blocks/Calendar";
import { MapButton } from "@/templates/blocks/MapButton";
import { Petals } from "@/templates/blocks/Petals";
import { designVars, type TemplateProps } from "../types";
import { Envelope } from "./Envelope";
import { Corner, Divider } from "./decor";
import { oltinMuhrPalettes, type OltinMuhrColor } from "./palettes";

/**
 * Премиум №1 «Олтин муҳр»: конверт с золотой печатью → светлая бумага,
 * рукописные имена по центру, рамка из уголков. Блоки всплывают снизу.
 */
export default function OltinMuhr({ data, mode, color }: TemplateProps) {
  const inv = useInvitation(data, mode);
  const palette = oltinMuhrPalettes[color as OltinMuhrColor] ?? oltinMuhrPalettes.bordo;
  const { date } = inv;

  const coverIn = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: inv.started ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    transition: { duration: 1.1, delay: 2.4 + delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <InvitationShell
      inv={inv}
      className="bg-primary-dark"
      style={designVars(palette, {
        display: "var(--font-serif)",
        accent: "var(--font-script)",
        body: "var(--font-sans)",
      })}
    >
      {!inv.opened && (
        <Envelope initials={inv.initials} onOpenStart={inv.start} onOpened={inv.finishOpening} />
      )}

      <main
        className="relative mx-auto max-w-[480px] overflow-hidden bg-paper text-center shadow-2xl"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--c-gold-light) 25%, transparent), transparent 60%)",
        }}
      >
        {/* 1. Обложка: имена и дата */}
        <section className="relative flex min-h-svh flex-col items-center justify-center px-8 py-20">
          <Corner className="absolute top-3 left-3 w-20 text-gold" />
          <Corner className="absolute top-3 right-3 w-20 -scale-x-100 text-gold" />
          <Corner className="absolute bottom-3 left-3 w-20 -scale-y-100 text-gold" />
          <Corner className="absolute right-3 bottom-3 w-20 -scale-100 text-gold" />

          <motion.div {...coverIn(0)}>
            <Divider className="mx-auto w-44 text-gold" />
            <p className="mt-4 font-display text-lg font-semibold tracking-[0.35em] text-muted uppercase">
              {t.cover.eyebrow}
            </p>
          </motion.div>

          <motion.h1 className="my-8 font-accent text-primary" {...coverIn(0.25)}>
            <span className="block text-[4.5rem] leading-[1.1]">{data.groom}</span>
            <span className="gold-text block font-display text-4xl italic">{t.cover.and}</span>
            <span className="block text-[4.5rem] leading-[1.1]">{data.bride}</span>
          </motion.h1>

          <motion.div {...coverIn(0.5)}>
            <p className="font-display text-2xl tracking-[0.2em] text-ink">
              {String(date.day).padStart(2, "0")} · {String(date.monthIndex + 1).padStart(2, "0")} ·{" "}
              {date.year}
            </p>
            <Divider className="mx-auto mt-4 w-44 rotate-180 text-gold" />
          </motion.div>

          <motion.div
            className="absolute bottom-10 flex flex-col items-center text-xs tracking-[0.2em] text-muted uppercase"
            {...coverIn(1)}
          >
            {t.cover.scrollHint}
            <motion.svg
              viewBox="0 0 24 24"
              className="mt-1 h-5 w-5 text-gold"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              aria-hidden
            >
              <path fill="none" stroke="currentColor" strokeWidth="1.6" d="m6 9 6 6 6-6" />
            </motion.svg>
          </motion.div>
        </section>

        {/* 2. Текст приглашения */}
        <section className="px-8 py-16">
          <Reveal>
            <p className="font-display text-3xl font-semibold text-primary italic">
              {inv.inviteText.greeting}
            </p>
            <p className="mt-6 font-display text-[1.3rem] leading-relaxed text-ink">
              {inv.inviteText.body(data.groom, data.bride)}
            </p>
          </Reveal>
        </section>

        {/* 3. Таймер */}
        <section className="relative bg-primary px-6 py-14 text-paper">
          <Reveal>
            <Divider className="mx-auto w-40 text-gold" />
            <h2 className="mt-3 mb-7 font-display text-3xl text-gold-light">{t.countdown.title}</h2>
            <Countdown startsAt={date.startsAt} />
          </Reveal>
        </section>

        {/* 4. Дата и календарь */}
        <section className="px-6 py-16">
          <Reveal>
            <h2 className="font-display text-lg font-semibold tracking-[0.3em] text-muted uppercase">
              {t.date.title}
            </h2>
            <p className="mt-3 font-display text-3xl text-primary">
              {t.date.long(date.day, date.monthIndex, date.year)}
            </p>
            <p className="mt-1 mb-8 text-[15px] font-medium text-ink">
              {t.date.dayAndTime(date.weekdayIndex, date.time)}
            </p>
          </Reveal>
          <Reveal>
            <Calendar date={date} />
          </Reveal>
        </section>

        {/* 5. Тойхона и карта */}
        <section className="px-6 pb-16">
          <Reveal>
            <div className="rounded-[2rem] border border-gold/50 bg-white/50 px-6 py-10 shadow-sm">
              <h2 className="font-display text-lg font-semibold tracking-[0.3em] text-muted uppercase">
                {t.venue.title}
              </h2>
              <Divider className="mx-auto mt-3 w-36 text-gold" />
              <p className="mt-4 font-display text-3xl font-semibold text-primary">{data.venueName}</p>
              <p className="mt-2 mb-8 text-[15px] text-ink">{data.address}</p>
              <MapButton href={inv.mapHref} />
            </div>
          </Reveal>
        </section>

        {/* 6. Хозяева торжества */}
        <section className="px-8 pt-4 pb-14">
          <Reveal>
            <p className="font-display text-lg font-semibold tracking-[0.3em] text-muted uppercase">
              {t.hosts.title}
            </p>
            <p className="mt-3 font-accent text-5xl leading-tight text-primary">{data.hosts}</p>
            <Divider className="mx-auto my-8 w-44 text-gold" />
            <p className="font-display text-2xl text-ink italic">{t.hosts.closing}</p>
          </Reveal>
          <p className="mt-14 text-[11px] tracking-wider text-muted/70">{t.footer.madeWith}</p>
        </section>
      </main>

      {inv.started && <Petals />}
    </InvitationShell>
  );
}
