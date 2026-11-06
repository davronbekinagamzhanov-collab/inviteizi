"use client";

import { MOTION } from "@/templates/blocks/motion";
import { motion } from "motion/react";
import { Fragment, type ReactNode } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("oltin-ot");
import type { TemplateProps } from "../types";
import { useInvitation, type Invitation, type InvitationEventView } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Reveal } from "../../blocks/Reveal";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Opening } from "./Opening";
import { DoppiRosette, GoldDefs, HeroRing, Horse, Qalampir, QalampirBand, QalampirRule, Velvet } from "./decor";
import { melody } from "./melody";
import { INK, MILK, fontClasses, vars } from "./style";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * №76 «Олтин от» — суннат тўйи, Анимацияли.
 * «Маленький шаҳзода»: нежный голубой бархат, золотой конь в нарядной сбруе,
 * перчинки-қалампир с чуст-дўппи. Шкатулка с лентой → медальон с конём → страница.
 */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const name = data.person ?? "";

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="bg-paper text-ink"
      backdropClassName="bg-[#DCE5F0]"
      pageColor={MILK}
      musicButtonClassName="rounded-full bg-[linear-gradient(160deg,#D3E0EF,#A9C1DD_60%,#8FAAD0)] text-[#1D3256] ring-[1.5px] ring-[#C99A3C] shadow-[0_10px_24px_-8px_rgba(29,50,86,0.55)]"
    >
      <GoldDefs />
      <Opening inv={inv} name={name} />
      <Hero inv={inv} name={name} />

      <main className="relative pb-0">
        {/* Текст приглашения */}
        <section className="px-7 pt-16 text-center">
          <Reveal>
            <DoppiRosette className="mx-auto h-16 w-16" inner="#8A6420" />
            {inv.text.greeting && (
              <p className="mt-5 font-display text-[29px] leading-tight font-medium" style={{ color: INK }}>
                {inv.text.greeting}
              </p>
            )}
            <p className="mx-auto mt-5 max-w-[340px] text-[17px] leading-[1.8] text-ink/85">{inv.text.body}</p>
          </Reveal>
        </section>

        {/* Тўй санаси: бархатный квадрат — как верх дўппи */}
        <Section title={t.date.title[inv.occasion]}>
          <Reveal effect="spotlight">
            <DateTile inv={inv} />
          </Reveal>
          <Reveal effect="fade" delay={0.05}>
            <div className="mx-auto mt-12 max-w-[330px] rounded-[22px] p-[1.5px] gold-fill">
              <div className="rounded-[21px] px-4 pt-6 pb-4" style={{ background: "#FFFDF8" }}>
                <Calendar
                  date={inv.main.when}
                  marker="circle"
                  markerClassName="[&_path]:[fill:url(#ot-enamel)] drop-shadow-[0_3px_4px_rgba(29,50,86,0.35)]"
                  markedDayClassName="text-[#F6DE97]"
                  weekendClassName="text-[#8A6420]"
                />
              </div>
            </div>
          </Reveal>
        </Section>

        {/* Таймер: золотые «тангалар» */}
        <Section title={t.countdown.title[inv.occasion]}>
          <Reveal>
            <Countdown
              startsAt={inv.main.when.startsAt}
              look={{
                grid: "mx-auto grid max-w-[340px] grid-cols-4 gap-3",
                today: "font-display text-[30px] font-medium text-[#1D3256]",
                renderUnit: (u) => (
                  <div className="flex flex-col items-center">
                    <div className="gold-fill aspect-square w-full max-w-[76px] rounded-full p-[2px] shadow-[0_10px_18px_-10px_rgba(29,50,86,0.7)]">
                      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                        <Velvet />
                        <span className="absolute inset-[4px] rounded-full border border-white/50" />
                        <span className="relative font-display text-[28px] leading-none font-medium text-[#1D3256] lining-nums tabular-nums">
                          {u.value}
                        </span>
                      </div>
                    </div>
                    <span className="mt-2.5 text-[13px] text-ink/70">{u.label}</span>
                  </div>
                ),
              }}
            />
          </Reveal>
        </Section>

        {/* Тўй дастури: золотая нить, на ней тадбиры по времени */}
        <Section title={t.venue.programTitle}>
          <ol className="relative mx-auto max-w-[350px] px-6 text-left">
            <span aria-hidden className="gold-fill absolute top-3 bottom-10 left-[39px] w-px opacity-80" />
            {inv.program.map((ev, i) => (
              <li key={i} className="relative pb-11 pl-[52px] last:pb-2">
                <Reveal delay={i * MOTION.step}>
                  <ProgramItem event={ev} />
                </Reveal>
              </li>
            ))}
          </ol>
        </Section>

        {/* Оқ фотиҳа в бархатной арке */}
        <section className="px-6 pt-20">
          <Reveal effect="unroll">
            <Blessing inv={inv} />
          </Reveal>
        </section>

        {/* Чин юракдан */}
        <section className="px-8 pt-16 text-center">
          <Reveal>
            <p className="font-display text-[26px] font-medium" style={{ color: INK }}>
              {t.heart.title}
            </p>
            <QalampirRule className="mx-auto mt-2 h-6 w-40" />
            <p className="mx-auto mt-4 max-w-[330px] text-[17px] leading-[1.8] text-ink/85">{t.heart.text[inv.occasion]}</p>
          </Reveal>
        </section>

        {/* Хозяева */}
        <section className="px-6 pt-16 pb-14 text-center">
          <Reveal effect="spotlight">
            <p className="text-[17px] text-muted italic">{t.hosts.respectDeep}</p>
            <p className="mx-auto mt-3 max-w-[340px] font-display text-[clamp(28px,8.6vw,34px)] leading-[1.15] font-medium text-balance" style={{ color: INK }}>
              {data.hosts}
            </p>
            <Horse className="mx-auto mt-8 h-[118px] w-[112px] drop-shadow-[0_6px_8px_rgba(29,50,86,0.25)]" />
            <p className="mt-6 font-display text-[21px] italic" style={{ color: INK }}>
              {t.hosts.thanks}
            </p>
          </Reveal>
        </section>

        {/* Бархатная кайма внизу — как край дўппи */}
        <footer aria-hidden className="relative h-[92px] overflow-hidden">
          <Velvet />
          <QalampirBand id="foot" className="absolute inset-x-0 top-3" />
          <DoppiRosette className="absolute bottom-3 left-1/2 h-9 w-9 -translate-x-1/2" inner="#2F4C7C" />
        </footer>
      </main>
    </InvitationShell>
  );
}

