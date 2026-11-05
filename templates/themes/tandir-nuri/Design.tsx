"use client";

import { MOTION } from "@/templates/blocks/motion";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("tandir-nuri");
import type { InvitationData } from "@/lib/types";
import type { TemplateProps } from "../types";
import { useInvitation, type Invitation, type InvitationEventView } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { Reveal } from "../../blocks/Reveal";
import { Calendar } from "../../blocks/Calendar";
import { Countdown, type CountdownUnit } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { Opening } from "./Opening";
import { Defs, Divider, Glow, NonRosette, ScrollHint, Steam, round } from "./decor";
import { melody } from "./melody";
import { AMBER_TEXT, CLAY, INK, MILK, MILK_LIGHT, SAND, fontClasses, vars } from "./style";

const ART = "/art/tandir-nuri.webp";
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * №71 «Тандир нури» — наҳорги ош, Анимацияли.
 * Утро, тепло, уважение: песок, янтарь, молоко. Горячий нон с паром внизу первого экрана,
 * над ним крупно и светло — «эрталаб соат 6:00». Открытие — жар тандира раскрывается в утро.
 */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const { main } = inv;
  const several = inv.program.length > 1;

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="bg-paper text-ink"
      backdropClassName="bg-[#EBDDC5]"
      pageColor={MILK}
      musicButtonClassName="rounded-full bg-[#5B3220] text-[#F6C77A] shadow-[0_10px_24px_-8px_rgba(91,50,32,0.75)] ring-1 ring-[#E3A857]/60"
    >
      <Defs />
      <Opening inv={inv} />

      <Cover inv={inv} />

      <main className="relative px-6 text-center">
        {/* Текст приглашения */}
        <section className="pt-14">
          <Reveal>
            {inv.text.greeting && (
              <p className="font-display text-[30px] leading-tight" style={{ color: CLAY }}>
                {inv.text.greeting}
              </p>
            )}
            <p className="mx-auto mt-5 max-w-[340px] text-[18px] leading-[1.8] text-ink/90">{inv.text.body}</p>
          </Reveal>
        </section>

        {/* Сана ва вақт */}
        <Section title={t.date.title[inv.occasion]}>
          <Reveal effect="spotlight">
            <DateMedallion event={main} />
          </Reveal>
        </Section>

        {/* Календарь месяца */}
        <Reveal effect="fade">
          <div
            className="relative mx-auto mt-10 max-w-[360px] rounded-[36px] px-4 pt-7 pb-5"
            style={{ background: `radial-gradient(120% 70% at 50% 0%, ${MILK_LIGHT} 0%, ${SAND} 100%)` }}
          >
            <Calendar
              date={main.when}
              marker="circle"
              markerClassName="[&_path]:[fill:url(#tn-amber)] drop-shadow-[0_4px_10px_rgba(217,142,46,0.55)]"
              markedDayClassName="text-white"
              weekendClassName="text-[#A8641F]"
            />
          </div>
        </Reveal>

        {/* Таймер: четыре «нона» */}
        <Section title={t.countdown.title[inv.occasion]}>
          <Reveal>
            <Countdown
              startsAt={main.when.startsAt}
              look={{
                grid: "mx-auto grid max-w-[360px] grid-cols-4 gap-2.5",
                today: "font-display text-[32px]",
                renderUnit: (u) => <LoafDial unit={u} />,
              }}
            />
          </Reveal>
        </Section>

        {/* Тўй дастури / манзил: у каждого тадбира своё время, место и карта */}
        <Section title={several ? t.venue.programTitle : t.venue.title}>
          <ol className="relative mx-auto max-w-[340px] text-left">
            {several && (
              <span
                aria-hidden
                className="absolute top-4 bottom-10 left-[11px] w-px"
                style={{ background: "linear-gradient(180deg, #C9822C 0%, rgba(201,130,44,0.55) 70%, rgba(201,130,44,0) 100%)" }}
              />
            )}
            {inv.program.map((ev, i) => (
              <li key={i} className="relative pb-12 pl-11 last:pb-0">
                <Reveal delay={i * MOTION.step}>
                  <ProgramItem event={ev} />
                </Reveal>
              </li>
            ))}
          </ol>
        </Section>

        {/* Оқ фотиҳа в рамке */}
        <section className="pt-24">
          <Reveal effect="spotlight">
            <BlessingFrame text={inv.blessing} />
          </Reveal>
        </section>
      </main>

      <Closing inv={inv} />
    </InvitationShell>
  );
}

