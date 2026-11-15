"use client";
import localFont from "next/font/local";
import { designVars, type TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { MapButton } from "../../blocks/MapButton";
import { Calendar } from "../../blocks/Calendar";
import { Countdown } from "../../blocks/Countdown";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { Reveal } from "../../blocks/Reveal";
import { designTexts } from "@/texts/uz-cyrl";
const font = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/Lora-Regular.woff2", style: "normal" },
    { path: "../../../assets/fonts/web/Lora-Italic.woff2", style: "italic" },
  ],
  variable: "--gs-font",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#9b695d",
    primaryDark: "#785347",
    gold: "#bd9d6e",
    goldLight: "#edd8b6",
    paper: "#fff8ed",
    ink: "#594e43",
    muted: "#948675",
  },
  { display: "var(--gs-font)", accent: "var(--gs-font)", body: "var(--gs-font)" },
);
const t = designTexts("gulbog-sahifa");

/** A garden album: a photographic spread between names and a sequence of warm paper pages. */
export default function Design({ data, mode, art }: TemplateProps) {
  const inv = useInvitation(data, mode, { opening: false }),
    name = useFitWords<HTMLHeadingElement>(46),
    hosts = useFitWords<HTMLParagraphElement>(27),
    when = inv.main.when;
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#eadfcd]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <header className="pt-9">
        <p className="px-7 text-[12px] uppercase tracking-[.25em] text-muted">{t.opening.invitation}</p>
        <h1 ref={name} className="mx-7 mt-8 leading-tight [--fit:46px]">
          <span className="block text-[length:var(--fit)]">
            <Words text={data.groom ?? ""} />
          </span>
          <span className="my-2 block text-center text-[24px] italic text-muted">{t.cover.andWord}</span>
          <span className="block text-right text-[length:var(--fit)] italic">
            <Words text={data.bride ?? ""} />
          </span>
        </h1>
        <div className="relative mt-7 h-[270px] overflow-hidden">
          <PhotoBackdrop
            src={art ?? "/art/gulbog-sahifa.webp"}
            color="#fff8ed"
            fade="both"
            strength={0.35}
            position="50% 43%"
            opacity={0.86}
            priority
          />
        </div>
        <div className="relative mx-7 -mt-4 border-b border-gold/50 pb-6 text-center">
          <p className="text-[23px] italic text-primary">{t.occasionTitles[inv.occasion]}</p>
          <p className="mt-3 text-[18px]">{t.date.long(when.day, when.monthIndex, when.year)}</p>
        </div>
      </header>
      <main>
        <Reveal className="px-8 pt-12 pb-10">
          <p className="mb-5 text-[30px] italic leading-snug text-primary">{inv.text.greeting}</p>
          <p className="text-[20px] leading-[1.85]">{inv.text.body}</p>
        </Reveal>
        <section className="relative mx-5 border-y border-gold/40 bg-[#f5eddc] px-6 py-9 text-center">
          <Reveal>
            <p className="mb-6 text-[27px]">{t.date.title[inv.occasion]}</p>
            <Calendar date={when} marker="heart" markerClassName="text-primary" />
          </Reveal>
          <Reveal className="mt-8 border-t border-primary/20 pt-6">
            <p className="text-[17px] italic text-muted">{t.countdown.title[inv.occasion]}</p>
            <Countdown
              startsAt={when.startsAt}
              look={{
                grid: "mt-4 grid grid-cols-4 gap-1",
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
            <h2 className="mb-9 text-[32px]">{t.venue.programTitle}</h2>
          </Reveal>
          {inv.program.map((e, i) => (
            <Reveal key={i} className="mb-8 last:mb-0">
              <div data-event className="border-t border-gold/50 pt-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span aria-hidden className="text-[42px] italic text-gold/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[30px] text-primary">{t.date.clock(e.time)}</p>
                </div>
                <p className="mt-1 text-right text-[15px] text-muted">
                  {t.date.long(e.when.day, e.when.monthIndex, e.when.year)}
                </p>
                <h3 className="mt-5 text-[25px]">{e.title}</h3>
                <p className="mt-5 text-[21px]">{e.venueName}</p>
                <p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
                <MapButton
                  href={e.mapHref}
                  className="mt-5 rounded-full border border-primary/35 px-5 py-3 text-primary"
                  iconClassName="text-primary"
                />
              </div>
            </Reveal>
          ))}
        </section>
        {inv.sides && (
          <Reveal className="mx-7 border-y border-gold/40 py-8 text-center">
            <p className="text-[14px] uppercase tracking-widest text-muted">{t.sides.groom}</p>
            <p className="mt-3 text-[22px] leading-relaxed">{inv.sides.groom}</p>
            <div aria-hidden className="mx-auto my-6 h-8 w-px bg-gold/50" />
            <p className="text-[14px] uppercase tracking-widest text-muted">{t.sides.bride}</p>
            <p className="mt-3 text-[22px] leading-relaxed">{inv.sides.bride}</p>
          </Reveal>
        )}
        <Reveal className="px-8 pt-12 pb-20 text-center">
          <p className="text-[24px] italic leading-[1.8] text-primary">{inv.blessing}</p>
          <p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p>
          <p ref={hosts} className="mt-4 w-full leading-snug [--fit:27px]">
            <span className="text-[length:var(--fit)]">
              <Words text={data.hosts} />
            </span>
          </p>
          <p className="mt-6 text-[18px] italic">{t.hosts.waiting}</p>
        </Reveal>
      </main>
    </InvitationShell>
  );
}
