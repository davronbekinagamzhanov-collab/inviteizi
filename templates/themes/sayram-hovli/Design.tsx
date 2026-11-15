"use client";

import localFont from "next/font/local";
import { designVars, type TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { MapButton } from "../../blocks/MapButton";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { Reveal } from "../../blocks/Reveal";
import { designTexts } from "@/texts/uz-cyrl";

const font = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/Lora-Regular.woff2", style: "normal" },
    { path: "../../../assets/fonts/web/Lora-Italic.woff2", style: "italic" },
  ],
  variable: "--sh-type",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#58786d",
    primaryDark: "#35594f",
    gold: "#bb976e",
    goldLight: "#e3cba9",
    paper: "#fbf8ee",
    ink: "#3e5049",
    muted: "#7d8980",
  },
  { display: "var(--sh-type)", accent: "var(--sh-type)", body: "var(--sh-type)" },
);
const t = designTexts("sayram-hovli");

/** An open courtyard story: scene, family letter, calendar, a path through the day's events. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { opening: false }),
    name = useFitWords<HTMLHeadingElement>(47),
    when = inv.main.when;
  const hosts = useFitWords<HTMLParagraphElement>(27);
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#e3e8df]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <header className="pt-9 text-center">
        <p className="px-7 text-[12px] tracking-[.26em] uppercase text-muted">{t.opening.invitation}</p>
        <p className="mt-7 px-7 text-[18px] italic text-muted">
          {t.relationWord(data.relation ?? "ogil", data.person)}
        </p>
        <h1 ref={name} className="mx-auto mt-3 w-[calc(100%-48px)] leading-tight [--fit:47px]">
          <span className="text-[length:var(--fit)]">
            <Words text={data.person ?? ""} />
          </span>
        </h1>
        <p className="mt-4 px-7 text-[25px] text-primary">{t.occasionTitles[inv.occasion]}</p>
        <Courtyard />
        <div className="relative mx-7 -mt-5 border-y border-gold/40 bg-paper py-5">
          <p className="text-[22px]">{t.date.long(when.day, when.monthIndex, when.year)}</p>
          <p className="mt-2 text-[17px] italic text-muted">{t.weekdays[when.weekdayIndex]}</p>
        </div>
      </header>
      <main>
        <Reveal className="px-8 py-12">
          <p className="font-display text-[29px] italic leading-snug text-primary">{inv.text.greeting}</p>
          <p className="mt-6 text-[20px] leading-[1.85]">{inv.text.body}</p>
        </Reveal>
        <section className="mx-5 border-t border-gold/40 bg-[#eef1e7] px-5 pt-8 pb-9">
          <Reveal>
            <h2 className="mb-7 text-center text-[27px] text-primary">{t.date.title[inv.occasion]}</h2>
            <Calendar date={when} marker="star" markerClassName="text-primary" />
          </Reveal>
          <Reveal className="mt-8 border-t border-primary/15 pt-7 text-center">
            <p className="text-[17px] italic text-muted">{t.countdown.title[inv.occasion]}</p>
            <Countdown
              startsAt={when.startsAt}
              look={{
                grid: "mt-5 grid grid-cols-4 gap-1",
                box: "flex min-w-0 flex-col items-center",
                number: "text-[30px] text-primary",
                label: "mt-1 text-[12px] text-muted",
                today: "text-[26px] text-primary",
              }}
            />
          </Reveal>
        </section>
        <section className="px-7 py-14">
          <Reveal>
            <p aria-hidden className="mb-4 text-[33px] text-gold">
              ✧
            </p>
            <h2 className="text-[32px] leading-tight">{t.venue.programTitle}</h2>
          </Reveal>
          <div className="mt-9 border-l border-gold/60">
            {inv.program.map((e, i) => (
              <Reveal key={i} className="relative pl-7 pb-12 last:pb-0">
                <div data-event>
                  <span
                    aria-hidden
                    className="absolute -left-[6px] top-[10px] h-[11px] w-[11px] rotate-45 border border-gold bg-paper"
                  />
                  <p className="text-[15px] text-muted">{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
                  <p className="mt-2 text-[42px] leading-none text-primary">{t.date.clock(e.time)}</p>
                  <h3 className="mt-4 text-[25px] leading-snug">{e.title}</h3>
                  <div className="mt-5 border-l-2 border-primary/25 pl-4">
                    <p className="text-[21px] leading-snug">{e.venueName}</p>
                    <p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
                  </div>
                  <MapButton
                    href={e.mapHref}
                    className="mt-6 rounded-full border border-primary/35 bg-[#edf1e8] px-5 py-3 text-primary"
                    iconClassName="text-primary"
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </section>
        <Reveal className="mx-5 mb-8 rounded-t-[100px] border border-gold/35 bg-[#f2eadb] px-6 pt-12 pb-20 text-center">
          <p className="text-[15px] tracking-[.12em] text-muted">{t.blessing.title}</p>
          <p className="mt-6 text-[23px] italic leading-[1.7]">{inv.blessing}</p>
          <div aria-hidden className="mx-auto my-8 h-10 w-px bg-gold/60" />
          <p className="text-[16px] text-muted">{t.hosts.respectDeep}</p>
          <p ref={hosts} className="mt-4  leading-snug text-primary w-full [--fit:27px]">
            <span className="text-[length:var(--fit)]">
              <Words text={data.hosts} />
            </span>
          </p>
          <p className="mt-6 text-[17px] italic">{t.hosts.thanks}</p>
        </Reveal>
      </main>
    </InvitationShell>
  );
}

function Courtyard() {
  return (
    <svg data-decor aria-hidden="true" viewBox="0 0 430 340" className="mt-5 w-full" fill="none">
      <path d="M0 270V115Q100 60 215 75Q330 60 430 115V300Z" fill="#e9e9da" />
      <path d="M95 285V143Q95 81 215 45Q335 81 335 143V285Z" fill="#dfd7bd" stroke="#b3af8c" strokeWidth="1.2" />
      <path d="M125 282V150Q125 104 215 74Q305 104 305 150V282Z" fill="#f8f4e4" stroke="#c0b391" strokeWidth="1.5" />
      <path d="M160 283V175Q160 140 215 119Q270 140 270 175V283" fill="#d2ded0" />
      <path d="M192 283V203Q192 182 215 172Q238 182 238 203V283" fill="#eee6cc" />
      <path d="M0 272Q120 244 215 277Q310 244 430 272V340H0Z" fill="#f4efe0" />
      <path d="M168 338 203 277h24l35 61" fill="#e2d6b8" />
      <path d="m173 331 84 0M184 312h60M195 291h38" stroke="#c2b48c" strokeWidth=".9" />
      {[false, true].map((right) => (
        <g key={String(right)} transform={right ? "translate(430 0) scale(-1 1)" : undefined}>
          <path d="M47 282V122M49 195l-18-29M47 177l23-33" stroke="#8a9577" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="47" cy="147" rx="26" ry="65" fill="#a2b194" />
          <ellipse cx="40" cy="124" rx="19" ry="44" fill="#b9c2a1" />
          <path d="M74 279v-42q18-11 34 0v42Z" fill="#c5a082" />
          <ellipse cx="91" cy="236" rx="24" ry="9" fill="#d8b89a" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M91 237q${(i - 2) * 14} -${55 - Math.abs(i - 2) * 6} ${(i - 2) * 17} -${37 - Math.abs(i - 2) * 4}`}
              stroke={i % 2 ? "#a5b08b" : "#7e9c7f"}
              strokeWidth="7"
              strokeLinecap="round"
            />
          ))}
          <path d="M105 149h15M105 156h15M107 162h12" stroke="#b8a379" strokeWidth="1" />
        </g>
      ))}
      <path d="M0 327Q215 295 430 327V340H0Z" fill="#fbf8ee" />
    </svg>
  );
}
