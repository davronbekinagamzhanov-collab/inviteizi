"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import { Divider, Seal } from "./decor";

/**
 * Этапы открытия:
 * 0 — конверт закрыт, ждём нажатия
 * 1 — печать исчезает, клапан открывается
 * 2 — открытка выезжает из конверта
 * 3 — весь экран с конвертом растворяется
 */
type Stage = 0 | 1 | 2 | 3;

const EASE = [0.65, 0, 0.35, 1] as const;

export function Envelope({
  initials,
  onOpenStart,
  onOpened,
}: {
  initials: [string, string];
  /** Вызывается прямо в момент нажатия — здесь включаем музыку */
  onOpenStart: () => void;
  /** Конверт полностью исчез */
  onOpened: () => void;
}) {
  const [stage, setStage] = useState<Stage>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function open() {
    if (stage !== 0) return;
    onOpenStart();
    setStage(1);
    timers.current = [
      setTimeout(() => setStage(2), 850),
      setTimeout(() => setStage(3), 2300),
      setTimeout(onOpened, 3100),
    ];
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-primary-dark px-6"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--c-primary) 55%, transparent) 0%, transparent 70%)",
      }}
      animate={stage === 3 ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <motion.p
        className="mb-8 font-display text-xl tracking-[0.25em] text-gold-light/85 uppercase"
        animate={{ opacity: stage >= 1 ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        {t.opening.invitation}
      </motion.p>

      {/* Конверт */}
      <motion.button
        type="button"
        onClick={open}
        aria-label={t.opening.tapToOpen}
        className="relative aspect-[3/4] w-[min(82vw,340px)] cursor-pointer [perspective:1200px]"
        animate={stage === 3 ? { scale: 1.08, y: 20 } : { scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        whileTap={stage === 0 ? { scale: 0.97 } : undefined}
      >
        {/* задняя стенка */}
        <div
          className="absolute inset-0 rounded-md shadow-[0_25px_50px_rgba(0,0,0,0.5)]"
          style={{ background: "linear-gradient(160deg, var(--c-primary), var(--c-primary-dark))" }}
        />

        {/* открытка внутри */}
        <motion.div
          className="absolute inset-x-[7%] top-[6%] bottom-[6%] flex flex-col items-center justify-center rounded-sm bg-paper px-4 text-center shadow-md"
          style={{ zIndex: stage >= 2 ? 3 : 1 }}
          initial={false}
          animate={stage >= 2 ? { y: "-50%" } : { y: "0%" }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <Divider className="w-28 text-gold" />
          <p className="mt-2 font-script text-5xl leading-tight text-primary">
            {initials[0]} &amp; {initials[1]}
          </p>
        </motion.div>

        {/* передний карман с вырезом-«галочкой» */}
        <div
          className="absolute inset-0 rounded-md"
          style={{
            zIndex: 4,
            clipPath: "polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--c-primary) 88%, white) 0%, var(--c-primary) 55%, color-mix(in srgb, var(--c-primary) 80%, black) 100%)",
          }}
        />
        {/* золотые линии кармана */}
        <svg
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ zIndex: 4 }}
          aria-hidden
        >
          <path d="M0 0 L150 184 L300 0" fill="none" stroke="var(--c-gold)" strokeOpacity="0.55" strokeWidth="1.2" />
          <rect x="10" y="10" width="280" height="380" fill="none" stroke="var(--c-gold)" strokeOpacity="0.3" strokeWidth="1" rx="3" />
        </svg>

        {/* верхний клапан: поворачивается и открывается */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[58%] origin-top"
          style={{ zIndex: stage >= 2 ? 2 : 5, transformStyle: "preserve-3d" }}
          initial={false}
          animate={{ rotateX: stage >= 1 ? 180 : 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div
            className="absolute inset-0 [backface-visibility:hidden]"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--c-primary) 75%, black), var(--c-primary))",
            }}
          />
          <svg
            viewBox="0 0 300 232"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full [backface-visibility:hidden]"
            aria-hidden
          >
            <path d="M0 0 L150 232 L300 0" fill="none" stroke="var(--c-gold)" strokeWidth="1.5" />
          </svg>
          {/* обратная сторона клапана (видна после поворота) */}
          <div
            className="absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)]"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              background: "color-mix(in srgb, var(--c-primary) 70%, black)",
            }}
          />
        </motion.div>

        {/* сургучная печать */}
        <motion.div
          className="absolute left-1/2 top-[58%] h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2"
          style={{ zIndex: 6 }}
          initial={false}
          animate={stage >= 1 ? { scale: 1.35, opacity: 0, rotate: -12 } : { scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Seal initials={initials} />
        </motion.div>
      </motion.button>

      <motion.div animate={{ opacity: stage >= 1 ? 0 : 1 }} transition={{ duration: 0.4 }}>
        <p className="soft-pulse mt-10 flex items-center gap-2 text-[15px] font-medium tracking-wide text-gold-light">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            fill="currentColor"
            d="M9 11.2V6.5a1.5 1.5 0 0 1 3 0v4.2l4.6.9c1 .2 1.7 1.1 1.6 2.1l-.5 4.6A2 2 0 0 1 15.7 20H11a2 2 0 0 1-1.6-.8l-3.2-4.3a1.4 1.4 0 0 1 2.1-1.8L9 13.8z"
          />
        </svg>
        {t.opening.tapToOpen}
        </p>
      </motion.div>
    </motion.div>
  );
}
