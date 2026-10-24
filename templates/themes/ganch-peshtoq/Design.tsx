"use client";

import { Fragment, type ReactNode } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("ganch-peshtoq");
import type { TemplateProps } from "../types";
import { useInvitation, type Invitation, type InvitationEventView } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Reveal } from "../../blocks/Reveal";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import { CarvedArch, GRAIN, GanchDefs, GirihPanel, KhatamMedallion, Kitoba, MuqarnasFrieze, PeshtoqArt, StarDot, peshtoqGeo, starPoints, useSize } from "./decor";
import { Cover, LightSweep } from "./Peshtoq";
import { melody } from "./melody";
import { PLASTER, fontClasses, vars } from "./style";

/**
 * №61 «Ганч пештоқ» — никоҳ тўйи, Анимацияли.
 * Белый резной ганч, как в залах Худоёрхона и бухарских мечетях: рельеф белым по белому,
 * муқарнас, гирих и ислими. Текст стоит внутри арок-ниш.
 */
export default function GanchPeshtoq({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody });
  const { main } = inv;

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="text-ink"
      backdropClassName="bg-[#E4DDD1]"
      pageColor={PLASTER}
      musicButtonClassName="rounded-full bg-[#FBF9F5]/92 text-[#6E5C47] shadow-[0_8px_22px_-8px_rgba(70,57,45,0.5),inset_0_-2px_3px_rgba(181,166,143,0.45),inset_0_2px_2px_#fff] ring-1 ring-[#CBBDA6] backdrop-blur"
    >
      <GanchDefs />
      <div className="relative" style={{ background: PLASTER }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]" style={{ backgroundImage: GRAIN }} />

        <Cover inv={inv} />

        <main className="relative px-6 pb-20">
          {/* Текст приглашения */}
          <section className="pt-14 text-center">
            <Reveal>
              {inv.text.greeting && (
                <p className="font-display text-[30px] leading-tight font-medium">{inv.text.greeting}</p>
              )}
              <p className="mx-auto mt-5 max-w-[32ch] text-[18px] leading-[1.75] text-ink/85">{inv.text.body}</p>
            </Reveal>
          </section>

          {inv.sides && (
            <Reveal effect="fade" className="mt-10">
              <Sides sides={inv.sides} />
            </Reveal>
          )}

          <Reveal effect="fade" className="mt-14">
            <MuqarnasFrieze />
          </Reveal>

          {/* Тўй санаси */}
          <Section title={t.date.title[inv.occasion]}>
            <Reveal effect="spotlight">
              <DateMedallion event={main} />
            </Reveal>
          </Section>

          {/* Календарь */}
          <Reveal effect="fade" className="mt-10">
            <GirihPanel className="mx-auto max-w-[340px]">
              <div className="px-7 pt-8 pb-6 text-center">
                <Calendar
                  date={main.when}
                  marker="star"
                  markerClassName="[&_path]:[fill:url(#gp-gold)] drop-shadow-[0_2px_3px_rgba(140,106,44,0.35)]"
                  markedDayClassName="text-[#FBF9F5]"
                  weekendClassName="text-ink"
                />
              </div>
            </GirihPanel>
          </Reveal>

          {/* Таймер: четыре маленькие ниши */}
          <Section title={t.countdown.title[inv.occasion]}>
            <Reveal>
              <Countdown
                startsAt={main.when.startsAt}
                look={{
                  grid: "mx-auto grid max-w-[340px] grid-cols-4 gap-2",
                  today: "gold-text font-display text-[34px] font-semibold",
                  renderUnit: (u) => (
                    <CarvedArch head={0.6} padTop="52%" className="pb-4">
                      <div className="flex flex-col items-center">
                        <span className="gold-text font-display text-[34px] leading-none font-semibold lining-nums tabular-nums">
                          {u.value}
                        </span>
                        <span className="mt-1.5 text-[14px] text-muted">{u.label}</span>
                      </div>
                    </CarvedArch>
                  ),
                }}
              />
            </Reveal>
          </Section>

          <Reveal effect="fade" className="mt-16">
            <MuqarnasFrieze />
          </Reveal>

          {/* Тўй дастури: каждый тадбир — в своей нише, по порядку времени */}
          <Section title={t.venue.programTitle}>
            {inv.program.map((ev, i) => (
              <Fragment key={i}>
                {i > 0 && <Link />}
                <Reveal delay={0.05}>
                  <EventNiche event={ev} />
                </Reveal>
              </Fragment>
            ))}
          </Section>

          {/* Чин юракдан */}
          <Section title={t.heart.title}>
            <Reveal>
              <p className="mx-auto max-w-[30ch] text-[19px] leading-[1.7] text-ink/85 italic">{t.heart.text[inv.occasion]}</p>
            </Reveal>
          </Section>

          {/* Оқ фотиҳа — в резном картуше-китоба */}
          <Section title={t.blessing.title}>
            <Reveal effect="unroll">
              <Kitoba className="mx-auto max-w-[360px]">
                <p className="px-11 py-9 text-[19px] leading-[1.6] text-ink/90 italic">{inv.blessing}</p>
              </Kitoba>
            </Reveal>
          </Section>

          {/* Хозяева: финальный пештоқ */}
          <Reveal effect="spotlight" className="mt-16">
            <FinalPeshtoq inv={inv} />
          </Reveal>
        </main>
      </div>
    </InvitationShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-14 text-center">
      <Reveal effect="fade">
        <h2 className="mb-8 font-display text-[32px] leading-tight font-medium">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}

