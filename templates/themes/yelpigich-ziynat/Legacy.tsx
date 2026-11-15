"use client";
import localFont from "next/font/local";
import { memo, useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import type { InvitationData } from "@/lib/types";
import { designVars, type TemplateProps } from "../types";
import { useInvitation, type Invitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Words, useFitWords } from "../../blocks/FitWords";
import { Reveal } from "../../blocks/Reveal";
import { MapButton } from "../../blocks/MapButton";
import { Countdown } from "../../blocks/Countdown";
import { designTexts } from "@/texts/uz-cyrl";
import styles from "./opening.module.css";
const font = localFont({
  preload: false,
  src: [
    { path: "../../../assets/fonts/web/Lora-Regular.woff2" },
    { path: "../../../assets/fonts/web/Lora-Italic.woff2", style: "italic" },
  ],
  variable: "--yz-font",
  display: "swap",
});
const vars = designVars(
  {
    primary: "#496777",
    primaryDark: "#344d59",
    gold: "#a59879",
    goldLight: "#dfd7be",
    paper: "#f5f7ef",
    ink: "#43535b",
    muted: "#5c6970",
  },
  { display: "var(--yz-font)", accent: "var(--yz-font)", body: "var(--yz-font)" },
);
const t = designTexts("yelpigich-ziynat");
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode),
    reduced = useReducedMotion(),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1450);
  };
  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={font.variable}
      backdropClassName="bg-[#dbe3e2]"
      className="bg-paper text-ink [overflow-wrap:anywhere]"
    >
      <Content data={data} inv={inv} />
      {!inv.opened && (
        <button
          data-open
          data-started={inv.started}
          type="button"
          onClick={open}
          disabled={inv.started}
          aria-label={t.opening.tapToOpen}
          className={styles.cover}
        >
          <div className={styles.paper} />
          <div aria-hidden className={styles.fan}>
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className={styles.leaf}
                style={{ "--angle": `${(i - 4) * 14}deg`, transitionDelay: `${i * 0.025}s` } as CSSProperties}
              >
                <FanLeaf pale={i % 2 === 0} />
              </div>
            ))}
            <span className={styles.pin} />
          </div>
          <div className={styles.label}>
            <p className="text-[12px] tracking-[.2em] uppercase">{t.opening.invitation}</p>
            <p className="mt-5 text-[34px] italic">{t.occasionTitles[inv.occasion]}</p>
          </div>
          <p data-open-prompt className={styles.prompt}>{t.opening.tapToOpen}</p>
        </button>
      )}
    </InvitationShell>
  );
}
const Content = memo(
  function Content({ data, inv }: { data: InvitationData; inv: Invitation }) {
    const names = useFitWords<HTMLHeadingElement>(45),
      hosts = useFitWords<HTMLParagraphElement>(26),
      groom = useFitWords<HTMLParagraphElement>(24),
      bride = useFitWords<HTMLParagraphElement>(24);
    return (
      <>
        <header className="px-7 pt-8 pb-10">
          <FanArt />
          <p className="mt-3 text-center text-[12px] tracking-[.2em] uppercase text-muted">{t.opening.invitation}</p>
          <h1 ref={names} className="mt-7 w-full leading-tight [--fit:45px]">
            <span className="block text-right text-[length:var(--fit)] italic">
              <Words text={data.groom ?? ""} />
            </span>
            <span className="my-3 block text-center text-[22px] text-primary">{t.cover.andWord}</span>
            <span className="block text-[length:var(--fit)] italic">
              <Words text={data.bride ?? ""} />
            </span>
          </h1>
          <p className="mt-7 text-center text-[19px] text-primary">
            {t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}
          </p>
        </header>
        <main className="pb-24">
          <Reveal className="mx-6 border-y border-primary/30 py-8">
            <h2 className="text-[29px] italic leading-snug">{inv.text.greeting}</h2>
            <p className="mt-6 text-[20px] leading-[1.9]">{inv.text.body}</p>
          </Reveal>
          {inv.sides && (
            <section className="my-10 bg-[#e4ece7] px-7 py-8">
              <p className="text-[14px] text-muted">{t.sides.groom}</p>
              <p ref={groom} className="mt-3 w-full leading-snug [--fit:24px]">
                <span className="text-[length:var(--fit)]">
                  <Words text={inv.sides.groom ?? ""} />
                </span>
              </p>
              <div aria-hidden className="my-7 h-px w-12 bg-gold/60" />
              <p className="text-[14px] text-muted">{t.sides.bride}</p>
              <p ref={bride} className="mt-3 w-full leading-snug [--fit:24px]">
                <span className="text-[length:var(--fit)]">
                  <Words text={inv.sides.bride ?? ""} />
                </span>
              </p>
            </section>
          )}
          <Reveal className="px-7 text-center">
            <p className="text-[16px] text-muted">{t.countdown.title[inv.occasion]}</p>
            <Countdown
              startsAt={inv.main.when.startsAt}
              look={{
                grid: "mt-5 grid grid-cols-4 gap-2",
                box: "flex min-w-0 flex-col",
                number: "text-[25px] whitespace-nowrap text-primary",
                label: "mt-2 text-[12px] text-muted",
                today: "text-[26px] text-primary",
              }}
            />
          </Reveal>
          <section className="px-7 pt-11">
            <h2 className="mb-8 text-center text-[30px] italic text-primary">{t.venue.programTitle}</h2>
            {inv.program.map((e, i) => (
              <Reveal key={i} className="mb-9">
                <div data-event className="border-t border-primary/30 pt-6">
                  <p className="text-[14px] text-muted">{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
                  <p className="mt-3 text-[36px] italic text-primary">{t.date.clock(e.time)}</p>
                  <h3 className="mt-3 text-[25px] leading-snug">{e.title}</h3>
                  <p className="mt-5 text-[22px] leading-snug">{e.venueName}</p>
                  <p className="mt-2 text-[17px] leading-relaxed text-muted">{e.address}</p>
                  <MapButton
                    href={e.mapHref}
                    className="mt-5 rounded-tl-[18px] rounded-br-[18px] border border-primary/40 px-5 py-3 text-primary"
                    iconClassName="text-primary"
                  />
                </div>
              </Reveal>
            ))}
          </section>
          <Reveal className="px-7 text-center">
            <p className="text-[24px] italic leading-[1.8]">{inv.blessing}</p>
            <p className="mt-9 text-[15px] text-muted">{t.hosts.respectDeep}</p>
            <p ref={hosts} className="mt-3 w-full leading-snug [--fit:26px]">
              <span className="text-[length:var(--fit)]">
                <Words text={data.hosts} />
              </span>
            </p>
            <p className="mt-6 text-[18px] text-primary">{t.hosts.waiting}</p>
          </Reveal>
        </main>
      </>
    );
  },
  (a, b) => a.data === b.data && a.inv.mode === b.inv.mode && a.inv.lang === b.inv.lang,
);
const FanLeaf = memo(function FanLeaf({ pale }: { pale: boolean }) {
  return (
    <svg viewBox="0 0 70 200" className="h-full w-full" fill="none">
      <path d="M35 196 2 22Q35 4 68 22Z" fill={pale ? "#e3ebdf" : "#afc4c6"} stroke="#7f9c9f" />
      <path d="M35 196V27M10 32q25-10 50 0" stroke="#b2a47f" />
      <path d="M35 95q-27-22-14-38q21 2 14 38Zm0 24q27-22 14-38q-21 2-14 38Z" stroke="#688b90" />
      <circle cx="35" cy="182" r="2" fill="#aa9871" />
    </svg>
  );
});
// Quantize paths: Node and Chrome can differ in the last bits of trigonometric results.
const FanArt = memo(function FanArt() {
  return (
    <svg data-decor aria-hidden="true" viewBox="0 0 320 195" className="mx-auto w-full max-w-[300px]" fill="none">
      {Array.from({ length: 9 }, (_, i) => {
        const a = ((i - 4.5) * 14 * Math.PI) / 180,
          b = ((i - 3.5) * 14 * Math.PI) / 180,
          p = (n: number) => n.toFixed(3);
        return (
          <path
            key={i}
            d={`M160 174  ${p(160 + 155 * Math.sin(a))} ${p(174 - 155 * Math.cos(a))} Q${p(160 + 166 * Math.sin((a + b) / 2))} ${p(174 - 166 * Math.cos((a + b) / 2))} ${p(160 + 155 * Math.sin(b))} ${p(174 - 155 * Math.cos(b))}Z`}
            fill={i % 2 ? "#b9cdd0" : "#e2eadd"}
            stroke="#8ca3a0"
            strokeWidth=".8"
          />
        );
      })}
      <path d="M160 175v17" stroke="#aa9871" strokeWidth="5" />
      <path d="M72 72q34 7 52-25M196 47q18 32 52 25" stroke="#b3a27b" strokeWidth="1.3" />
      <circle cx="160" cy="174" r="4" fill="#aa9871" />
    </svg>
  );
});
