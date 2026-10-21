"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "../../blocks/useInvitation";

const OPEN_S = 2; // створки расходятся
const FINISH_MS = 2400;
const EASE = [0.7, 0, 0.25, 1] as const;

// Складки бархата: тёмные «долины» и светлые «гребни»
const FOLDS =
  "repeating-linear-gradient(90deg, #0F2149 0px, #1F3A6E 14px, #2D4E8C 22px, #1F3A6E 30px, #0F2149 46px)";
const SHADE =
  "linear-gradient(180deg, rgba(5,12,32,0.55) 0%, rgba(5,12,32,0) 22%, rgba(5,12,32,0) 70%, rgba(5,12,32,0.45) 100%)";
// Золотая бахрома внизу
const FRINGE =
  "repeating-linear-gradient(90deg, #F3D58A 0px, #B8892F 1.5px, transparent 2px, transparent 4px)";

/**
 * Заставка: тёмно-синий бархатный занавес с золотой бахромой и кистями.
 * По нажатию створки раздвигаются (сжимаясь складками), ламбрекен уходит вверх — за ним картина.
 */
export function Curtain({ inv, name }: { inv: Invitation; name: string }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const going = inv.started;

  function open() {
    if (going) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, FINISH_MS);
  }

  return (
    <AnimatePresence>
      {!inv.opened && (
        <motion.button
          key="curtain"
          type="button"
          data-open
          onClick={open}
          aria-label={t.opening.tapToOpen}
          className="fixed inset-y-0 left-1/2 z-[29] w-full max-w-[430px] -translate-x-1/2 cursor-pointer overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Half side="left" going={going} />
          <Half side="right" going={going} />

          {/* ламбрекен с фестонами и кистями */}
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 z-10 h-[86px]"
            animate={{ y: going ? -120 : 0 }}
            transition={{ duration: 0.9, delay: going ? OPEN_S * 0.55 : 0, ease: EASE }}
          >
            <Valance />
          </motion.div>

          {/* медальон-надпись по центру занавеса */}
          <motion.div
            className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center px-8 text-center"
            animate={{ opacity: going ? 0 : 1, scale: going ? 0.94 : 1 }}
            transition={{ duration: 0.45 }}
          >
            <div className="relative rounded-[28px] px-8 py-7" style={{ background: "radial-gradient(closest-side, rgba(10,22,52,0.85), rgba(10,22,52,0.55) 70%, rgba(10,22,52,0))" }}>
              <p className="gold-text text-[14px] font-medium tracking-[0.4em] uppercase">{t.occasionTitles.sunnat}</p>
              <p className="gold-text gold-shine mt-2 font-display text-[clamp(34px,10vw,42px)] leading-tight font-semibold">
                {name}
              </p>
              <div className="mx-auto mt-3 h-px w-24 gold-fill" />
            </div>
            <p className="soft-pulse mt-6 text-[17px] tracking-[0.16em] text-[#F4EBD6]">{t.opening.tapToOpen}</p>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function Half({ side, going }: { side: "left" | "right"; going: boolean }) {
  const left = side === "left";
  return (
    <motion.div
      aria-hidden
      className={`absolute inset-y-0 w-[53%] ${left ? "left-0" : "right-0"}`}
      style={{ originX: left ? 0 : 1, background: `${SHADE}, ${FOLDS}` }}
      // створки собираются складками у краёв и остаются узкой драпировкой, пока заставка не растает
      animate={going ? { x: left ? "-31%" : "31%", scaleX: 0.5 } : { x: "0%", scaleX: 1 }}
      transition={{ duration: OPEN_S, ease: EASE }}
    >
      {/* мягкий свет на ткани и тень у края */}
      <div
        className="absolute inset-0"
        style={{
          background: left
            ? "linear-gradient(90deg, rgba(0,0,0,0) 70%, rgba(4,10,28,0.55) 100%), radial-gradient(60% 40% at 30% 35%, rgba(170,195,255,0.18), rgba(0,0,0,0) 70%)"
            : "linear-gradient(270deg, rgba(0,0,0,0) 70%, rgba(4,10,28,0.55) 100%), radial-gradient(60% 40% at 70% 35%, rgba(170,195,255,0.18), rgba(0,0,0,0) 70%)",
        }}
      />
      {/* золотой галун и бахрома внизу */}
      <div className="gold-fill absolute inset-x-0 bottom-[30px] h-[5px]" />
      <div
        className="absolute inset-x-0 bottom-0 h-[30px]"
        style={{ background: FRINGE, maskImage: "linear-gradient(180deg, #000 60%, transparent)" }}
      />
      {/* кисть на шнуре у внутреннего края */}
      <svg viewBox="0 0 40 220" className={`absolute top-[86px] h-[34svh] w-10 ${left ? "right-3" : "left-3"}`}>
        <rect x="18.8" width="2.4" height="150" fill="url(#oo-gold-v)" />
        <path d="M20 0 V150" stroke="#FFF3C8" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="3 4" />
        <ellipse cx="20" cy="158" rx="7" ry="9" fill="url(#oo-gold)" />
        <path d="M12 166 Q20 160 28 166 L31 214 Q20 220 9 214 Z" fill="url(#oo-gold-v)" />
        {[13, 17, 21, 25, 29].map((x) => (
          <path key={x} d={`M${x - 0.5} 170 L${x - 1.5} 212`} stroke="#8A6420" strokeOpacity="0.5" strokeWidth="0.7" />
        ))}
      </svg>
    </motion.div>
  );
}

function Valance() {
  // 7 фестонов по ширине
  const n = 7;
  const w = 400 / n;
  const scallops = Array.from({ length: n }, (_, i) => `Q${i * w + w / 2} 92 ${(i + 1) * w} 62`).join(" ");
  return (
    <svg viewBox="0 0 400 110" preserveAspectRatio="none" className="h-full w-full overflow-visible">
      <path d={`M0 62 ${scallops} L400 0 L0 0 Z`} fill="#1A3266" />
      <path d={`M0 62 ${scallops}`} fill="none" stroke="url(#oo-gold)" strokeWidth="3" />
      <rect y="11" width="400" height="2" fill="url(#oo-gold)" />
      {Array.from({ length: n - 1 }, (_, i) => (
        <g key={i} transform={`translate(${(i + 1) * w} 62)`}>
          <rect x="-0.8" width="1.6" height="14" fill="url(#oo-gold-v)" />
          <circle cy="16" r="3.2" fill="url(#oo-gold)" />
          <path d="M-3.5 18 L-5 34 Q0 37 5 34 L3.5 18 Z" fill="url(#oo-gold-v)" />
        </g>
      ))}
    </svg>
  );
}