/** Кегль по самому длинному слову, чтобы фамилия встала в узкую нишу */
const fitWord = (text: string, k: number, min: number, max: number) => {
  const longest = Math.max(4, ...text.split(/\s+/).map((s) => s.length));
  return `clamp(${min}px, calc(100cqw / ${(longest * k).toFixed(2)}), ${max}px)`;
};

/** Куёв томони / Келин томони — две ниши рядом, как парные двери */
function Sides({ sides }: { sides: NonNullable<Invitation["sides"]> }) {
  const items = [
    [t.sides.groom, sides.groom],
    [t.sides.bride, sides.bride],
  ].filter(([, v]) => v) as [string, string][];
  // Длинные фамилии (больше 12 букв) в узкие парные ниши не влезают — тогда ниши одна под другой
  const longest = Math.max(...items.map(([, v]) => Math.max(...v.split(/\s+/).map((x) => x.length))));
  const pair = items.length > 1 && longest <= 12;
  return (
    <div className={`mx-auto grid gap-3 ${pair ? "max-w-[340px] grid-cols-2" : "max-w-[250px] grid-cols-1 gap-5"}`}>
      {items.map(([label, family]) => (
        <CarvedArch key={label} head={pair ? 0.55 : 0.4} muq={0.42} padTop={pair ? "44%" : "32%"} className="pb-6">
          <div className="px-3.5 text-center @container">
            <p className="text-[16px] text-muted italic">{label}</p>
            <p className="mt-2 font-display leading-[1.15] font-medium" style={{ fontSize: fitWord(family, 0.58, 16, 24) }}>
              {family}
            </p>
          </div>
        </CarvedArch>
      ))}
    </div>
  );
}

/** «Тўй санаси»: день недели, число в звезде-ҳотам, месяц, год, время */
function DateMedallion({ event }: { event: InvitationEventView }) {
  const { when } = event;
  return (
    <div className="flex flex-col items-center">
      <p className="text-[19px] text-muted italic">{t.weekdays[when.weekdayIndex]}</p>
      <div className="relative mt-3 h-[208px] w-[208px]">
        <KhatamMedallion className="absolute inset-0 h-full w-full" />
        <span className="gold-text absolute inset-0 flex items-center justify-center pb-1 font-display text-[80px] leading-none font-semibold lining-nums tabular-nums">
          {when.day}
        </span>
      </div>
      <p className="mt-4 font-display text-[32px] leading-none font-medium">{t.months[when.monthIndex]}</p>
      <p className="mt-2 text-[18px] text-muted lining-nums tabular-nums">
        {when.year} {t.date.year}
      </p>
      <p className="mt-4 font-display text-[26px] leading-none font-medium lining-nums tabular-nums">{t.date.at(event.time)}</p>
    </div>
  );
}