/** Первый экран: «Наҳорги ош», виновник, крупное время с тёплым свечением, горячий нон с паром */
function Cover({ inv }: { inv: Invitation }) {
  const on = inv.opened;
  const { main } = inv;
  const { when } = main;
  const cause = splitCause(inv.data);
  const clock = t.date.clock(main.time);
  // «эрталаб соат» над крупными цифрами; если не утро — просто «Соат»
  const label = inv.isMorning ? t.date.morningAt(main.time).replace(clock, "").trim() : t.date.time;

  const show = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: { duration: 0.9, delay: on ? delay : 0, ease: EASE },
  });

  return (
    <header
      className="relative flex h-[100svh] min-h-[580px] flex-col items-center overflow-hidden px-6 pt-[6.5svh] text-center"
      style={{ background: `linear-gradient(180deg, ${MILK_LIGHT} 0%, ${MILK} 45%)` }}
    >
      {/* горячий нон: фото внизу, тает вверх и вниз в молоко */}
      <motion.div
        aria-hidden
        data-decor
        className="absolute inset-x-0 bottom-0 h-[46%]"
        // верх фото тает почти до прозрачности: дата над ним читается чисто
        style={{
          maskImage: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 28%, #000 55%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 28%, #000 55%)",
        }}
        initial={{ opacity: 0, scale: 1.06 }}
        animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.06 }}
        transition={{ duration: 1.8, ease: EASE }}
      >
        <PhotoBackdrop src={ART} color={MILK} fade="both" strength={0.6} opacity={0.9} position="55% 55%" priority />
      </motion.div>
      <Steam className="absolute inset-x-[16%] bottom-[14%] h-[34%]" />

      <motion.h1
        {...show(0.05)}
        className="relative font-display text-[clamp(46px,min(14vw,8svh),62px)] leading-none"
        style={{ color: CLAY }}
      >
        {t.occasionTitles.nahorgi}
      </motion.h1>
      <motion.div {...show(0.15)} className="relative">
        <Divider className="mt-[2.2svh]" />
      </motion.div>

      <motion.div {...show(0.3)} className="relative mt-[2svh] max-w-[340px]">
        {cause ? (
          <>
            <p className="text-[18px] leading-snug text-muted italic">{cause.before}</p>
            <p
              className="my-1 font-display leading-[1.05] break-words text-ink"
              style={{ fontSize: cause.name.length > 12 ? "clamp(30px,8.6vw,36px)" : "clamp(36px,11vw,44px)" }}
            >
              {cause.name}
            </p>
            <p className="text-[18px] leading-snug text-muted italic">{cause.after}</p>
          </>
        ) : (
          <p className="text-[19px] leading-snug italic">{t.causeLine(inv.data)}</p>
        )}
      </motion.div>

      {/* время — главное на экране */}
      <motion.div
        className="relative mt-[3.2svh] flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
        transition={{ duration: 1.1, delay: on ? 0.45 : 0, ease: EASE }}
      >
        <Glow className="absolute top-1/2 left-1/2 h-[250px] w-[340px] -translate-x-1/2 -translate-y-1/2" />
        <p className="relative text-[20px] italic" style={{ color: CLAY }}>
          {label}
        </p>
        <p
          className="relative font-display text-[clamp(92px,min(31vw,16.5svh),136px)] leading-[0.95] font-medium lining-nums tabular-nums"
          style={{ ...AMBER_TEXT, filter: "drop-shadow(0 2px 14px rgba(255,236,196,0.9))" }}
        >
          {clock}
        </p>
        <p className="relative mt-1 text-[18px] text-ink" style={{ textShadow: "0 0 10px #FEFAF3, 0 0 18px #FEFAF3" }}>
          {t.weekdays[when.weekdayIndex]}, {when.day} {t.months[when.monthIndex]}
        </p>
      </motion.div>

      <ScrollHint show={on} />
    </header>
  );
}

