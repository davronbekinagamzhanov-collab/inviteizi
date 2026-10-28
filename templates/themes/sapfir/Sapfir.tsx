"use client";

import {Words,useFitWords} from "../../blocks/FitWords";
import { motion } from "motion/react";
import { t } from "@/texts/uz-cyrl";
import type { TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { MapButton } from "../../blocks/MapButton";
import { melody } from "./melody";
import { VELVET_BOTTOM, VELVET_TOP, fontClasses, vars } from "./style";

const EASE = [0.22, 1, 0.36, 1] as const;
const FRAME_S = 1.2; // рамка прорисовывается за 1,2 с

// Тонкий шум — фактура бархата
const NOISE = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

/**
 * №23 «Сапфир» — никоҳ тўйи, Оддий. Один экран: сапфировый бархат,
 * золотая рамка с ислими в углах прорисовывается линией, затем появляется текст.
 */
export default function Sapfir({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  const { main } = inv;
  const names=useFitWords<HTMLHeadingElement>(48);
  const groomFamily=useFitWords<HTMLParagraphElement>(21),brideFamily=useFitWords<HTMLParagraphElement>(21);
  const hosts=useFitWords<HTMLParagraphElement>(21);
  const { when } = main;

  const appear = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: FRAME_S * 0.85 + i * 0.12, ease: EASE },
  });

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="text-ink"
      backdropClassName="bg-[#0B1230]"
      pageColor={VELVET_BOTTOM}
      // своя кнопка ▶ стоит рядом с картой, угловая не нужна
      musicButtonClassName="!hidden"
    >
      <GoldDefs />
      <div
        className="relative flex min-h-[max(560px,100svh)] flex-col items-center justify-center overflow-hidden px-[38px] pt-10 pb-24 text-center"
        style={{ background: `linear-gradient(180deg, ${VELVET_TOP} 0%, ${VELVET_BOTTOM} 100%)` }}
      >
        {/* бархат: шум, блик сверху, тень по краям */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay" style={{ backgroundImage: NOISE }} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 45% at 50% -6%, rgba(140,165,240,0.30), rgba(140,165,240,0) 70%), radial-gradient(130% 90% at 50% 50%, rgba(0,0,0,0) 55%, rgba(4,8,24,0.55) 100%)",
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-x-1/2 top-0 h-3/5"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)",
            maskImage: "linear-gradient(180deg, #000 30%, transparent 100%)",
          }}
          animate={{ x: ["-30%", "30%"] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />

        <Frame />
        <Rosette />

        <div className="relative flex w-full max-w-[320px] flex-col items-center">
          <motion.p {...appear(0)} className="gold-text text-[14px] font-medium tracking-[0.42em] uppercase">
            {t.occasionTitles[inv.occasion]}
          </motion.p>

          <motion.h1 ref={names} {...appear(1)} className="mt-[2.4svh] w-full font-display leading-[0.98] font-normal [--fit:48px]">
            <span className="block text-[length:var(--fit)] italic"><Words text={data.groom??""}/></span>
            <span className="gold-text block text-[clamp(26px,4.6svh,34px)] italic">{t.cover.and}</span>
            <span className="block text-[length:var(--fit)] italic"><Words text={data.bride??""}/></span>
          </motion.h1>

          <motion.p {...appear(2)} className="mt-[2.4svh] text-[16px] leading-[1.6] text-muted">
            {inv.text.body}
          </motion.p>

          <motion.div {...appear(3)} className="my-[2.2svh]">
            <SmallOrnament />
          </motion.div>

          <motion.p {...appear(3)} className="text-[17px] lining-nums tabular-nums whitespace-nowrap">
            {when.day} {t.months[when.monthIndex]} {when.year}
            <Dot />
            {t.weekdays[when.weekdayIndex]}
            <Dot />
            {main.time}
          </motion.p>

          <motion.div {...appear(4)} className="mt-[2.2svh]">
            <p className="font-display text-[23px] leading-tight">{main.venueName}</p>
            <p className="mt-0.5 text-[16px] text-muted">{main.address}</p>
          </motion.div>

          <motion.div {...appear(5)} className="mt-[2.6svh] flex items-center gap-3">
            <MapButton
              href={main.mapHref}
              className="gold-fill rounded-full px-6 py-3 text-[16px] text-[#0E1736] shadow-[0_10px_26px_-10px_rgba(243,213,138,0.55)]"
              iconClassName="text-[#0E1736]"
            />
            {inv.hasMusic && (
              <button
                type="button"
                onClick={inv.toggleMusic}
                aria-label={inv.playing ? t.music.pause : t.music.play}
                className="relative flex h-12 w-12 items-center justify-center rounded-full text-[#F3D58A] ring-1 ring-[#F3D58A]/70 transition active:scale-90"
              >
                {inv.playing && (
                  <span className="absolute inset-0 animate-ping rounded-full ring-1 ring-[#F3D58A]/50 [animation-duration:2.4s]" />
                )}
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  {inv.playing ? (
                    <path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                  ) : (
                    <path fill="currentColor" d="M8 5.5v13l11-6.5z" />
                  )}
                </svg>
              </button>
            )}
          </motion.div>

          <motion.div {...appear(6)} className="mt-[2.8svh] w-full max-w-full">
            {inv.program.filter(e=>e!==main).map((e,i)=><div key={i} className="mb-6 border-t border-gold/30 pt-5 text-[16px] leading-relaxed [overflow-wrap:anywhere]">
              <p className="text-gold-light">{e.title}</p><p className="mt-2">{t.date.long(e.when.day,e.when.monthIndex,e.when.year)} · {t.date.at(e.time)}</p>
              <p className="mt-2 text-[18px]">{e.venueName}</p><p className="mt-1 text-muted">{e.address}</p><MapButton href={e.mapHref} className="mt-3 border-b border-gold/50 pb-1 text-gold-light" iconClassName="text-gold-light"/>
            </div>)}
            <p className="text-[15px] text-muted italic">{t.hosts.respect}</p>
            {inv.sides ? <div className="mt-5 space-y-5 text-center [overflow-wrap:anywhere]"><div><p className="text-[14px] text-muted">{t.sides.groom}</p><p ref={groomFamily} className="mt-2 w-full [--fit:21px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.groom??""}/></span></p></div><div><p className="text-[14px] text-muted">{t.sides.bride}</p><p ref={brideFamily} className="mt-2 w-full [--fit:21px]"><span className="text-[length:var(--fit)]"><Words text={inv.sides.bride??""}/></span></p></div></div> : <p className="gold-text mt-0.5 font-display text-[22px] font-medium">{data.hosts}</p>}
            {inv.sides && data.hosts && ![inv.sides.groom,inv.sides.bride].includes(data.hosts) && <p ref={hosts} className="gold-text mt-5 w-full font-display [--fit:21px]"><span className="text-[length:var(--fit)]"><Words text={data.hosts}/></span></p>}
          </motion.div>
        </div>
      </div>
    </InvitationShell>
  );
}

function GoldDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="sf-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A87A28" />
          <stop offset="0.3" stopColor="#B8892F" />
          <stop offset="0.52" stopColor="#F3D58A" />
          <stop offset="0.75" stopColor="#B8892F" />
          <stop offset="1" stopColor="#A87A28" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Двойная золотая рамка: линии растут из углов, ислими в углах прорисовываются */
function Frame() {
  const line = (cls: string, axis: "x" | "y", origin: string, delay = 0) => (
    <motion.span
      className={`gold-fill absolute ${cls}`}
      style={{ originX: origin === "left" ? 0 : origin === "right" ? 1 : 0.5, originY: origin === "top" ? 0 : origin === "bottom" ? 1 : 0.5 }}
      initial={axis === "x" ? { scaleX: 0 } : { scaleY: 0 }}
      animate={axis === "x" ? { scaleX: 1 } : { scaleY: 1 }}
      transition={{ duration: FRAME_S, delay, ease: [0.45, 0, 0.2, 1] }}
    />
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-[14px]">
      {/* внешняя линия; сверху посередине — разрыв под гребень */}
      {line("top-0 left-[58px] right-[calc(50%+30px)] h-px", "x", "left")}
      {line("top-0 left-[calc(50%+30px)] right-[58px] h-px", "x", "right")}
      {line("bottom-0 left-[58px] right-[58px] h-px", "x", "center")}
      {line("left-0 top-[58px] bottom-[58px] w-px", "y", "center")}
      {line("right-0 top-[58px] bottom-[58px] w-px", "y", "center")}
      {/* внутренняя, тоньше */}
      {line("top-[7px] left-[64px] right-[64px] h-px opacity-45", "x", "center", 0.15)}
      {line("bottom-[7px] left-[64px] right-[64px] h-px opacity-45", "x", "center", 0.15)}
      {line("left-[7px] top-[64px] bottom-[64px] w-px opacity-45", "y", "center", 0.15)}
      {line("right-[7px] top-[64px] bottom-[64px] w-px opacity-45", "y", "center", 0.15)}

      <Corner className="top-0 left-0" />
      <Corner className="top-0 right-0 -scale-x-100" />
      <Corner className="bottom-0 left-0 -scale-y-100" />
      <Corner className="right-0 bottom-0 -scale-100" />
      <TopCrest />
    </div>
  );
}

// Ислими: четверть-арка, две спирали-завитка и румий-лист по диагонали
const CORNER_PATHS = [
  "M2 62 C 2 30, 30 2, 62 2",
  "M62 2 C 80 2, 92 12, 88 26 C 84 38, 68 36, 70 26 C 72 19, 81 20, 80 27",
  "M2 62 C 2 80, 12 92, 26 88 C 38 84, 36 68, 26 70 C 19 72, 20 81, 27 80",
  "M14 14 C 28 18, 40 30, 46 46 C 30 40, 18 28, 14 14 Z",
  "M30 44 C 21 49, 20 58, 27 61",
  "M44 30 C 49 21, 58 20, 61 27",
  "M58 58 m -2.4 0 a 2.4 2.4 0 1 0 4.8 0 a 2.4 2.4 0 1 0 -4.8 0",
];

function Corner({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 96 96" className={`absolute h-[72px] w-[72px] ${className}`}>
      {CORNER_PATHS.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="url(#sf-gold)"
          strokeWidth={1.4}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: FRAME_S, delay: i * 0.05, ease: [0.45, 0, 0.2, 1] }}
        />
      ))}
    </svg>
  );
}

