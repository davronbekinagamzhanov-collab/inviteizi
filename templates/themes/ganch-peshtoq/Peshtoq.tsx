"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "../../blocks/useInvitation";
import { Kitoba, PeshtoqArt, archPath, peshtoqGeo, starPoints, useSize, type Peshtoq } from "./decor";
import { PLASTER, SURFACE } from "./style";

const EASE = [0.65, 0, 0.35, 1] as const;
const SOFT = [0.22, 1, 0.36, 1] as const;
// Когда после нажатия всё готово: решётки ушли в стены, свет осел, имена проявились
const FINISH_MS = 2700;
// Когда проявляются имена (решётки к этому моменту разошлись наполовину)
const TEXT_AT = 1.05;

/** Детерминированный «случайный» разброс (одинаковый на сервере и в браузере) */
const rnd = (i: number, s: number) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Длина имени → кегль, чтобы имя встало в проём арки одной строкой */
const nameSize = (name: string, max: number) =>
  `clamp(28px, min(calc(100cqw / ${(Math.max(name.length, 4) * 0.6).toFixed(2)}), ${max}svh), 60px)`;

/**
 * Первый экран: резной ганч-пештоқ на весь экран.
 * До нажатия проём закрыт двумя резными решётками-панжара; нажатие — решётки уходят в стены,
 * из проёма льётся тёплый свет и золотая пыль, внутри проявляются имена.
 */
