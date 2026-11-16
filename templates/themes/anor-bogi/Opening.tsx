"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("anor-bogi");
import type { Invitation } from "../../blocks/useInvitation";
import { PhotoBackdrop } from "../../blocks/PhotoBackdrop";
import { HalfAnor, PaperGrain, PowderHalo, Seed, SeedRow, goldInk } from "./decor";
import { INK, PAPER, PAPER_DEEP } from "./style";

const ORDER = ["idle", "open", "zoom"] as const;
type Phase = (typeof ORDER)[number];

// Обложка поворачивается 1,5 с; потом раскрытая открытка «приближается» и растворяется в страницу
const ZOOM_MS = 1650;
const FINISH_MS = 2700;
const EASE = [0.65, 0, 0.35, 1] as const;

/**
 * Заставка «открытка-разворот»: закрытая открытка с фото гранатовой ветви и именами.
 * Нажатие — обложка поворачивается вокруг левого края (3D), внутри половинка анора
 * наполняется зёрнами; затем открытка приближается и тает в первый экран.
 */
export function CardOpening({
  inv,
  art,
  onReveal,
}: {
  inv: Invitation;
  art: string;
  /** Момент, когда первый экран начинает проявляться под открыткой */
  onReveal: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reached = (p: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(p);
  const { data, main } = inv;

  function open() {
    if (phase !== "idle") return;
    inv.start();
    setPhase("open");
    timers.current = [
      setTimeout(() => {
        setPhase("zoom");
        onReveal();
      }, ZOOM_MS),
      setTimeout(inv.finishOpening, FINISH_MS),
    ];
  }

  return (
    <AnimatePresence>
      {!inv.opened && (
        <motion.div
          key="card"
          className="fixed inset-0 z-[29] mx-auto flex w-full max-w-[430px] flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* фон заставки: пудра, растворяется, когда открытка «приближается» */}
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `radial-gradient(120% 80% at 50% 45%, ${PAPER} 0%, ${PAPER_DEEP} 100%)` }}
            animate={{ opacity: reached("zoom") ? 0 : 1 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
          <motion.div aria-hidden className="absolute inset-0" animate={{ opacity: reached("zoom") ? 0 : 1 }} transition={{ duration: 0.9 }}>
            <PaperGrain opacity={0.3} />
          </motion.div>

          <motion.p
            className="relative mb-[3.2svh] font-display text-[clamp(30px,5svh,36px)] leading-none italic"
            style={goldInk}
            animate={{ opacity: reached("open") ? 0 : 1, y: reached("open") ? -10 : 0 }}
            transition={{ duration: 0.5 }}
          >
            {t.opening.invitation}
          </motion.p>

          {/* открытка */}
          <div className="relative [perspective:1500px]">
            <motion.div
              className="relative aspect-[7/10] w-[min(78vw,318px,calc(61svh*0.7))]"
              animate={
                reached("zoom")
                  ? { x: "0%", scale: 1.5, opacity: 0 }
                  : reached("open")
                    ? { x: "24%", scale: 0.9, opacity: 1 }
                    : { x: "0%", scale: 1, opacity: 1 }
              }
              transition={
                reached("zoom")
                  ? { duration: 0.95, ease: [0.4, 0, 0.2, 1] }
                  : { duration: 1.5, ease: EASE }
              }
            >
              {/* внутренняя страница */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[3px] px-5 text-center shadow-[0_34px_60px_-28px_rgba(74,42,46,0.6),0_2px_6px_rgba(74,42,46,0.12)]"
                style={{ background: `linear-gradient(170deg, #FCF4F0 0%, ${PAPER} 100%)` }}
              >
                <span aria-hidden className="absolute inset-[9px] rounded-[2px] border border-[#B4893A]/45" />
                <HalfAnor draw={reached("open")} delay={0.35} className="w-[44%]" />
                <p className="mt-4 font-display text-[27px] leading-none italic" style={{ color: INK }}>
                  {t.opening.welcome}
                </p>
                <SeedRow className="mt-4" width="w-8" />
                {/* тень от обложки уходит, когда она открывается */}
                <motion.span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(90deg, rgba(74,42,46,0.28), rgba(74,42,46,0) 70%)" }}
                  animate={{ opacity: reached("open") ? 0 : 1 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>

              {/* обложка: поворачивается вокруг левого края */}
              <motion.div
                className="absolute inset-0 origin-left [transform-style:preserve-3d]"
                animate={reached("open") ? { rotateY: -172 } : { rotateY: [0, -11, 0] }}
                transition={
                  reached("open")
                    ? { duration: 1.5, ease: EASE }
                    : { duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.2, delay: 1.2 }
                }
              >
                {/* лицо */}
                <span
                  className="absolute inset-0 flex flex-col items-center justify-end overflow-hidden rounded-[3px] pb-[9%] [backface-visibility:hidden]"
                  style={{ background: PAPER }}
                >
                  <PhotoBackdrop
                    src={art}
                    color={PAPER}
                    fade="to-bottom"
                    strength={0.5}
                    position="24% 30%"
                    priority
                    className="absolute inset-x-0 top-0 h-[64%]"
                  />
                  <PaperGrain opacity={0.28} />
                  <span aria-hidden className="absolute inset-[9px] rounded-[2px] border border-[#B4893A]/55" />
                  <span aria-hidden className="absolute inset-[13px] rounded-[1px] border border-[#B4893A]/25" />

                  <PowderHalo className="bottom-[4%] left-1/2 h-[62%] w-[130%] -translate-x-1/2" />
                  <span className="relative flex flex-col items-center px-4 font-display leading-[0.98] italic" style={{ color: INK }}>
                    <span className="block max-w-full text-[clamp(30px,9vw,37px)] break-words">{data.groom}</span>
                    <span className="my-0.5 block text-[24px]" style={goldInk}>
                      {t.cover.and}
                    </span>
                    <span className="block max-w-full text-[clamp(30px,9vw,37px)] break-words">{data.bride}</span>
                  </span>
                  <SeedRow className="relative mt-3" width="w-7" />
                  <span className="relative mt-2 font-body text-[16px] tracking-[0.12em] text-muted lining-nums tabular-nums">
                    {t.date.short(main.when.day, main.when.monthIndex, main.when.year)}
                  </span>
                </span>

                {/* изнанка обложки */}
                <span
                  className="absolute inset-0 overflow-hidden rounded-[3px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{ background: `linear-gradient(200deg, #F9EEEA 0%, ${PAPER_DEEP} 100%)` }}
                >
                  <PaperGrain opacity={0.3} />
                  <span aria-hidden className="absolute inset-[9px] rounded-[2px] border border-[#B4893A]/30" />
                </span>
              </motion.div>

              {/* нажимаем на неподвижный слой поверх открытки: сама обложка «дышит» и поворачивается */}
              {phase === "idle" && (
                <button
                  type="button"
                  data-open
                  onClick={open}
                  aria-label={t.opening.tapToOpen}
                  className="absolute inset-0 z-10 cursor-pointer rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9E2338]"
                />
              )}
            </motion.div>
          </div>

          <motion.div
            className="relative mt-[3.6svh] flex items-center gap-3"
            animate={{ opacity: phase === "idle" ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            <Seed className="soft-pulse h-[13px] w-[11px]" rotate={-20} />
            <p data-open-prompt className="soft-pulse font-body text-[18px] tracking-[0.06em] text-muted italic">{t.opening.tapToOpen}</p>
            <Seed className="soft-pulse h-[13px] w-[11px]" rotate={20} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
