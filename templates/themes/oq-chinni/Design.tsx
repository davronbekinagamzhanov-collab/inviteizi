"use client";

import localFont from "next/font/local";
import { designVars, type TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { MapButton } from "../../blocks/MapButton";
import { designTexts } from "@/texts/uz-cyrl";

const font = localFont({
  preload: false,
  src: "../../../assets/fonts/web/PTSerif-Regular.woff2",
  variable: "--oc-type",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#315c81",
    primaryDark: "#264765",
    gold: "#b19b70",
    goldLight: "#e1d0aa",
    paper: "#fcf9ef",
    ink: "#344655",
    muted: "#6b797c",
  },
  { display: "var(--oc-type)", accent: "var(--oc-type)", body: "var(--oc-type)" },
);
const t = designTexts("oq-chinni");

/** A compact morning note, not a multi-section landing page. Every supplied event remains visible. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { opening: false }),
    name = useFitWords<HTMLHeadingElement>(36),
    when = inv.main.when;
  const hosts = useFitWords<HTMLParagraphElement>(18);
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#e4e8e4]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <main className="mx-4 my-5 border-x border-primary/20 px-5 pb-16 text-center">
        <div aria-hidden className="h-2 border-y border-primary/50 bg-[#d9e3e7]" />
        <p className="pt-5 text-[12px] tracking-[.22em] text-primary uppercase">{t.opening.invitation}</p>
        <Piyola />
        <h2 className="-mt-1 text-[26px] text-primary">{t.occasionTitles[inv.occasion]}</h2>
        <h1 ref={name} className="mt-3 w-full leading-tight [--fit:36px]">
          <span className="text-[length:var(--fit)]">
            <Words text={data.person ?? ""} />
          </span>
        </h1>
        <p className="mt-2 text-[16px] italic leading-relaxed text-muted">{t.causeLine(data)}</p>
        <div className="mx-auto my-5 flex w-fit max-w-full items-center gap-4 border-y border-gold/50 px-3 py-2">
          <span className="text-[42px] leading-none text-primary">{when.day}</span>
          <p className="text-left text-[15px] leading-relaxed">
            {t.months[when.monthIndex]} {when.year}
            <br />
            {t.weekdays[when.weekdayIndex]}
          </p>
        </div>
        <p className="text-[18px] italic">{inv.text.greeting}</p>
        <p className="mt-2 text-[16px] leading-[1.65]">{inv.text.body}</p>
        <div className="mt-4 text-left">
          {inv.program.map((e, i) => (
            <div data-event key={i} className="border-t border-primary/20 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[17px] text-primary">{e.title}</p>
                <p className="text-[19px]">{t.date.clock(e.time)}</p>
              </div>
              <p className="mt-1 text-[14px] text-muted">{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
              <p className="mt-2 text-[17px]">{e.venueName}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">{e.address}</p>
              <MapButton
                href={e.mapHref}
                className="mt-3 border-b border-primary/40 pb-1 text-primary"
                iconClassName="text-primary"
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px] italic text-muted">{t.hosts.respectDeep}</p>
        <p ref={hosts} className="mt-2  leading-snug w-full [--fit:18px]">
          <span className="text-[length:var(--fit)]">
            <Words text={data.hosts} />
          </span>
        </p>
        <div aria-hidden className="mx-auto mt-5 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-1 rotate-45 bg-primary/60" />
          ))}
        </div>
      </main>
    </InvitationShell>
  );
}

/** Original native porcelain illustration; no embedded text, raster photograph or filter. */
function Piyola() {
  return (
    <svg
      data-decor
      aria-hidden="true"
      viewBox="0 0 320 160"
      className="mx-auto h-[150px] w-full max-w-[300px]"
      fill="none"
    >
      <ellipse cx="160" cy="133" rx="106" ry="7" fill="#d5dcd5" opacity=".6" />
      <path d="M57 79Q65 135 160 138Q255 135 263 79Z" fill="#f0f4ec" stroke="#527d99" strokeWidth="1.5" />
      <ellipse cx="160" cy="79" rx="103" ry="20" fill="#fffdf7" stroke="#527d99" strokeWidth="1.5" />
      <ellipse cx="160" cy="80" rx="88" ry="13" fill="#d1a56f" opacity=".6" />
      <path d="M73 103Q160 153 247 103M80 116Q160 153 240 116" stroke="#527d99" strokeWidth="1.4" />
      {[105, 160, 215].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i === 1 ? 115 : 103})`} stroke="#315c81" strokeWidth="1.2">
          <path d="M0-11C-15-15-15-1 0 9C15-1 15-15 0-11ZM0-11V9M-9-5 0 2 9-5" />
          <circle cy="-15" r="2" fill="#b19b70" stroke="none" />
        </g>
      ))}
      <path
        d="M141 58c-14-12 14-20 0-33M163 55c-14-13 15-22 1-37M185 59c-13-12 14-19 1-31"
        stroke="#aabfc4"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path d="M32 138h256" stroke="#b19b70" strokeWidth=".8" />
    </svg>
  );
}