/** Первый экран: бархат, кольцо из перчинок, золотой конь гарцует, имя мальчика */
function Hero({ inv, name }: { inv: Invitation; name: string }) {
  const on = inv.opened;
  const { when } = inv.main;
  const show = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: { duration: 0.8, delay: on ? delay : 0, ease: EASE },
  });

  // «Абдураҳмонжон ва Абдуллоҳжон» — два имени, «ва» отдельной строкой
  const names = name.split(` ${t.cover.andWord} `);
  const longest = Math.max(...names.map((n) => n.length));
  const nameSize =
    longest >= 12 ? "clamp(34px,10.2vw,44px)" : longest >= 9 ? "clamp(40px,12vw,52px)" : "clamp(46px,14vw,60px)";

  return (
    <header className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 pt-[48px] pb-[70px] text-center">
      <Velvet />
      <QalampirBand id="hero-top" className="absolute inset-x-0 top-3" />

      <motion.p {...show(0.05)} className="relative font-display text-[19px] tracking-[0.06em] text-[#6E4E16]">
        {t.occasionTitles[inv.occasion]}
      </motion.p>

      <div className="relative mt-[2svh] aspect-square w-[min(86vw,340px,43svh)]">
        {/* молочный свет за конём */}
        <motion.div
          aria-hidden
          className="absolute inset-[-12%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,250,236,0.95) 0%, rgba(255,248,230,0.55) 38%, rgba(255,248,230,0) 66%)" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.92, rotate: -20 }}
          animate={on ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.92, rotate: -20 }}
          transition={{ duration: 1.4, ease: EASE }}
        >
          <HeroRing className="h-full w-full" />
        </motion.div>
        <motion.div
          aria-hidden
          className="absolute inset-[9%_7%_4%_9%]"
          initial={{ opacity: 0, y: 14 }}
          animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 1, delay: on ? 0.15 : 0, ease: EASE }}
        >
          <Horse prance className="h-full w-full drop-shadow-[0_10px_10px_rgba(29,50,86,0.35)]" />
        </motion.div>
        {on && <GoldDust />}
      </div>

      {inv.data.relation && (
        <motion.p {...show(0.35)} className="relative mt-[2.2svh] text-[18px] text-[#3B5079] italic">
          {t.relationWord(inv.data.relation, inv.data.person)}
        </motion.p>
      )}
      <motion.h1
        {...show(0.45)}
        className="relative mt-1 font-display leading-[1.02] font-medium"
        style={{ color: INK, fontSize: nameSize, textShadow: "0 1px 0 rgba(255,255,255,0.35)" }}
      >
        {names.map((n, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="block py-0.5 text-[0.52em] text-[#6E4E16] italic">{t.cover.andWord}</span>}
            <span className="block">{n}</span>
          </Fragment>
        ))}
      </motion.h1>
      <motion.div {...show(0.6)} className="relative">
        <QalampirRule className="mx-auto mt-3 h-6 w-44" />
        <p className="mt-1 font-display text-[19px] tracking-[0.02em] lining-nums" style={{ color: INK }}>
          {t.weekdays[when.weekdayIndex]}, {t.date.long(when.day, when.monthIndex, when.year)}
        </p>
      </motion.div>

      <QalampirBand id="hero-bottom" className="absolute inset-x-0 bottom-3" />
      <motion.div
        aria-hidden
        className="absolute bottom-[42px] left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={on ? { opacity: 0.75, y: [0, 5, 0] } : { opacity: 0 }}
        transition={{ opacity: { delay: 1.2 }, y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={INK} strokeWidth="1.4">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </motion.div>
    </header>
  );
}

