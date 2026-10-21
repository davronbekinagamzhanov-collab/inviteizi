"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "../../blocks/useInvitation";

const RISE_S = 2.1;
const FINISH_MS = 2500;
const EASE = [0.45, 0, 0.2, 1] as const;

/**
 * Заставка «рассвет»: мягкие предрассветные сине-лиловые тона (утро, не ночь — без звёзд и луны).
 * По нажатию снизу поднимается тёплое солнце, экран светлеет и проявляется картина.
 */
export function Dawn({ inv }: { inv: Invitation }) {
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
          key="dawn"
          type="button"
          data-open
          onClick={open}
          aria-label={t.opening.tapToOpen}
          className="fixed inset-y-0 left-1/2 z-[29] w-full max-w-[430px] -translate-x-1/2 cursor-pointer overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* предрассветное небо: тает, когда встаёт солнце */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #5D628F 0%, #847FAE 32%, #B9A3C4 58%, #E4BFB8 82%, #F3D4B6 100%)",
            }}
            animate={{ opacity: going ? 0 : 1 }}
            transition={{ duration: RISE_S * 0.85, delay: going ? 0.35 : 0, ease: EASE }}
          />
          {/* лёгкие перистые облака */}
          <motion.div
            className="absolute inset-x-0 top-[22%] h-24"
            style={{
              background:
                "radial-gradient(40% 50% at 25% 50%, rgba(255,226,214,0.35), transparent 70%), radial-gradient(35% 40% at 72% 30%, rgba(255,226,214,0.28), transparent 70%)",
            }}
            animate={{ opacity: going ? 0 : 1, x: going ? 30 : 0 }}
            transition={{ duration: RISE_S }}
          />

          {/* солнце: полукруг у горизонта → поднимается и заливает экран теплом */}
          <motion.div
            className="absolute left-1/2 h-[150px] w-[150px] -translate-x-1/2 rounded-full"
            style={{
              bottom: -75,
              background:
                "radial-gradient(circle, #FFF6DC 0%, #FFE1A0 38%, rgba(255,200,120,0.55) 60%, rgba(255,190,110,0) 72%)",
            }}
            animate={going ? { y: -420, scale: 9 } : { y: 0, scale: [1, 1.08, 1] }}
            transition={
              going
                ? { duration: RISE_S, ease: EASE }
                : { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }
          />

          <motion.div
            className="absolute inset-x-0 top-[30%] flex flex-col items-center px-8 text-center"
            animate={{ opacity: going ? 0 : 1, y: going ? -20 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[14px] tracking-[0.42em] text-[#FFF2DE]/85 uppercase">{t.opening.invitation}</p>
            <p className="mt-3 font-display text-[clamp(44px,13vw,56px)] leading-none font-bold text-[#FFF6E8] [text-shadow:0_2px_24px_rgba(70,50,110,0.45)]">
              {t.occasionTitles.nahorgi}
            </p>
            <div className="gold-fill mt-5 h-px w-24 opacity-80" />
          </motion.div>

          <motion.p
            className="soft-pulse absolute inset-x-0 bottom-[150px] text-center text-[17px] tracking-[0.16em] text-[#FFF6E8]"
            animate={{ opacity: going ? 0 : 1 }}
            transition={{ duration: 0.4 }}
          >
            {t.opening.tapToOpen}
          </motion.p>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
