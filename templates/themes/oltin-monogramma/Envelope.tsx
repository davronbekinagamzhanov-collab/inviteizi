"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import { OpeningCaption } from "../../blocks/OpeningCaption";
import type { Invitation } from "../../blocks/useInvitation";
import { EmbossedPaper } from "./decor";
import { PAPER } from "./style";
import { MOTION } from "@/templates/blocks/motion";

const ORDER = ["idle", "crack", "open", "rise", "expand"] as const;
type Phase = (typeof ORDER)[number];

// Когда начинается каждая фаза, мс после нажатия
const TIMELINE: [Phase, number][] = [
  ["open", 450],
  ["rise", 1250],
  ["expand", 2150],
];
const FINISH_MS = 2900;


/**
 * Заставка: плотный конверт с золотой сургучной печатью.
 * Печать трескается → клапан открывается в 3D → карточка поднимается → раскрывается на весь экран.
 */
export function Envelope({ inv, initials }: { inv: Invitation; initials: [string, string] }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reached = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);

  function open() {
    if (phase !== "idle") return;
    inv.start();
    setPhase("crack");
    timers.current = TIMELINE.map(([p, ms]) => setTimeout(() => setPhase(p), ms));
    timers.current.push(setTimeout(inv.finishOpening, FINISH_MS));
  }

  return (
    <AnimatePresence>
      {!inv.opened && (
        <motion.div
          key="envelope"
          className="fixed inset-y-0 left-1/2 z-[29] flex w-full max-w-[430px] -translate-x-1/2 flex-col items-center justify-center overflow-hidden"
          style={{ background: PAPER }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION.fast, ease: MOTION.ease }}
        >
          <EmbossedPaper />

          <motion.div
            className="relative mb-9 px-6"
            animate={{ opacity: reached("rise") ? 0 : 1, y: reached("rise") ? -12 : 0 }}
            transition={{ duration: MOTION.fast, ease: MOTION.ease }}
          >
            <OpeningCaption
              inv={inv}
              nameClassName="gold-text font-display text-[34px] leading-[1.15] font-semibold"
              metaClassName="font-body text-[16px] tracking-[0.16em] text-muted"
            />
          </motion.div>

          <motion.button
            type="button"
            data-open
            onClick={open}
            aria-label={t.opening.tapToOpen}
            className="relative aspect-[3/2] w-[min(80vw,310px)] cursor-pointer [perspective:1100px]"
            animate={reached("expand") ? { scale: 1.15, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: MOTION.fast, ease: MOTION.ease }}
          >
            {/* задняя стенка */}
            <span
              className="absolute inset-0 rounded-[6px] shadow-[0_28px_50px_-22px_rgba(59,42,30,0.55),0_2px_6px_rgba(59,42,30,0.12)]"
              style={{ background: "linear-gradient(160deg,#E9DCC5,#DCCBAE)" }}
            />

            {/* карточка внутри конверта */}
            <motion.span
              className="absolute inset-x-[7%] top-[7%] bottom-[7%] z-[2] flex flex-col items-center justify-center rounded-[4px] shadow-md"
              style={{ background: PAPER }}
              animate={{ y: reached("rise") ? "-62%" : "0%" }}
              transition={{ duration: MOTION.base, ease: MOTION.ease }}
            >
              <span className="absolute inset-[6px] rounded-[2px] border border-[#B8892F]/50" />
              <span className="gold-text font-display text-[34px] leading-none font-semibold">
                {initials[0]}
                <span className="mx-1.5 text-[22px]">·</span>
                {initials[1]}
              </span>
            </motion.span>

            {/* передний карман: низ и бока */}
            <span
              className="absolute inset-0 z-[2] rounded-[6px]"
              style={{
                clipPath: "polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%)",
                background: "linear-gradient(175deg,#F2E7D4 0%,#E8D9BF 100%)",
                boxShadow: "inset 0 -10px 24px rgba(160,130,90,0.12)",
              }}
            />
            {/* линии сгибов */}
            <svg aria-hidden viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 z-[2] h-full w-full">
              <path d="M0 200 L150 108 L300 200" fill="none" stroke="#CDB894" strokeOpacity="0.55" strokeWidth="1" />
              <path d="M0 0 L150 108 L300 0" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1" />
            </svg>

            {/* клапан, открывается в 3D */}
            <motion.span
              className="absolute inset-x-0 top-0 h-[56%] origin-top [transform-style:preserve-3d]"
              // открытый клапан уходит за карточку, чтобы она поднималась поверх него
              style={{ zIndex: reached("rise") ? 1 : 3 }}
              animate={{ rotateX: reached("open") ? 180 : 0 }}
              transition={{ duration: MOTION.base, ease: MOTION.ease }}
            >
              <span
                className="absolute inset-0 [backface-visibility:hidden]"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  background: "linear-gradient(180deg,#EADCC4 0%,#E2D1B4 100%)",
                  filter: "drop-shadow(0 6px 6px rgba(59,42,30,0.18))",
                }}
              />
              <span
                className="absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)]"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  background: "linear-gradient(0deg,#E6D6BA 0%,#D6C3A1 100%)",
                }}
              />
            </motion.span>

            {/* сургучная печать на острие клапана */}
            <span className="absolute top-[56%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              {phase === "idle" && (
                <span className="absolute inset-[-10px] animate-ping rounded-full border border-[#B8892F]/50 [animation-duration:2.4s]" />
              )}
              <SealHalf side="left" cracked={phase !== "idle"} initials={initials} />
              <SealHalf side="right" cracked={phase !== "idle"} initials={initials} />
            </span>
          </motion.button>

          <motion.div
            data-open-prompt
            className="relative mt-12 flex flex-col items-center gap-3"
            animate={{ opacity: phase === "idle" ? 1 : 0 }}
            transition={{ duration: MOTION.fast, ease: MOTION.ease }}
          >
            <p className="soft-pulse font-body text-[17px] tracking-[0.18em] text-muted">{t.opening.tapToOpen}</p>
            <TapHint />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const WAX =
  "M38 2c5 0 7 3 11 4s8 0 11 3 2 7 4 10 6 5 6 10-3 7-3 11 3 7 1 11-6 5-9 8-3 7-7 9-8 0-13 1-7 4-12 3-6-4-10-6-8-1-10-5 0-8-2-12-6-5-6-10 4-7 4-11-3-7 0-10 7-3 10-5 4-7 9-8 6 0 9-1 4-4 7-4z";