/** Связка между нишами дастура: золотая нить со звёздочкой */
function Link() {
  return (
    <div aria-hidden className="flex flex-col items-center py-1.5">
      <span className="gold-fill h-7 w-px" />
      <StarDot className="my-1 h-4 w-4" />
      <span className="gold-fill h-7 w-px" />
    </div>
  );
}

/** Карта: гипсовая кнопка-валик в золотой обводке */
function GoldMap({ href }: { href: string }) {
  return (
    <span className="gold-fill mt-6 inline-flex rounded-full p-[1.5px] shadow-[0_12px_24px_-12px_rgba(70,57,45,0.65)]">
      <MapButton
        href={href}
        className="rounded-full bg-[linear-gradient(180deg,#FFFDF9,#EFE8DC)] px-7 py-3.5 text-[16px] text-[#46392D] shadow-[inset_0_1px_0_#fff,inset_0_-2px_4px_rgba(181,166,143,0.35)]"
        iconClassName="text-[#6E5C47]"
      />
    </span>
  );
}

function EventNiche({ event }: { event: InvitationEventView }) {
  const { when } = event;
  return (
    <CarvedArch head={0.42} muq={0.55} padTop="31%" className="mx-auto max-w-[360px] pb-9">
      <div className="px-6 text-center">
        <h3 className="font-display text-[29px] leading-tight font-medium">{event.title}</h3>
        <p className="gold-text mt-3 font-display text-[56px] leading-none font-semibold lining-nums tabular-nums">
          {t.date.clock(event.time)}
        </p>
        <p className="mt-2 text-[17px] text-muted">
          {when.day} {t.months[when.monthIndex]}, {t.weekdays[when.weekdayIndex]}
        </p>
        <svg aria-hidden viewBox="0 0 120 12" className="mx-auto my-5 h-3 w-28">
          <line x1="0" y1="6" x2="48" y2="6" stroke="url(#gp-gold)" strokeWidth="1" />
          <polygon points={starPoints(60, 6, 5.5, 0.62)} fill="url(#gp-gold)" />
          <line x1="72" y1="6" x2="120" y2="6" stroke="url(#gp-gold)" strokeWidth="1" />
        </svg>
        <p className="text-[21px] leading-snug font-semibold">{event.venueName}</p>
        <p className="mt-1 text-[16px] text-muted">{event.address}</p>
        <GoldMap href={event.mapHref} />
      </div>
    </CarvedArch>
  );
}

/** Финал: малый пештоқ, в проёме — хозяева */
function FinalPeshtoq({ inv }: { inv: Invitation }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const g = peshtoqGeo(w || 327, h || 520, { margin: 0, pier: 16, top: 16, headK: 0.62, headMax: 10, muq: 0.6 });
  return (
    <div ref={ref} className="relative mx-auto max-w-[380px] overflow-hidden">
      {w > 0 && <PeshtoqArt g={g} idp="gpf" />}
      {inv.opened && <LightSweep />}
      <div className="relative text-center" style={{ paddingTop: g.mqEnd + 22, paddingLeft: g.arch.L + 10, paddingRight: w ? w - g.arch.R + 10 : 56, paddingBottom: 44 }}>
        <p className="text-[18px] text-muted italic">{t.hosts.respectDeep}:</p>
        <div className="@container">
          <p className="gold-text mt-3 font-display leading-[1.15] font-semibold" style={{ fontSize: fitWord(inv.data.hosts, 0.64, 18, 30) }}>
            {inv.data.hosts}
          </p>
        </div>
        <svg aria-hidden viewBox="0 0 20 20" className="mx-auto my-6 h-4 w-4">
          <polygon points={starPoints(10, 10, 9.5, 0.62)} fill="url(#gp-gold)" />
        </svg>
        <p className="font-display text-[25px] leading-snug font-medium">{t.hosts.thanks}</p>
      </div>
    </div>
  );
}
