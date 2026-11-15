"use client";
import localFont from "next/font/local";
import { designVars, type TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import { Calendar } from "../../blocks/Calendar";
import { designTexts } from "@/texts/uz-cyrl";
const font = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/Lora-Regular.woff2" },
    { path: "../../../assets/fonts/web/Lora-Italic.woff2", style: "italic" },
  ],
  variable: "--ms-font",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#59654d",
    primaryDark: "#48523e",
    gold: "#a38d68",
    goldLight: "#e7d7b9",
    paper: "#f9f5e9",
    ink: "#4b5042",
    muted: "#636a57",
  },
  { display: "var(--ms-font)", accent: "var(--ms-font)", body: "var(--ms-font)" },
);
const t = designTexts("minor-satr");
/** A quiet brick tower and a long architectural register. No opening gate or portal. */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { opening: false }),
    names = useFitWords<HTMLHeadingElement>(44),
    hosts = useFitWords<HTMLParagraphElement>(25),
    groom = useFitWords<HTMLParagraphElement>(24),
    bride = useFitWords<HTMLParagraphElement>(24);
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#dedfcd]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <header className="px-7 pt-8 pb-10">
        <div className="flex items-start gap-5">
          <Tower />
          <div className="min-w-0 flex-1 border-t border-gold/60 pt-5">
            <p className="text-[12px] uppercase tracking-[.17em] text-muted">{t.opening.invitation}</p>
            <p className="mt-8 text-[27px] italic leading-snug text-primary">{t.occasionTitles[inv.occasion]}</p>
            <p className="mt-5 text-[16px] text-muted">
              {t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}
            </p>
          </div>
        </div>
        <h1 ref={names} className="mt-6 w-full leading-tight [--fit:44px]">
          <span className="block text-[length:var(--fit)]">
            <Words text={data.groom ?? ""} />
          </span>
          <span className="my-4 block text-[22px] italic text-primary">{t.cover.andWord}</span>
          <span className="block text-[length:var(--fit)]">
            <Words text={data.bride ?? ""} />
          </span>
        </h1>
      </header>
      <main className="mx-4 border-l border-gold/45 pb-20 pl-5 pr-3">
        <Reveal className="border-y border-gold/40 py-8">
          <h2 className="text-[28px] italic leading-snug">{inv.text.greeting}</h2>
          <p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p>
        </Reveal>
        {inv.sides && (
          <section className="space-y-7 py-10">
            <div>
              <p className="text-[14px] text-muted">{t.sides.groom}</p>
              <p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]">
                <span className="text-[length:var(--fit)]">
                  <Words text={inv.sides.groom ?? ""} />
                </span>
              </p>
            </div>
            <div>
              <p className="text-[14px] text-muted">{t.sides.bride}</p>
              <p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]">
                <span className="text-[length:var(--fit)]">
                  <Words text={inv.sides.bride ?? ""} />
                </span>
              </p>
            </div>
          </section>
        )}
        <Reveal className="bg-[#e9ecdc] px-3 py-8">
          <p className="mb-6 text-[25px] text-primary">{t.date.title[inv.occasion]}</p>
          <Calendar
            date={inv.main.when}
            marker="circle"
            markerClassName="text-primary"
            markedDayClassName="text-paper"
          />
        </Reveal>
        <section className="pt-11">
          <h2 className="mb-8 text-[30px] leading-snug text-primary">{t.venue.programTitle}</h2>
          {inv.program.map((e, i) => (
            <Reveal key={i} className="mb-10">
              <div data-event className="border-t border-gold/50 pt-5">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="mt-1 text-[13px] text-muted">
                    0{i + 1}
                  </span>
                  <h3 className="text-[25px] leading-snug">{e.title}</h3>
                </div>
                <p className="mt-4 text-[15px] text-muted">{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
                <p className="mt-2 text-[33px] text-primary">{t.date.clock(e.time)}</p>
                <p className="mt-5 text-[21px] leading-snug">{e.venueName}</p>
                <p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
                <MapButton
                  href={e.mapHref}
                  className="mt-5 border-b border-primary/50 pb-2 text-primary"
                  iconClassName="text-primary"
                />
              </div>
            </Reveal>
          ))}
        </section>
        <Reveal className="border-y border-gold/40 py-8">
          <p className="text-[23px] italic leading-[1.8]">{inv.blessing}</p>
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
function Tower() {
  return (
    <svg data-decor aria-hidden="true" viewBox="0 0 100 255" className="h-[240px] w-[94px] shrink-0" fill="none">
      <path d="M15 241h70M24 236l13-159h26l13 159Z" fill="#d7c4a0" stroke="#ad9672" />
      <path d="M32 77h36V61H32ZM29 61h42V50H29ZM35 50V37Q50 12 65 37V50Z" fill="#b4ba9b" stroke="#899373" />
      <path
        d="M50 17V5M39 60v16M50 60v16M61 60v16M34 112H66M32 138H68M30 164H70M28 190H72M26 216H74"
        stroke="#a58d68"
        strokeWidth="1"
      />
      <path
        d="m34 123 7-7 9 7 9-7 7 7M30 175l10-7 10 7 10-7 10 7M26 227l12-7 12 7 12-7 12 7"
        stroke="#f4ead4"
        strokeWidth="2"
      />
      <path d="M44 226v-26q6-10 12 0v26" stroke="#947f5e" />
      <path d="M8 246H92" stroke="#a58d68" />
    </svg>
  );
}