// Половинки печати режутся по неровной линии излома
const CRACK_LEFT = "polygon(0 0, 54% 0, 47% 22%, 56% 41%, 45% 60%, 53% 79%, 48% 100%, 0 100%)";
const CRACK_RIGHT = "polygon(54% 0, 100% 0, 100% 100%, 48% 100%, 53% 79%, 45% 60%, 56% 41%, 47% 22%)";

function SealHalf({
  side,
  cracked,
  initials,
}: {
  side: "left" | "right";
  cracked: boolean;
  initials: [string, string];
}) {
  const dir = side === "left" ? -1 : 1;
  return (
    <motion.span
      className={`block h-[76px] w-[76px] ${side === "right" ? "absolute inset-0" : "relative"}`}
      style={{ clipPath: side === "left" ? CRACK_LEFT : CRACK_RIGHT }}
      animate={
        cracked
          ? { x: dir * 26, y: 46, rotate: dir * 24, opacity: 0 }
          : { x: 0, y: 0, rotate: 0, opacity: 1 }
      }
      transition={{ duration: MOTION.fast, ease: MOTION.ease, delay: 0.08 }}
    >
      <svg viewBox="0 0 76 76" className="h-full w-full">
        {/* тень под печатью и неровный край сургуча */}
        <path
          d={WAX}
          transform="translate(1.5 3)"
          fill="#5A3E12"
          fillOpacity="0.28"
        />
        <path
          d={WAX}
          fill="url(#om-wax)"
        />
        <circle cx="38" cy="38" r="25" fill="none" stroke="#8A6420" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="38" cy="38" r="22.5" fill="none" stroke="#FFF1C4" strokeOpacity="0.55" strokeWidth="0.8" />
        <text
          x="38"
          y="45"
          textAnchor="middle"
          fontFamily="var(--om-display)"
          fontSize="21"
          fontWeight="700"
          fill="#7A5718"
          style={{ filter: "drop-shadow(0 1px 0 rgba(255,240,200,0.7))" }}
        >
          {initials[0]}·{initials[1]}
        </text>
      </svg>
    </motion.span>
  );
}

/** Рука-подсказка: мягко «нажимает» */
function TapHint() {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 32 32"
      className="h-8 w-8"
      animate={{ y: [0, -5, 0], scale: [1, 0.94, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M12 16V7.5a2 2 0 0 1 4 0V14m0-1.5a2 2 0 0 1 4 0V15m0-1a2 2 0 0 1 4 0v5c0 4.5-3 8-7.5 8h-1c-3 0-4.6-1.3-6.2-3.6L6 19.5a2 2 0 0 1 3.2-2.4L12 20"
        fill="none"
        stroke="url(#om-gold)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