// Золотая пыль поднимается от коня (фиксированные значения — одинаково на сервере и в браузере)
const DUST = [
  { x: 18, y: 70, d: 0, s: 3 },
  { x: 30, y: 82, d: 1.1, s: 2 },
  { x: 46, y: 76, d: 2.3, s: 2.5 },
  { x: 62, y: 84, d: 0.6, s: 2 },
  { x: 76, y: 72, d: 1.8, s: 3 },
  { x: 86, y: 60, d: 2.9, s: 2 },
  { x: 12, y: 48, d: 3.4, s: 2 },
  { x: 54, y: 40, d: 4, s: 2.5 },
];

function GoldDust() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {DUST.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s,
            background: "radial-gradient(circle, #FFF6D6 0%, #E8C26A 60%, rgba(232,194,106,0) 100%)",
            boxShadow: "0 0 6px rgba(246,222,151,0.9)",
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], y: [0, -46] }}
          transition={{ duration: 4.2, delay: p.d, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-6 pt-20 text-center">
      <Reveal effect="fade">
        <h2 className="font-display text-[34px] leading-tight font-medium" style={{ color: INK }}>
          {title}
        </h2>
        <QalampirRule className="mx-auto mt-2 mb-8 h-6 w-40" />
      </Reveal>
      {children}
    </section>
  );
}