export function Cover({ inv }: { inv: Invitation }) {
  const [ref, size] = useSize<HTMLElement>();
  const g = peshtoqGeo(size.w || 375, size.h || 812);
  const { arch } = g;
  const nicheH = arch.bottom - arch.ay;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const on = inv.started;
  // Без заставки (уже открыто) — текст сразу, без задержки
  const base = inv.opened ? 0 : TEXT_AT;
  const show = (i: number) => ({
    initial: { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: on ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 12, filter: "blur(6px)" },
    transition: { duration: 1, delay: on ? base + i * 0.14 : 0, ease: SOFT },
  });

  function open() {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, FINISH_MS);
  }

  const { data } = inv;
  const { when } = inv.main;
  const contentTop = g.mqEnd + 12;
  const nicheBox = { left: arch.L, top: arch.ay, width: g.aw, height: nicheH };
  const clip = `path('${archPath({ L: 0, R: g.aw, ay: 0, sy: arch.sy - arch.ay, bottom: nicheH })}')`;

  return (
    <header ref={ref} className="relative h-svh min-h-[600px] overflow-hidden" style={{ background: PLASTER }}>
      <PeshtoqArt g={g} idp="gpc" />

      {/* Живая деталь: по рельефу медленно проходит полоса света */}
      {inv.opened && <LightSweep />}

      {/* Тёплый свет из проёма */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          ...nicheBox,
          clipPath: clip,
          background: "radial-gradient(70% 55% at 50% 58%, rgba(255,243,214,0.95), rgba(255,226,170,0.55) 45%, rgba(255,226,170,0) 80%)",
        }}
        initial={{ opacity: 0 }}
        animate={on ? { opacity: inv.opened ? 0.45 : [0, 1, 0.45] } : { opacity: 0 }}
        transition={{ duration: 2.4, times: [0, 0.4, 1], delay: inv.opened ? 0 : 0.2, ease: "easeInOut" }}
      />

      {/* Текст внутри арки */}
      <div
        className="absolute flex flex-col items-center px-4 text-center"
        style={{ left: arch.L, width: g.aw, top: contentTop, height: arch.bottom - contentTop - 8 }}
      >
        <div className="flex w-full flex-1 flex-col items-center justify-center pb-10 @container">
          <motion.p {...show(0)} className="text-[17px] text-muted italic">
            {t.occasionTitles[inv.occasion]}
          </motion.p>
          <motion.h1 {...show(1)} className="mt-[1.6svh] w-full font-display leading-[1.02] font-medium text-ink">
            <span className="block" style={{ fontSize: nameSize(data.groom ?? "", 8.4) }}>
              {data.groom}
            </span>
            <span className="my-[0.6svh] flex items-center justify-center gap-3 font-body text-[20px] font-normal text-muted italic">
              <span className="gold-fill h-px w-9" />
              {t.cover.andWord}
              <span className="gold-fill h-px w-9" />
            </span>
            <span className="block" style={{ fontSize: nameSize(data.bride ?? "", 8.4) }}>
              {data.bride}
            </span>
          </motion.h1>

          <motion.div {...show(2)} className="mt-[3svh] flex flex-col items-center">
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4">
              <polygon points={starPoints(10, 10, 9.5, 0.62)} fill="url(#gp-gold)" />
            </svg>
            <p className="mt-[1.4svh] text-[17px] text-muted">{t.weekdays[when.weekdayIndex]}</p>
            <p className="font-display text-[clamp(22px,3.4svh,27px)] leading-tight font-medium lining-nums tabular-nums">
              {t.date.long(when.day, when.monthIndex, when.year)}
            </p>
          </motion.div>
        </div>

        <motion.div
          aria-hidden
          className="absolute bottom-3 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={inv.opened ? { opacity: 0.75, y: [0, 5, 0] } : { opacity: 0 }}
          transition={{ opacity: { delay: 0.4 }, y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="url(#gp-gold)" strokeWidth={1.5}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.div>
      </div>

      {!inv.opened && (
        <>
          <GoldDust g={g} active={on} />
          <motion.button
            type="button"
            data-open
            onClick={open}
            aria-label={t.opening.tapToOpen}
            className="absolute cursor-pointer overflow-hidden"
            style={{ ...nicheBox, clipPath: clip }}
          >
            {/* полумрак за решёткой: уходит, когда льётся свет */}
            <motion.span
              aria-hidden
              className="absolute inset-0"
              style={{ background: "radial-gradient(80% 60% at 50% 55%, rgba(120,96,62,0.10), rgba(90,70,45,0.32))" }}
              animate={{ opacity: on ? 0 : 1 }}
              transition={{ duration: 1.2, delay: 0.3 }}
            />
            <Screen side="left" w={g.aw / 2} h={nicheH} on={on} initial={data.groom?.charAt(0) ?? ""} />
            <Screen side="right" w={g.aw / 2} h={nicheH} on={on} initial={data.bride?.charAt(0) ?? ""} />

            <motion.span
              className="absolute bottom-[7%] left-1/2 block w-[min(84%,240px)] -translate-x-1/2"
              animate={{ opacity: on ? 0 : 1, y: on ? 8 : 0 }}
              transition={{ duration: 0.35 }}
            >
              <Kitoba className="w-full">
                <span className="flex flex-col items-center px-8 pt-3.5 pb-3">
                  <span className="font-display text-[27px] leading-none font-medium text-ink">{t.opening.invitation}</span>
                  <span className="soft-pulse mt-1.5 text-[16px] text-muted italic">{t.opening.tapToOpen}</span>
                </span>
              </Kitoba>
            </motion.span>
          </motion.button>
        </>
      )}
    </header>
  );
}