/** Маленький гребень-медальон в середине верхней линии */
function TopCrest() {
  return (
    <motion.svg
      viewBox="0 0 60 20"
      className="absolute -top-[9px] left-1/2 h-[18px] w-[54px] -translate-x-1/2"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: FRAME_S * 0.8, duration: 0.6 }}
    >
      <path d="M30 2 L38 10 L30 18 L22 10 Z" fill="none" stroke="url(#sf-gold)" strokeWidth="1.3" />
      <path d="M30 6 L34 10 L30 14 L26 10 Z" fill="url(#sf-gold)" />
      <path d="M2 10 C 10 4, 16 4, 20 10 M58 10 C 50 4, 44 4, 40 10" fill="none" stroke="url(#sf-gold)" strokeWidth="1.1" />
    </motion.svg>
  );
}

/** Еле заметная гирих-розетка за именами: глубина бархата */
function Rosette() {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <motion.svg
      aria-hidden
      viewBox="-100 -100 200 200"
      className="pointer-events-none absolute top-[30%] left-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, rotate: -8 }}
      animate={{ opacity: 0.11, rotate: 0 }}
      transition={{ duration: 2.4, delay: FRAME_S * 0.6, ease: EASE }}
    >
      {petals.map((a) => (
        <path
          key={a}
          d="M0 -96 C 14 -70, 14 -44, 0 -26 C -14 -44, -14 -70, 0 -96 Z"
          transform={`rotate(${a})`}
          fill="none"
          stroke="url(#sf-gold)"
          strokeWidth={0.8}
        />
      ))}
      <circle r="26" fill="none" stroke="url(#sf-gold)" strokeWidth={0.8} />
      <path
        d="M0 -60 L17 -17 L60 0 L17 17 L0 60 L-17 17 L-60 0 L-17 -17 Z"
        fill="none"
        stroke="url(#sf-gold)"
        strokeWidth={0.8}
        transform="rotate(22.5)"
      />
    </motion.svg>
  );
}

function SmallOrnament() {
  return (
    <div aria-hidden className="flex items-center gap-1">
      <span className="gold-fill h-px w-11" />
      <svg viewBox="0 0 32 14" className="h-3.5 w-8">
        <path d="M16 1 C 20 4, 20 10, 16 13 C 12 10, 12 4, 16 1 Z" fill="url(#sf-gold)" />
        <path d="M4 7 C 7 4, 10 4, 12 7 C 10 10, 7 10, 4 7 Z M28 7 C 25 4, 22 4, 20 7 C 22 10, 25 10, 28 7 Z" fill="url(#sf-gold)" />
      </svg>
      <span className="gold-fill h-px w-11" />
    </div>
  );
}

/** Ромбик-разделитель в строке даты */
function Dot() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="mx-2 inline-block h-[7px] w-[7px] -translate-y-px">
      <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="url(#sf-gold)" />
    </svg>
  );
}