/** Дата на бархатном квадрате: месяц, крупное число, день недели; под ним — время и год */
function DateTile({ inv }: { inv: Invitation }) {
  const { main } = inv;
  const { when } = main;
  return (
    <div>
      <div className="gold-fill mx-auto aspect-square w-[min(68vw,256px)] rounded-[34px] p-[2px] shadow-[0_24px_40px_-24px_rgba(29,50,86,0.8)]">
        <div className="relative h-full w-full overflow-hidden rounded-[32px]">
          <Velvet />
          <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
            <rect x="9" y="9" width="182" height="182" rx="20" fill="none" stroke="url(#ot-gold)" strokeWidth="0.7" strokeDasharray="1.4 2.6" />
            {/* четыре перчинки по углам, кончиками к центру — как на дўппи */}
            {[
              [28, 28, 135],
              [172, 28, 225],
              [172, 172, 315],
              [28, 172, 45],
            ].map(([x, y, a], i) => (
              <Qalampir key={a} transform={`translate(${x} ${y}) rotate(${a}) scale(${i % 2 ? -0.5 : 0.5},0.5)`} inner="#2F4C7C" />
            ))}
          </svg>
          <div className="relative flex h-full flex-col items-center justify-center">
            <p className="text-[17px] tracking-[0.04em] text-[#2C4570]">{t.months[when.monthIndex]}</p>
            <p className="font-display text-[clamp(78px,24vw,96px)] leading-[0.92] font-medium text-[#1D3256] lining-nums tabular-nums">
              {when.day}
            </p>
            <p className="mt-1 font-display text-[20px] text-[#2C4570] italic">{t.weekdays[when.weekdayIndex]}</p>
          </div>
        </div>
      </div>
      <div className="mt-7 flex items-center justify-center gap-4 font-display text-[20px] lining-nums" style={{ color: INK }}>
        <span>{inv.isMorning ? t.date.morningAt(main.time) : t.date.at(main.time)}</span>
        <svg aria-hidden viewBox="-12 -40 30 40" className="h-5 w-4">
          <Qalampir transform="scale(0.72)" />
        </svg>
        <span>
          {when.year} {t.date.year}
        </span>
      </div>
    </div>
  );
}

/** Один тадбир на золотой нити: время, название, день, место, карта */
function ProgramItem({ event }: { event: InvitationEventView }) {
  const { when } = event;
  return (
    <div>
      {/* узел на нити: бархатная пуговица с розеткой дўппи */}
      <span aria-hidden className="gold-fill absolute top-0 -left-[1px] h-[34px] w-[34px] rounded-full p-[1.5px]">
        <span className="relative block h-full w-full overflow-hidden rounded-full">
          <Velvet />
          <svg aria-hidden viewBox="-16 -46 32 50" className="absolute inset-[6px]">
            <Qalampir transform="translate(-2 0) scale(0.82)" inner="#2F4C7C" />
          </svg>
        </span>
      </span>
      <p className="font-display text-[40px] leading-[0.9] font-medium lining-nums tabular-nums" style={{ color: INK }}>
        {t.date.clock(event.time)}
      </p>
      <h3 className="mt-3 font-display text-[24px] leading-tight font-medium text-[#6E4E16]">{event.title}</h3>
      <p className="mt-1 text-[16px] text-muted">
        {t.weekdays[when.weekdayIndex]}, {when.day} {t.months[when.monthIndex]}
      </p>
      <p className="mt-4 text-[17px] leading-snug font-bold" style={{ color: INK }}>
        {event.venueName}
      </p>
      <p className="mt-1 text-[16px] leading-snug text-muted">{event.address}</p>
      <MapButton
        href={event.mapHref}
        className="mt-5 rounded-full bg-[linear-gradient(160deg,#D3E0EF,#A9C1DD_60%,#8FAAD0)] px-6 py-3 text-[16px] text-[#1D3256] shadow-[0_10px_22px_-12px_rgba(29,50,86,0.8)] ring-[1.5px] ring-[#C99A3C]"
        iconClassName="text-[#6E4E16]"
      />
    </div>
  );
}

/** Оқ фотиҳа: бархатная арка в золотой оправе */
function Blessing({ inv }: { inv: Invitation }) {
  const arch = { borderRadius: "50% 50% 28px 28px / 150px 150px 28px 28px" };
  return (
    <div className="gold-fill mx-auto max-w-[350px] p-[2px] shadow-[0_28px_44px_-28px_rgba(29,50,86,0.85)]" style={arch}>
      <div className="relative overflow-hidden px-8 pt-14 pb-11 text-center" style={arch}>
        <Velvet />
        <span
          aria-hidden
          className="absolute inset-[9px] border border-[#FFF3CC]/70"
          style={{ borderRadius: "50% 50% 21px 21px / 142px 142px 21px 21px" }}
        />
        <div className="relative">
          <DoppiRosette className="mx-auto h-14 w-14" inner="#2F4C7C" />
          <p className="mt-4 font-display text-[30px] font-medium text-[#1D3256]">{t.blessing.title}</p>
          <QalampirRule className="mx-auto mt-1 h-6 w-36" />
          <p className="mt-4 font-display text-[21px] leading-[1.55] text-[#1D3256] italic">{inv.blessing}</p>
        </div>
      </div>
    </div>
  );
}
