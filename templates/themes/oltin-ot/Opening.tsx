"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("oltin-ot");
import type { Invitation } from "../../blocks/useInvitation";
import { Medallion, Qalampir, QalampirBand, Velvet } from "./decor";
import { INK, MILK } from "./style";

const ORDER = ["idle", "untie", "lift", "rise"] as const;
type Phase = (typeof ORDER)[number];

// Когда начинается каждая фаза, мс после нажатия
const TIMELINE: [Phase, number][] = [
  ["lift", 650],
  ["rise", 1350],
];
const FINISH_MS = 2900;
const EASE = [0.65, 0, 0.35, 1] as const;
const SOFT = [0.22, 1, 0.36, 1] as const;

// Атласная лента: молочный шёлк с золотыми кромками
const SATIN_H =
  "linear-gradient(180deg, #C99A3C 0%, #C99A3C 6%, #E3D3B2 7%, #FFF9EC 36%, #F2E5C8 58%, #D8C49C 93%, #B8892F 94%, #B8892F 100%)";
const SATIN_V =
  "linear-gradient(90deg, #C99A3C 0%, #C99A3C 6%, #E3D3B2 7%, #FFF9EC 36%, #F2E5C8 58%, #D8C49C 93%, #B8892F 94%, #B8892F 100%)";
// Молочная атласная подкладка шкатулки
const LINING =
  "radial-gradient(70% 60% at 30% 25%, #FFFDF8 0%, rgba(255,253,248,0) 70%), radial-gradient(80% 70% at 75% 80%, #EADFCB 0%, rgba(234,223,203,0) 70%), linear-gradient(160deg, #F8F1E4, #EFE4CF)";

/**
 * Заставка: голубая бархатная шкатулка, перевязанная атласной лентой, с золотым замочком.
 * Крышка — как верх чуст-дўппи: четыре золотые перчинки.
 * Нажатие → замочек отщёлкивается, лента развязывается → крышка поднимается (3D) →
 * изнутри поднимается золотой медальон с конём, за ним свет.
 */
