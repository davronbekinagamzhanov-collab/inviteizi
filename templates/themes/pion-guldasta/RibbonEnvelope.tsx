"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("pion-guldasta");
import type { Invitation } from "../../blocks/useInvitation";
import { OpeningCaption } from "../../blocks/OpeningCaption";
import { Bow } from "./decor";
import { CREAM } from "./style";
import { MOTION } from "@/templates/blocks/motion";

const FINISH_MS = 2700;

const SATIN_H = "linear-gradient(180deg, #4E1220 0%, #7E2537 30%, #B5536A 50%, #7E2537 70%, #4E1220 100%)";
const SATIN_V = "linear-gradient(90deg, #4E1220 0%, #7E2537 30%, #B5536A 50%, #7E2537 70%, #4E1220 100%)";
const PAPER = "linear-gradient(160deg, #F7DDD9 0%, #EFC9C4 55%, #E8BDB8 100%)";

/**
 * Заставка: конверт цвета пудры, перевязанный бордовой атласной лентой с бантом.
 * Бант развязывается → ленты скользят в стороны → половинки конверта расходятся → «вырастает» букет.
 */
export function RibbonEnvelope({ inv, age }: { inv: Invitation; age?: number }) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const going = inv.started;

  function open() {
    if (going) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, FINISH_MS);
  }

  // половинки ленты и конверта: [куда уходят, задержка]
  const slide = (to: Record<string, number | string>, delay: number) => ({
    animate: going ? { ...to, opacity: 0 } : {},
    transition: { duration: MOTION.base, delay: going ? delay : 0, ease: MOTION.ease },
  });

  return (
    <AnimatePresence>
      {!inv.opened && (
        <motion.div
          key="ribbon"
          className="fixed inset-y-0 left-1/2 z-[29] flex w-full max-w-[430px] -translate-x-1/2 flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION.fast, ease: MOTION.ease }}
        >
          {/* фон заставки тает к концу, открывая букет */}
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(120% 70% at 50% 20%, #FFFFFF 0%, ${CREAM} 45%, #F6E4E1 100%)` }}
            animate={{ opacity: going ? 0 : 1 }}
            transition={{ duration: MOTION.base, ease: MOTION.ease, delay: going ? 1.45 : 0 }}
          />

          <motion.div
            className="relative mb-8 px-6"
            animate={{ opacity: going ? 0 : 1 }}
            transition={{ duration: MOTION.fast, ease: MOTION.ease }}
          >
            <OpeningCaption
              inv={inv}
              nameClassName="font-display text-[36px] leading-[1.15] text-[#6E1E2E]"
              metaClassName="text-[17px] tracking-[0.08em] text-[#8C6A6E]"
            />
          </motion.div>

          <button
            type="button"
            data-open
            onClick={open}
            aria-label={t.opening.tapToOpen}
            className="relative aspect-[4/3] w-[min(78vw,310px)] cursor-pointer"
          >
            {/* верхняя и нижняя половины конверта (с кусками вертикальной ленты) */}
            <motion.span
              className="absolute inset-x-0 top-0 h-1/2 rounded-t-[10px] shadow-[0_-2px_12px_rgba(110,30,46,0.08)]"
              style={{ background: PAPER }}
              {...slide({ y: -260, rotate: -5 }, 0.95)}
            >
              <span className="absolute inset-y-0 left-1/2 w-[26px] -translate-x-1/2" style={{ background: SATIN_V }} />
              <span className="absolute inset-[8px] bottom-0 rounded-t-[6px] border border-b-0 border-[#B8892F]/35" />
            </motion.span>
            <motion.span
              className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-[10px] shadow-[0_24px_40px_-20px_rgba(110,30,46,0.55)]"
              style={{ background: PAPER }}
              {...slide({ y: 260, rotate: 4 }, 0.95)}
            >
              <span className="absolute inset-y-0 left-1/2 w-[26px] -translate-x-1/2" style={{ background: SATIN_V }} />
              <span className="absolute inset-[8px] top-0 rounded-b-[6px] border border-t-0 border-[#B8892F]/35" />
            </motion.span>

            {/* горизонтальная лента: половинки скользят в стороны */}
            <motion.span className="absolute top-1/2 left-0 h-[26px] w-1/2 -translate-y-1/2" style={{ background: SATIN_H }} {...slide({ x: -260 }, 0.45)} />
            <motion.span className="absolute top-1/2 right-0 h-[26px] w-1/2 -translate-y-1/2" style={{ background: SATIN_H }} {...slide({ x: 260 }, 0.45)} />

            {/* бант развязывается: петли сжимаются и исчезают */}
            <motion.span
              className="absolute top-1/2 left-1/2 w-[150px] -translate-x-1/2 -translate-y-[46%]"
              animate={going ? { scale: 0.2, rotate: 25, opacity: 0 } : { scale: [1, 1.04, 1] }}
              transition={going ? { duration: 0.55, ease: [0.5, 0, 0.75, 0] } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Bow className="h-auto w-full drop-shadow-[0_6px_8px_rgba(78,18,32,0.35)]" />
            </motion.span>

            {/* золотая цифра на конверте */}
            {age && (
              <motion.span
                className="gold-text absolute right-5 bottom-3 font-display text-[30px] font-semibold italic"
                animate={{ opacity: going ? 0 : 1 }}
                transition={{ duration: MOTION.fast, ease: MOTION.ease }}
              >
                {age}
              </motion.span>
            )}
          </button>

          <motion.p
            className="soft-pulse relative mt-10 text-[17px] tracking-[0.14em] text-[#8C6A6E]"
            animate={{ opacity: going ? 0 : 1 }}
            transition={{ duration: MOTION.fast, ease: MOTION.ease }}
          >
            {t.opening.tapToOpen}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