/** «Ўғлимиз / Жасурбекнинг / никоҳ тўйи муносабати билан»: имя крупно отдельной строкой */
function splitCause(d: InvitationData) {
  const line = t.causeLine(d);
  const person = d.person ?? "";
  const i = person ? line.indexOf(person) : -1;
  if (i < 0) return null;
  const rest = line.slice(i + person.length);
  const space = rest.indexOf(" ");
  return {
    before: line.slice(0, i).trim(),
    name: person + (space < 0 ? rest : rest.slice(0, space)),
    after: space < 0 ? "" : rest.slice(space + 1),
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-20">
      <Reveal effect="fade">
        <h2 className="font-display text-[36px] leading-tight" style={{ color: CLAY }}>
          {title}
        </h2>
        <Divider className="mt-3 mb-8" />
      </Reveal>
      {children}
    </section>
  );
}

/** «Сана ва вақт»: день недели · число в «устье тандира» · месяц и год · время */
function DateMedallion({ event }: { event: InvitationEventView }) {
  const { when } = event;
  const time = Number(event.time.slice(0, 2)) < 9 ? t.date.morningAt(event.time) : t.date.at(event.time);
  return (
    <div>
      <div className="mx-auto grid max-w-[360px] grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className="text-right text-[19px] leading-tight italic">{t.weekdays[when.weekdayIndex]}</p>
        <div className="relative mx-1 grid h-[128px] w-[128px] place-items-center">
          <Glow className="absolute inset-[-28px]" strong />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 50% 42%, #FFF8E6 0%, #FCE7BF 52%, #F1C987 100%)",
              boxShadow: "inset 0 -6px 16px rgba(176,96,30,0.25), 0 14px 30px -18px rgba(120,60,20,0.7)",
            }}
          />
          <NonRosette className="absolute inset-0 h-full w-full opacity-70" rosette={false} />
          <span className="relative font-display text-[64px] leading-none lining-nums tabular-nums" style={{ color: CLAY }}>
            {when.day}
          </span>
        </div>
        <div className="text-left">
          <p className="text-[19px] leading-tight italic">{t.months[when.monthIndex]}</p>
          <p className="mt-1 text-[17px] text-muted lining-nums">
            {when.year} {t.date.year}
          </p>
        </div>
      </div>
      <p className="mt-7 font-display text-[30px] leading-tight lining-nums" style={AMBER_TEXT}>
        {time}
      </p>
    </div>
  );
}

/** Ячейка таймера: круглый нон с наколотым узором */
function LoafDial({ unit }: { unit: CountdownUnit }) {
  return (
    <div className="relative mx-auto grid aspect-square w-full max-w-[80px] place-items-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 38%, #FFFAF0 0%, #F8E6C4 60%, #EFCF98 100%)",
          boxShadow: "inset 0 -4px 10px rgba(176,96,30,0.2), 0 10px 18px -12px rgba(120,60,20,0.6)",
        }}
      />
      <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <circle cx="50" cy="50" r="47" fill="none" stroke="url(#tn-amber)" strokeWidth="2" />
        <g fill="url(#tn-amber)" opacity="0.75">
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return <circle key={i} cx={round(50 + 43 * Math.cos(a))} cy={round(50 + 43 * Math.sin(a))} r="1.1" />;
          })}
        </g>
      </svg>
      <div className="relative flex flex-col items-center">
        <span className="-mt-1 font-display text-[clamp(23px,7vw,28px)] leading-none lining-nums tabular-nums" style={{ color: CLAY }}>
          {unit.value}
        </span>
        <span className="mt-0.5 text-[12px] leading-none text-muted">{unit.label}</span>
      </div>
    </div>
  );
}

