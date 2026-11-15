"use client";
import localFont from "next/font/local";
import { designVars, type TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { Reveal } from "../../blocks/Reveal";
import { MapButton } from "../../blocks/MapButton";
import { Calendar } from "../../blocks/Calendar";
import { designTexts } from "@/texts/uz-cyrl";
const font = localFont({
  preload: false,
  src: "../../../assets/fonts/web/PTSerif-Regular.woff2",
  variable: "--tq-font",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#6b5b3c",
    primaryDark: "#4e422c",
    gold: "#aa9975",
    goldLight: "#e4d6b5",
    paper: "#fbf7ed",
    ink: "#514a39",
    muted: "#6c624c",
  },
  { display: "var(--tq-font)", accent: "var(--tq-font)", body: "var(--tq-font)" },
);
const t = designTexts("tut-qogozi");
/** Deckled mulberry paper, quiet fibres and inset text. An artisan sheet, not an opening book. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { opening: false }),
    names = useFitWords<HTMLHeadingElement>(45),
    hosts = useFitWords<HTMLParagraphElement>(25),
    groom = useFitWords<HTMLParagraphElement>(24),
    bride = useFitWords<HTMLParagraphElement>(24);
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#ded4bb]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <header className="relative px-8 pt-10 pb-11">
        <Paper />
        <div className="relative">
          <p className="text-[12px] tracking-[.2em] uppercase text-muted">{t.opening.invitation}</p>
          <p className="mt-8 text-[20px] text-primary">{t.occasionTitles[inv.occasion]}</p>
          <h1 ref={names} className="mt-6 w-full leading-tight [--fit:45px]">
            <span className="block text-[length:var(--fit)]">
              <Words text={data.groom ?? ""} />
            </span>
            <span className="my-4 block text-[22px] text-muted">{t.cover.andWord}</span>
            <span className="block text-[length:var(--fit)]">
              <Words text={data.bride ?? ""} />
            </span>
          </h1>
          <p className="mt-8 text-[19px] text-primary">
            {t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}
          </p>
        </div>
      </header>
      <main className="px-7 pb-24">
        <Reveal className="border-l border-gold/60 py-3 pl-5">
          <h2 className="text-[29px] leading-snug">{inv.text.greeting}</h2>
          <p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p>
        </Reveal>
        {inv.sides && (
          <section className="my-10 border-y border-gold/45 py-8">
            <p className="text-[14px] text-muted">{t.sides.groom}</p>
            <p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]">
              <span className="text-[length:var(--fit)]">
                <Words text={inv.sides.groom ?? ""} />
              </span>
            </p>
            <div aria-hidden className="my-7 h-px w-10 bg-gold/60" />
            <p className="text-[14px] text-muted">{t.sides.bride}</p>
            <p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]">
              <span className="text-[length:var(--fit)]">
                <Words text={inv.sides.bride ?? ""} />
              </span>
            </p>
          </section>
        )}
        <Reveal className="bg-[#f0e8d4] px-3 py-8">
          <p className="mb-6 text-[26px] text-primary">{t.date.title[inv.occasion]}</p>
          <Calendar
            date={inv.main.when}
            marker="circle"
            markerClassName="text-primary"
            markedDayClassName="text-paper"
          />
        </Reveal>
        <section className="pt-11">
          <h2 className="mb-8 text-[30px] text-primary">{t.venue.programTitle}</h2>
          {inv.program.map((e, i) => (
            <Reveal key={i} className="mb-9">
              <div data-event className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-t border-gold/45 pt-6">
                <span aria-hidden className="pt-1 text-[14px] text-muted">
                  {i + 1}.
                </span>
                <div>
                  <p className="text-[15px] text-muted">{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
                  <p className="mt-3 text-[33px] text-primary">{t.date.clock(e.time)}</p>
                  <h3 className="mt-3 text-[24px] leading-snug">{e.title}</h3>
                  <p className="mt-5 text-[21px] leading-snug">{e.venueName}</p>
                  <p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
                  <MapButton
                    href={e.mapHref}
                    className="mt-5 border-b border-primary/50 pb-2 text-primary"
                    iconClassName="text-primary"
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </section>
        <Reveal className="border-y border-gold/45 py-8">
          <p className="text-[24px] leading-[1.8]">{inv.blessing}</p>
          <p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p>
          <p ref={hosts} className="mt-3 w-full leading-snug [--fit:25px]">
            <span className="text-[length:var(--fit)]">
              <Words text={data.hosts} />
            </span>
          </p>
          <p className="mt-6 text-[18px] text-primary">{t.hosts.waiting}</p>
        </Reveal>
      </main>
    </InvitationShell>
  );
}
function Paper() {
  return (
    <svg
      data-decor
      aria-hidden="true"
      viewBox="0 0 320 410"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
    >
      <path
        d="m12 8 48 2 30-4 52 3 43-2 57 3 34-3 29 5-2 46 4 37-3 42 3 48-4 35 4 54-3 49 2 39-4 39-48-2-43 4-45-3-57 3-41-4-55 2 3-49-4-45 3-41-2-50 3-41-3-36 3-55Z"
        fill="#f1e8d3"
        stroke="#d9c9a4"
      />
      <g stroke="#c8b896" strokeWidth=".7" opacity=".75">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <path key={i} d={`M${17 + i * 27} ${19 + (i % 3) * 9}l9 4m-3 ${337 - (i % 4) * 8} 12-4`} />
        ))}
        <path d="m22 88 6 22m-5 73 4 17m-2 84 5 19m265-229-3 25m1 92 3 17m-2 83-4 20" />
      </g>
      <path d="M235 34q-12 28 5 46q35-13 26-43q-22 6-31-3Z" stroke="#b8b28e" strokeWidth="1" />
      <path d="m240 80 14-33m-9 20-9-8m15 1 10-7" stroke="#b8b28e" strokeWidth=".8" />
    </svg>
  );
}