export function Opening({ inv, name }: { inv: Invitation; name: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reached = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);

  function open() {
    if (phase !== "idle") return;
    inv.start();
    setPhase("untie");
    timers.current = TIMELINE.map(([p, ms]) => setTimeout(() => setPhase(p), ms));
    timers.current.push(setTimeout(inv.finishOpening, FINISH_MS));
  }

  const untie = reached("untie");

  return (
    <AnimatePresence>
      {!inv.opened && (
        <motion.div
          key="box"
          className="fixed inset-y-0 left-1/2 z-[29] flex w-full max-w-[430px] -translate-x-1/2 flex-col items-center justify-center overflow-hidden"
          style={{
            background: `radial-gradient(110% 70% at 50% 48%, #FFFDF8 0%, ${MILK} 55%, #E9ECF1 100%)`,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <QalampirBand id="op-top" className="absolute inset-x-0 top-[max(14px,env(safe-area-inset-top))] opacity-80" />
          <QalampirBand id="op-bottom" className="absolute inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] opacity-80" />

          <motion.div
            className="relative mb-[5svh] text-center"
            animate={{ opacity: reached("lift") ? 0 : 1, y: reached("lift") ? -10 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-display text-[18px] tracking-[0.06em] text-[#8A6420]">{t.occasionTitles.sunnat}</p>
            <p className="mt-1 font-display text-[clamp(28px,8.4vw,36px)] leading-tight font-medium text-balance" style={{ color: INK }}>
              {name}
            </p>
          </motion.div>

          <motion.button
            type="button"
            data-open
            onClick={open}
            aria-label={t.opening.tapToOpen}
            className="relative aspect-square w-[min(72vw,290px,42svh)] cursor-pointer [perspective:900px]"
            animate={reached("rise") ? { scale: 1.06 } : { scale: 1 }}
            transition={{ duration: 1.4, ease: SOFT }}
          >
            {/* тень шкатулки на столе */}
            <span
              aria-hidden
              className="absolute inset-x-[6%] -bottom-[9%] h-[16%] rounded-[50%] bg-[#2A4470]/30 blur-xl"
            />

            {/* корпус: бархатные стенки и молочная атласная подкладка */}
            <span aria-hidden className="absolute inset-0 overflow-hidden rounded-[26px] shadow-[0_26px_40px_-24px_rgba(29,50,86,0.75)]">
              <Velvet tone="deep" />
              <span
                className="absolute inset-[7.5%] overflow-hidden rounded-[18px]"
                style={{ background: LINING, boxShadow: "inset 0 10px 18px rgba(40,62,104,0.38), inset 0 -2px 6px rgba(255,255,255,0.6)" }}
              >
                {/* свет изнутри */}
                <motion.span
                  className="absolute inset-[-30%] rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,240,196,0.95) 0%, rgba(255,226,160,0.45) 30%, rgba(255,226,160,0) 62%)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: reached("lift") ? 1 : 0 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
                <motion.span
                  className="absolute inset-[-40%]"
                  style={{
                    background:
                      "repeating-conic-gradient(from 0deg, rgba(255,236,180,0.5) 0deg 5deg, rgba(255,236,180,0) 5deg 20deg)",
                    maskImage: "radial-gradient(circle, #000 18%, transparent 58%)",
                  }}
                  initial={{ opacity: 0, rotate: 0 }}
                  animate={reached("rise") ? { opacity: 0.9, rotate: 40 } : { opacity: 0, rotate: 0 }}
                  transition={{ opacity: { duration: 0.8 }, rotate: { duration: 3, ease: "linear" } }}
                />
                {/* бархатное гнездо под медальон */}
                <span
                  className="absolute top-1/2 left-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
                  style={{ boxShadow: "inset 0 6px 14px rgba(29,50,86,0.55)" }}
                >
                  <Velvet tone="deep" />
                </span>
              </span>
            </span>

            {/* медальон с конём поднимается из гнезда */}
            <motion.span
              aria-hidden
              className="absolute top-[19.5%] left-[19.5%] h-[61%] w-[61%] rounded-full shadow-[0_10px_18px_-8px_rgba(29,50,86,0.8)]"
              animate={
                reached("rise")
                  ? { scale: 1.22, y: "-6%", boxShadow: "0 24px 36px -14px rgba(29,50,86,0.6)" }
                  : { scale: 1, y: "0%" }
              }
              transition={{ duration: 1.3, ease: SOFT }}
            >
              <Medallion className="h-full w-full" />
              {/* блик пробегает по золоту */}
              <motion.span
                className="absolute inset-0 overflow-hidden rounded-full"
                initial={false}
                animate={reached("rise") ? { opacity: 1 } : { opacity: 0 }}
              >
                <motion.span
                  className="absolute inset-y-0 -left-full w-full"
                  style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,250,230,0.85) 50%, transparent 70%)" }}
                  animate={reached("rise") ? { x: "220%" } : { x: "0%" }}
                  transition={{ duration: 1.2, delay: 0.25, ease: "easeInOut" }}
                />
              </motion.span>
            </motion.span>

            {/* крышка на петлях у дальнего края. Две половины движения:
                лицом вверх до ребра (90°), затем изнанкой — молочный атлас (так надёжнее, чем backface-visibility) */}
            <motion.span
              aria-hidden
              className="absolute inset-[-1.5%] origin-top overflow-hidden rounded-[28px] shadow-[inset_0_-6px_10px_rgba(29,50,86,0.35),inset_0_3px_6px_rgba(255,255,255,0.45)]"
              style={{ transformPerspective: 900 }}
              animate={{ rotateX: reached("lift") ? -90 : 0, opacity: reached("lift") ? 0 : 1 }}
              transition={{
                rotateX: { duration: 0.55, ease: [0.55, 0, 1, 0.45] },
                opacity: { duration: 0.06, delay: reached("lift") ? 0.52 : 0 },
              }}
            >
              <Velvet />
              <LidOrnament />
            </motion.span>
            <motion.span
              aria-hidden
              className="absolute inset-[-1.5%] origin-top rounded-[28px]"
              style={{ transformPerspective: 900, background: LINING, boxShadow: "inset 0 0 0 6px #E4D6BB, inset 0 0 0 7px #C99A3C" }}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={
                reached("lift")
                  ? { rotateX: -118, opacity: reached("rise") ? 0 : 1 }
                  : { rotateX: -90, opacity: 0 }
              }
              transition={{
                rotateX: { duration: 0.7, delay: reached("lift") ? 0.55 : 0, ease: [0, 0.55, 0.45, 1] },
                opacity: { duration: reached("rise") ? 0.6 : 0.01, delay: reached("rise") ? 0.5 : reached("lift") ? 0.55 : 0 },
              }}
            />

            {/* лента крест-накрест: половинки разъезжаются */}
            <Ribbon untie={untie} />

            {/* золотой замочек на переднем краю */}
            <motion.span
              aria-hidden
              className="absolute bottom-[-4%] left-1/2 z-10 h-[17%] w-[15%] -translate-x-1/2 origin-top"
              animate={untie ? { rotateX: 75, y: 10, opacity: 0 } : { rotateX: 0, y: 0, opacity: 1 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <Clasp />
            </motion.span>
          </motion.button>

          <motion.div
            className="relative mt-[7svh] flex flex-col items-center gap-3"
            animate={{ opacity: phase === "idle" ? 1 : 0 }}
            transition={{ duration: 0.35 }}
          >
            <p className="soft-pulse font-body text-[17px] tracking-[0.04em] text-[#5A6C8C]">{t.opening.tapToOpen}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Узор на крышке: золотая нить по краю и четыре перчинки, смотрящие в углы (верх чуст-дўппи) */
function LidOrnament() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
      <rect x="9" y="9" width="182" height="182" rx="16" fill="none" stroke="url(#ot-gold)" strokeWidth="1.6" />
      <rect x="14" y="14" width="172" height="172" rx="12" fill="none" stroke="url(#ot-gold)" strokeWidth="0.6" strokeDasharray="1.4 2.6" />
      {[
        [56, 56, -45],
        [144, 56, 45],
        [144, 144, 135],
        [56, 144, 225],
      ].map(([x, y, a], i) => (
        <Qalampir key={a} transform={`translate(${x} ${y}) rotate(${a}) translate(0 24) scale(${i % 2 ? -0.78 : 0.78},0.78)`} inner="#2F4C7C" />
      ))}
    </svg>
  );
}

function Ribbon({ untie }: { untie: boolean }) {
  const go = (to: Record<string, string>, delay = 0) => ({
    animate: untie ? { ...to, opacity: 0 } : { x: "0%", y: "0%", opacity: 1 },
    transition: { duration: 0.75, delay: untie ? delay : 0, ease: EASE },
  });
  const band = "absolute shadow-[0_2px_4px_rgba(29,50,86,0.3)]";
  return (
    <span aria-hidden className="pointer-events-none absolute inset-[-3%] z-[5]">
      {/* по горизонтали */}
      <motion.span className={`${band} top-1/2 left-0 h-[12%] w-1/2 -translate-y-1/2`} style={{ background: SATIN_H }} {...go({ x: "-70%" }, 0.12)} />
      <motion.span className={`${band} top-1/2 right-0 h-[12%] w-1/2 -translate-y-1/2`} style={{ background: SATIN_H }} {...go({ x: "70%" }, 0.12)} />
      {/* по вертикали */}
      <motion.span className={`${band} top-0 left-1/2 h-1/2 w-[12%] -translate-x-1/2`} style={{ background: SATIN_V }} {...go({ y: "-70%" }, 0.2)} />
      <motion.span className={`${band} bottom-0 left-1/2 h-1/2 w-[12%] -translate-x-1/2`} style={{ background: SATIN_V }} {...go({ y: "70%" }, 0.2)} />

      {/* узел: атласная петля и два конца с вырезом «ласточкин хвост» */}
      <motion.span
        className="absolute top-1/2 left-1/2 h-[44%] w-[44%] -translate-x-1/2 -translate-y-1/2"
        animate={untie ? { scale: 0.4, rotate: -40, opacity: 0 } : { scale: 1, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <svg viewBox="-50 -50 100 100" className="h-full w-full overflow-visible drop-shadow-[0_3px_4px_rgba(29,50,86,0.4)]">
          <defs>
            <linearGradient id="ot-satin" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFBF1" />
              <stop offset="0.5" stopColor="#F1E4C7" />
              <stop offset="1" stopColor="#CDB68A" />
            </linearGradient>
            <linearGradient id="ot-satin-d" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E9DABA" />
              <stop offset="1" stopColor="#BFA674" />
            </linearGradient>
          </defs>
          {/* концы ленты */}
          <path d="M-6,8 L-30,44 L-22,42 L-20,51 L4,14 Z" fill="url(#ot-satin-d)" stroke="#B8892F" strokeWidth="0.9" />
          <path d="M6,8 L34,40 L26,40 L26,49 L-2,14 Z" fill="url(#ot-satin)" stroke="#B8892F" strokeWidth="0.9" />
          {/* петли */}
          <path d="M-4,-2 C-20,-22 -42,-18 -40,-2 C-38,12 -18,10 -4,4 Z" fill="url(#ot-satin)" stroke="#B8892F" strokeWidth="0.9" />
          <path d="M4,-2 C20,-22 42,-18 40,-2 C38,12 18,10 4,4 Z" fill="url(#ot-satin)" stroke="#B8892F" strokeWidth="0.9" />
          <path d="M-8,-1 C-18,-10 -30,-10 -32,-3" fill="none" stroke="#C9B48A" strokeWidth="1" />
          <path d="M8,-1 C18,-10 30,-10 32,-3" fill="none" stroke="#C9B48A" strokeWidth="1" />
          {/* сам узел */}
          <rect x="-9" y="-9" width="18" height="18" rx="5" fill="url(#ot-satin)" stroke="#B8892F" strokeWidth="1" />
          <path d="M-5,-6 C-2,-2 -2,2 -5,6 M5,-6 C2,-2 2,2 5,6" fill="none" stroke="#CDB68A" strokeWidth="0.9" />
        </svg>
      </motion.span>
    </span>
  );
}

/** Золотой замочек-накладка с замочной скважиной */
function Clasp() {
  return (
    <svg viewBox="0 0 40 46" className="h-full w-full drop-shadow-[0_3px_3px_rgba(29,50,86,0.45)]">
      <path d="M6 0 H34 V20 C34 34 26 42 20 45 C14 42 6 34 6 20 Z" fill="url(#ot-gold)" stroke="#8A6420" strokeWidth="1" />
      <path d="M10 3 H30 V20 C30 31 24 38 20 40.5 C16 38 10 31 10 20 Z" fill="none" stroke="#FFF3CC" strokeOpacity="0.7" strokeWidth="0.8" />
      <circle cx="20" cy="18" r="3.6" fill="#4A350E" />
      <path d="M18.4 20 L17.4 28 H22.6 L21.6 20 Z" fill="#4A350E" />
    </svg>
  );
}