/** Тадбир на линии времени: светящаяся точка, время, название, место, карта */
function ProgramItem({ event }: { event: InvitationEventView }) {
  const { when } = event;
  return (
    <div>
      <span
        aria-hidden
        className="absolute top-[10px] left-0 h-6 w-6 rounded-full"
        style={{
          background: "radial-gradient(circle at 45% 40%, #FFF4CF 0%, #F6C064 40%, #D9782A 85%, #A9471B 100%)",
          boxShadow: "0 0 0 5px rgba(246,200,120,0.22), 0 0 18px 2px rgba(240,160,70,0.55)",
        }}
      />
      <p className="font-display text-[46px] leading-none lining-nums tabular-nums" style={AMBER_TEXT}>
        {t.date.clock(event.time)}
      </p>
      <p className="mt-2 text-[16px] text-muted">
        {t.weekdays[when.weekdayIndex]}, {when.day} {t.months[when.monthIndex]}
      </p>
      <h3 className="mt-3 font-display text-[28px] leading-tight" style={{ color: CLAY }}>
        {event.title}
      </h3>
      <p className="mt-2 text-[19px] leading-snug font-semibold text-ink">{event.venueName}</p>
      <p className="mt-1 text-[16px] leading-snug text-muted">{event.address}</p>
      <MapButton
        href={event.mapHref}
        className="mt-5 rounded-full bg-[#5B3220] px-6 py-3 text-[16px] text-[#FFF1DA] shadow-[0_12px_24px_-12px_rgba(91,50,32,0.9)] ring-1 ring-[#E3A857]/60"
        iconClassName="text-[#F6C77A]"
      />
    </div>
  );
}

/** Оқ фотиҳа: янтарная рамка, сверху — нон, как на дастурхоне */
function BlessingFrame({ text }: { text: string }) {
  return (
    <div
      className="relative mx-auto max-w-[360px] rounded-[30px] p-px"
      style={{ background: "linear-gradient(140deg, #94561A, #E9B867 30%, #FBE3B0 50%, #C9822C 75%, #94561A)" }}
    >
      <div className="relative rounded-[29px] px-6 pt-12 pb-10" style={{ background: MILK_LIGHT }}>
        <span aria-hidden className="pointer-events-none absolute inset-[7px] rounded-[23px] ring-1 ring-[#C9822C]/35" />
        <span
          aria-hidden
          className="absolute -top-8 left-1/2 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full"
          style={{ background: MILK_LIGHT, boxShadow: "0 0 0 1px rgba(201,130,44,0.5)" }}
        >
          <NonRosette className="h-12 w-12" />
        </span>
        <h2 className="font-display text-[32px] leading-tight" style={{ color: CLAY }}>
          {t.blessing.title}
        </h2>
        <p className="mt-4 text-[19px] leading-[1.7] italic" style={{ color: INK }}>
          {text}
        </p>
      </div>
    </div>
  );
}

/** Конец: тёплые слова, хозяева, и снова горячий нон с паром — тепло остаётся с гостем */
function Closing({ inv }: { inv: Invitation }) {
  return (
    <footer className="relative mt-16 overflow-hidden px-6 pb-[min(64vw,270px)] text-center">
      <div aria-hidden data-decor className="absolute inset-x-0 bottom-0 h-[min(86vw,360px)]">
        <PhotoBackdrop src={ART} color={MILK} fade="to-top" strength={0.9} opacity={0.82} position="40% 60%" />
      </div>
      <Steam className="absolute inset-x-[18%] bottom-[min(20vw,80px)] h-[min(46vw,190px)]" />

      <Reveal>
        <p className="mx-auto max-w-[330px] text-[19px] leading-[1.7] text-ink/90 italic">{t.heart.text[inv.occasion]}</p>
      </Reveal>
      <Reveal effect="spotlight">
        <div className="relative mt-12">
          <Glow className="absolute top-1/2 left-1/2 h-[220px] w-[360px] -translate-x-1/2 -translate-y-1/2" />
          <p className="relative text-[17px] text-muted italic">{t.hosts.respectDeep}:</p>
          <p className="relative mt-3 font-display text-[clamp(32px,9.6vw,40px)] leading-[1.15]" style={{ color: CLAY }}>
            {inv.data.hosts}
          </p>
          <Divider className="relative mt-6" />
        </div>
      </Reveal>
    </footer>
  );
}
