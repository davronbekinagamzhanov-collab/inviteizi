"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("tandir-nuri");
import type { Invitation } from "../../blocks/useInvitation";
import { MILK } from "./style";
import { round } from "./decor";

// Когда раскрывается свет и когда заставка уходит, мс после нажатия
const EXPAND_MS = 320;
const FINISH_MS = 2300;
const EASE = [0.6, 0, 0.25, 1] as const;

// Центр устья тандира на экране (по нему же раскрывается круг света)
const CX = "50%";
const CY = "53%";

/**
 * Заставка «свечение тандира»: тандир сверху — глиняный купол с витками,
 * в устье дышит жар и поднимаются искры. Нажатие — жар раскрывается кругом
 * (clip-path circle) на весь экран и переходит в светлое утро.
 */
export function Opening({ inv }: { inv: Invitation }) {
  const [phase, setPhase] = useState<"idle" | "flare" | "expand">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function open() {
    if (phase !== "idle") return;
    inv.start();
    setPhase("flare");
    timers.current = [
      setTimeout(() => setPhase("expand"), EXPAND_MS),
      setTimeout(inv.finishOpening, FINISH_MS),
    ];
  }

  const going = phase !== "idle";

  return (
    <AnimatePresence>
      {!inv.opened && (
        <motion.div
          key="tandir"
          className="fixed inset-y-0 left-1/2 z-[29] w-full max-w-[430px] -translate-x-1/2 overflow-hidden"
          style={{
            // тёмная обожжённая глина двора, а не ночь
            background: "radial-gradient(120% 90% at 50% 53%, #5B3321 0%, #43251A 45%, #2E1910 100%)",
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <button
            type="button"
            data-open
            onClick={open}
            aria-label={t.opening.tapToOpen}
            className="absolute inset-0 h-full w-full cursor-pointer"
          >
            {/* надпись сверху */}
            <motion.span
              className="absolute inset-x-0 top-[9svh] flex flex-col items-center px-8 text-center"
              animate={{ opacity: going ? 0 : 1, y: going ? -14 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="font-body text-[18px] text-[#E9C997] italic">{t.opening.invitation}</span>
              <span
                className="mt-2 font-display text-[clamp(44px,13vw,54px)] leading-none text-[#FFF1DA]"
                style={{ textShadow: "0 0 28px rgba(246,170,80,0.45)" }}
              >
                {t.occasionTitles.nahorgi}
              </span>
            </motion.span>

            {/* тандир сверху */}
            <span
              className="absolute aspect-square w-[min(94vw,400px,58svh)] -translate-x-1/2 -translate-y-1/2"
              style={{ left: CX, top: CY }}
            >
              <TandirDome flare={going} />
            </span>

            {/* подсказка */}
            <motion.span
              className="absolute inset-x-0 bottom-[7svh] flex flex-col items-center gap-2"
              animate={{ opacity: going ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <span className="soft-pulse font-body text-[17px] tracking-[0.08em] text-[#F3DDB8]">
                {t.opening.tapToOpen}
              </span>
            </motion.span>
          </button>

          {/* свет из устья раскрывается кругом на весь экран */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at ${CX} ${CY}, #FFF6DD 0%, #FCE4B4 16%, #F8E2BE 34%, #F8ECDA 58%, ${MILK} 82%)`,
            }}
            initial={{ clipPath: `circle(7% at ${CX} ${CY})`, opacity: 0 }}
            animate={
              phase === "expand"
                ? { clipPath: `circle(85% at ${CX} ${CY})`, opacity: 1 }
                : { clipPath: `circle(7% at ${CX} ${CY})`, opacity: 0 }
            }
            transition={{
              clipPath: { duration: 1.5, ease: EASE },
              opacity: { duration: 0.35, ease: "easeOut" },
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Искры: поднимаются из устья и гаснут */
const SPARKS = [
  { x: 96, r: 0.9, dur: 2.6, delay: 0, drift: -6 },
  { x: 104, r: 0.7, dur: 3.1, delay: 0.7, drift: 8 },
  { x: 100, r: 1.1, dur: 2.9, delay: 1.5, drift: -2 },
  { x: 92, r: 0.6, dur: 3.4, delay: 2.1, drift: -10 },
  { x: 108, r: 0.8, dur: 2.7, delay: 2.6, drift: 5 },
];

/** Неровный виток глины: окружность с лёгкими «волнами» ручной лепки */
function coilPath(r: number, seed: number) {
  const n = 48;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r + Math.sin(a * 3 + seed) * 0.9 + Math.sin(a * 7 + seed * 2.3) * 0.5;
    return `${round(100 + rr * Math.cos(a))} ${round(100 + rr * Math.sin(a))}`;
  });
  return `M${pts.join(" L")}Z`;
}

const COILS = [
  { r: 80, seed: 0.4, o: 0.26 },
  { r: 66, seed: 2.1, o: 0.2 },
  { r: 53, seed: 4.2, o: 0.16 },
];

/**
 * Тандир сверху: глиняный купол ручной лепки (обмазка с зерном, неровные витки),
 * устье с бортиком, в нём дышит жар. Неподвижная часть и огонь — разные слои,
 * чтобы мерцание не перерисовывало зернистую глину.
 */
function TandirDome({ flare }: { flare: boolean }) {
  return (
    <span className="absolute inset-0">
      <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="tn-dome" cx="0.4" cy="0.34" r="0.7">
            <stop offset="0" stopColor="#C49166" />
            <stop offset="0.42" stopColor="#A06C45" />
            <stop offset="0.8" stopColor="#74452A" />
            <stop offset="1" stopColor="#4E2B1A" />
          </radialGradient>
          <radialGradient id="tn-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.82" stopColor="#1C0E07" stopOpacity="0.6" />
            <stop offset="1" stopColor="#1C0E07" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tn-rim" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.7" stopColor="#B07A50" />
            <stop offset="0.86" stopColor="#D2A276" />
            <stop offset="1" stopColor="#8A5735" />
          </radialGradient>
          <radialGradient id="tn-sheen" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFE9C8" stopOpacity="0.22" />
            <stop offset="1" stopColor="#FFE9C8" stopOpacity="0" />
          </radialGradient>
          {/* зерно глины: шум только внутри купола */}
          <filter id="tn-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0 0.03  0 0 0 0.55 -0.12" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        <circle cx="103" cy="107" r="99" fill="url(#tn-shadow)" />
        <circle cx="100" cy="100" r="92" fill="url(#tn-dome)" />
        <circle cx="100" cy="100" r="92" fill="#000" filter="url(#tn-grain)" />
        {COILS.map((c) => (
          <g key={c.r}>
            <path d={coilPath(c.r, c.seed)} fill="none" stroke="#2C150B" strokeOpacity={c.o} strokeWidth="1.6" />
            <path d={coilPath(c.r - 1.6, c.seed)} fill="none" stroke="#FFE2BC" strokeOpacity={c.o * 0.6} strokeWidth="1" />
          </g>
        ))}
        {/* утренний блик на куполе сверху слева */}
        <ellipse cx="70" cy="58" rx="46" ry="28" fill="url(#tn-sheen)" transform="rotate(-32 70 58)" />

        {/* устье: толстый бортик и тёмная глубина */}
        <circle cx="100" cy="100" r="41" fill="url(#tn-rim)" />
        <circle cx="100" cy="100" r="34.5" fill="#24110A" />
      </svg>

      {/* огонь: отдельный лёгкий слой */}
      <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="tn-lit" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.4" stopColor="#FFB561" stopOpacity="0.5" />
            <stop offset="0.7" stopColor="#F59A45" stopOpacity="0.16" />
            <stop offset="1" stopColor="#F59A45" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tn-fire" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF4CF" />
            <stop offset="0.3" stopColor="#FFD57E" />
            <stop offset="0.62" stopColor="#F08A32" />
            <stop offset="0.88" stopColor="#B4421A" />
            <stop offset="1" stopColor="#5E1A0C" />
          </radialGradient>
          <radialGradient id="tn-flick" cx="0.45" cy="0.55" r="0.5">
            <stop offset="0" stopColor="#FFF7DC" stopOpacity="0.95" />
            <stop offset="0.5" stopColor="#FFC65E" stopOpacity="0.5" />
            <stop offset="1" stopColor="#FF9A3A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* отсвет жара на бортике и глине */}
        <motion.circle
          cx="100"
          cy="100"
          r="70"
          fill="url(#tn-lit)"
          animate={flare ? { opacity: 1, scale: 1.15 } : { opacity: [0.6, 1, 0.7, 0.95, 0.6] }}
          transition={flare ? { duration: 0.4 } : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "100px 100px" }}
        />
        <motion.circle
          cx="100"
          cy="100"
          r="31"
          fill="url(#tn-fire)"
          animate={flare ? { scale: 1.1 } : { scale: [1, 1.03, 0.99, 1.02, 1] }}
          transition={flare ? { duration: 0.35 } : { duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "100px 100px" }}
        />
        {/* мерцание: светлое пятно перебегает внутри устья */}
        <motion.circle
          cx="100"
          cy="100"
          r="21"
          fill="url(#tn-flick)"
          animate={
            flare
              ? { opacity: 1, scale: 1.5 }
              : { opacity: [0.55, 0.95, 0.6, 0.85, 0.55], x: [0, 3, -2, 2, 0], y: [0, -2, 2, -1, 0] }
          }
          transition={flare ? { duration: 0.35 } : { duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "100px 100px" }}
        />
        {!flare &&
          SPARKS.map((s, i) => (
            <motion.circle
              key={i}
              cx={s.x}
              cy="96"
              r={s.r}
              fill="#FFE2A0"
              initial={{ opacity: 0 }}
              animate={{ y: [0, -64], x: [0, s.drift], opacity: [0, 1, 0] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
      </svg>
    </span>
  );
}
