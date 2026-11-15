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
  src: "../../../assets/fonts/web/Lora-Regular.woff2",
  variable: "--mk-font",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#8d664c",
    primaryDark: "#654731",
    gold: "#b49a76",
    goldLight: "#e7d8bd",
    paper: "#fbf7ee",
    ink: "#514b40",
    muted: "#6c6556",
  },
  { display: "var(--mk-font)", accent: "var(--mk-font)", body: "var(--mk-font)" },
);
const t = designTexts("mis-kafgir");

/** A single pierced copper skimmer, rice-like perforations and morning typography. No platter or cauldron. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { opening: false }),
    name = useFitWords<HTMLHeadingElement>(33),
    hosts = useFitWords<HTMLParagraphElement>(19);
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#e3dfd3]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <main className="px-7 pt-8 pb-20">
        <p className="text-[11px] tracking-[.2em] uppercase text-muted">{t.opening.invitation}</p>
        <div className="mt-5 grid grid-cols-[70px_minmax(0,1fr)] items-center gap-5">
          <Skimmer />
          <div>
            <p className="text-[35px] leading-[1.15] text-primary">{t.occasionTitles[inv.occasion]}</p>
            <p className="mt-3 text-[17px] text-muted">
              {t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}
            </p>
          </div>
        </div>
        <h1 ref={name} className="mt-5 w-full leading-snug [--fit:33px]">
          <span className="text-[length:var(--fit)]">
            <Words text={data.person ?? ""} />
          </span>
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{t.causeLine(data)}</p>
        <div className="mt-5 border-t border-gold/45 pt-5">
          <p className="text-[18px]">{inv.text.greeting}</p>
          <p className="mt-3 text-[16px] leading-[1.8]">{inv.text.body}</p>
        </div>
        <div className="mt-5">
          {inv.program.map((e, i) => (
            <div data-event key={i} className="mb-5 border-l border-gold/60 pl-4">
              <p className="text-[14px] text-muted">{e.title}</p>
              <p className="mt-2 text-[30px] leading-none text-primary">{t.date.clock(e.time)}</p>
              <p className="mt-3 text-[14px] text-muted">{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
              <p className="mt-3 text-[18px]">{e.venueName}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">{e.address}</p>
              <MapButton
                href={e.mapHref}
                className="mt-3 border-b border-primary/50 pb-1 text-primary"
                iconClassName="text-primary"
              />
            </div>
          ))}
        </div>
        <p className="mt-6 text-[14px] italic text-muted">{t.hosts.respectDeep}</p>
        <p ref={hosts} className="mt-2 w-full leading-relaxed [--fit:19px]">
          <span className="text-[length:var(--fit)]">
            <Words text={data.hosts} />
          </span>
        </p>
      </main>
    </InvitationShell>
  );
}
function Skimmer() {
  return (
    <svg data-decor aria-hidden="true" viewBox="0 0 80 225" className="h-[215px] w-[70px]" fill="none">
      <path d="M36 93 32 12q0-7 8-7t8 7l-4 81" fill="#c29b7c" stroke="#95694b" />
      <path d="M40 19v61" stroke="#f7e4c9" strokeWidth="2" />
      <ellipse cx="40" cy="142" rx="35" ry="52" fill="#c7a07c" stroke="#95694b" strokeWidth="1.4" />
      <ellipse cx="40" cy="142" rx="30" ry="47" stroke="#f5e2c3" />
      {[0, 1, 2, 3, 4, 5, 6].map((row) =>
        [0, 1, 2].map((col) => (
          <ellipse
            key={`${row}-${col}`}
            cx={24 + col * 16}
            cy={109 + row * 11}
            rx="2"
            ry="3"
            fill="#fbf7ee"
            transform={`rotate(-25 ${24 + col * 16} ${109 + row * 11})`}
          />
        )),
      )}
      <path d="M17 204q18 8 45 0" stroke="#c2b195" />
      <path d="M28 212h25" stroke="#c2b195" />
    </svg>
  );
}