/** Створка-панжара: резная решётка с рамой и половинкой медальона-замка у шва */
function Screen({ side, w, h, on, initial }: { side: "left" | "right"; w: number; h: number; on: boolean; initial: string }) {
  const left = side === "left";
  const s = 9; // ширина рамы
  const my = h * 0.46; // высота медальона
  const ring = `M0 0H${w}V${h}H0Z M${s} ${s}V${h - s}H${w - s}V${s}Z`;
  return (
    <motion.span
      className="absolute top-0 block h-full overflow-hidden"
      style={{ width: w, left: left ? 0 : w, filter: "drop-shadow(0 6px 10px rgba(70,57,45,0.22))" }}
      initial={false}
      animate={{ x: on ? (left ? "-103%" : "103%") : "0%" }}
      transition={{ duration: 1.7, delay: on ? 0.2 : 0, ease: EASE }}
    >
      <svg aria-hidden viewBox={`0 0 ${w} ${h}`} className={`absolute inset-0 h-full w-full ${left ? "" : "-scale-x-100"}`}>
        {/* тёплая подложка: сквозь отверстия видна тень проёма, а не то, что за решёткой */}
        <rect width={w} height={h} fill="url(#gp-behind)" />
        <g filter="url(#gp-relief)">
          <rect width={w} height={h} fill={PLASTER} mask="url(#gp-lattice)" />
          <path d={ring} fill={SURFACE} fillRule="evenodd" />
          {/* перекладины рамы над и под медальоном */}
          <rect x={s} y={my - 60} width={w - s} height={6} fill={SURFACE} />
          <rect x={s} y={my + 54} width={w - s} height={6} fill={SURFACE} />
        </g>
        <rect x={s + 3} y={s + 3} width={w - 2 * s - 3} height={h - 2 * s - 6} fill="none" stroke="url(#gp-gold)" strokeWidth={0.7} opacity={0.75} />
        {/* медальон-замок на шве */}
        <g transform={`translate(${w} ${my})`}>
          <circle r={50} fill={SURFACE} />
          <circle r={50} fill="none" stroke="#B5A68F" strokeWidth={1.4} transform="translate(0.8 1)" />
          <polygon points={starPoints(0, 0, 44, 0.78)} fill="none" stroke="url(#gp-gold)" strokeWidth={1.4} />
          <circle r={32} fill="#EFE8DC" />
          <circle r={32} fill="none" stroke="url(#gp-gold)" strokeWidth={0.9} />
        </g>
      </svg>
      <span
        className="gold-text absolute font-display text-[34px] leading-none font-semibold"
        style={{ top: my, transform: "translateY(-55%)", ...(left ? { right: 7 } : { left: 7 }) }}
      >
        {initial}
      </span>
    </motion.span>
  );
}

/** Золотая пыль: вылетает из проёма и тает в свете */
function GoldDust({ g, active }: { g: Peshtoq; active: boolean }) {
  if (!active) return null;
  const { arch, aw } = g;
  const cx = (arch.L + arch.R) / 2;
  const nicheH = arch.bottom - arch.ay;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {Array.from({ length: 34 }, (_, i) => {
        const size = 2 + rnd(i, 1) * 3.5;
        const x = cx + (rnd(i, 2) - 0.5) * aw * 0.75;
        const y = arch.ay + nicheH * (0.4 + rnd(i, 3) * 0.45);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: x,
              top: y,
              width: size,
              height: size,
              background: "radial-gradient(circle at 35% 35%, #FFF6D8, #F0DCA4 40%, #B08A45 75%, rgba(140,106,44,0) 100%)",
            }}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 0.9, 0],
              x: (rnd(i, 4) - 0.5) * 70,
              y: -(90 + rnd(i, 5) * 220),
              scale: [0.6, 1, 0.4],
            }}
            transition={{ duration: 1.8 + rnd(i, 6) * 1.1, delay: 0.35 + rnd(i, 7) * 0.9, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/** Полоса света, медленно скользящая по ганчу (раз в несколько секунд) */
export function LightSweep() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-soft-light">
      <motion.div
        className="absolute -top-1/4 h-[150%] w-[42%]"
        style={{
          rotate: 14,
          background:
            "linear-gradient(90deg, rgba(255,240,205,0) 0%, rgba(255,240,205,0.55) 35%, rgba(255,250,235,1) 50%, rgba(255,240,205,0.55) 65%, rgba(255,240,205,0) 100%)",
        }}
        initial={{ x: "-140%" }}
        animate={{ x: ["-140%", "360%"] }}
        transition={{ duration: 5.5, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut", delay: 0.6 }}
      />
    </div>
  );
}
