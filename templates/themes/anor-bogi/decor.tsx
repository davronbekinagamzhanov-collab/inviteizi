"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { PAPER } from "./style";

/** Градиенты дизайна: золото (5 стопов с бликом), зерно граната, румянец кожуры. Один раз на страницу */
export function GardenDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="ab-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8E6A26" />
          <stop offset="0.3" stopColor="#B4893A" />
          <stop offset="0.5" stopColor="#F2D898" />
          <stop offset="0.72" stopColor="#B4893A" />
          <stop offset="1" stopColor="#8E6A26" />
        </linearGradient>
        {/* зерно: светлый блик сверху-слева, тёмная глубина снизу */}
        <radialGradient id="ab-seed" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#F7A3AC" />
          <stop offset="0.3" stopColor="#D43D57" />
          <stop offset="0.7" stopColor="#9E2338" />
          <stop offset="1" stopColor="#5E0F1E" />
        </radialGradient>
        {/* кожура целого плода */}
        <radialGradient id="ab-rind" cx="0.38" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#F0A08C" />
          <stop offset="0.45" stopColor="#C8443F" />
          <stop offset="1" stopColor="#7E1A28" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Золото для текста на пудре: темнее общего .gold-text, чтобы блик не терялся на светлом фоне */
export const goldInk: CSSProperties = {
  backgroundImage: "linear-gradient(100deg, #8A6524 0%, #B98E3F 36%, #E2C27C 50%, #B4893A 64%, #7C5A1D 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/** Форма зерна граната (центр 0,0; высота ~10.4) */
export const SEED = "M0 -5.2 C 2.8 -4.7 4.4 -1.7 4 1.3 C 3.6 4 1.7 5.2 0 5.2 C -1.7 5.2 -3.6 4 -4 1.3 C -4.4 -1.7 -2.8 -4.7 0 -5.2 Z";

function SeedShape({ highlight = true }: { highlight?: boolean }) {
  return (
    <>
      <path d={SEED} fill="url(#ab-seed)" />
      {highlight && <ellipse cx="-1.4" cy="-2.1" rx="0.85" ry="1.4" fill="#fff" fillOpacity="0.7" transform="rotate(-18 -1.4 -2.1)" />}
    </>
  );
}

/** Одно зерно — для строк и разделителей */
export function Seed({ className = "", rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <svg aria-hidden viewBox="-5 -6 10 12" className={className}>
      <g transform={`rotate(${rotate})`}>
        <SeedShape />
      </g>
    </svg>
  );
}

/** Разделитель: тонкие золотые линии и три зерна (среднее крупнее) */
export function SeedRow({ className = "", width = "w-14" }: { className?: string; width?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-2.5 ${className}`}>
      <span className={`gold-fill h-px ${width} opacity-80`} />
      <svg viewBox="0 0 40 14" className="h-[14px] w-10">
        <g transform="translate(8 8) rotate(-28) scale(0.78)">
          <SeedShape />
        </g>
        <g transform="translate(20 7) scale(1.08)">
          <SeedShape />
        </g>
        <g transform="translate(32 8) rotate(28) scale(0.78)">
          <SeedShape />
        </g>
      </svg>
      <span className={`gold-fill h-px ${width} opacity-80`} />
    </div>
  );
}

/** Зерно-точка в строке текста (вместо «·») */
export function InlineSeed() {
  return <Seed className="mx-2.5 inline-block h-[11px] w-[9px] -translate-y-[1px] align-middle" />;
}

// ─── Анор ───

// Плод: круглое тело (центр 60,72; r 46) и корона-чашечка сверху
const CX = 60;
const CY = 72;
const FRUIT =
  "M48.3 27.5 C 47.6 24, 46.2 19.6, 44.6 16.4 C 48 17.6, 50.6 19.2, 52.6 21 C 53.4 17.2, 54.6 13.6, 56.4 10.8 C 57.8 13.4, 59 16, 60 19 C 61 16, 62.2 13.4, 63.6 10.8 C 65.4 13.6, 66.6 17.2, 67.4 21 C 69.4 19.2, 72 17.6, 75.4 16.4 C 73.8 19.6, 72.4 24, 71.7 27.5 A 46 46 0 1 1 48.3 27.5 Z";

// Перепонки внутри разреза: делят зёрна на гнёзда
const PITH = [
  "M60 35 C 55 48, 66 58, 60 72",
  "M60 72 C 48 76, 40 86, 28 90",
  "M60 72 C 72 77, 82 84, 92 90",
  "M27 60 C 37 62, 45 64, 51 69",
  "M60 72 C 62 86, 57 98, 60 108",
];

type SeedSpot = { x: number; y: number; r: number; d: number };

// Зёрна по сотам внутри круга r 35; поворот и задержка — от расстояния до центра
const SEEDS: SeedSpot[] = (() => {
  const out: SeedSpot[] = [];
  const step = 6.4;
  let row = 0;
  for (let y = CY - 36; y <= CY + 36; y += step * 0.86, row++) {
    for (let x = CX - 36 + (row % 2 ? step / 2 : 0); x <= CX + 36; x += step) {
      const dist = Math.hypot(x - CX, y - CY);
      if (dist > 34.5) continue;
      const ang = (Math.atan2(y - CY, x - CX) * 180) / Math.PI + 90;
      out.push({ x: +x.toFixed(2), y: +y.toFixed(2), r: +(ang + ((out.length * 37) % 40) - 20).toFixed(1), d: dist });
    }
  }
  return out;
})();

/**
 * Половинка анора в разрезе: золотой контур, гнёзда зёрен, перепонки.
 * draw — контур прорисовывается линией, затем зёрна «наполняют» плод от центра к краю.
 */
export function HalfAnor({ draw = true, className = "", delay = 0 }: { draw?: boolean; className?: string; delay?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 120 124" className={className}>
      {/* мякоть разреза — чуть светлее пудры */}
      <motion.circle
        cx={CX}
        cy={CY}
        r={40}
        fill="#FBF1EC"
        initial={{ opacity: 0 }}
        animate={{ opacity: draw ? 1 : 0 }}
        transition={{ duration: 0.6, delay: draw ? delay + 0.2 : 0 }}
      />
      {SEEDS.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y}) rotate(${s.r}) scale(0.6)`}>
          <g
            className="motion-reduce:!transition-none"
            style={{
              transform: draw ? "scale(1)" : "scale(0)",
              opacity: draw ? 1 : 0,
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: `transform 0.45s cubic-bezier(0.34,1.5,0.5,1) ${delay + 0.5 + s.d * 0.022}s, opacity 0.3s ease-out ${delay + 0.5 + s.d * 0.022}s`,
            }}
          >
            <SeedShape highlight={i % 3 !== 1} />
          </g>
        </g>
      ))}
      {PITH.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="#FBF1EC"
          strokeWidth={2.2}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: draw ? 1 : 0 }}
          transition={{ duration: 0.4, delay: draw ? delay + 1.2 : 0 }}
        />
      ))}
      {/* кожура: контур плода и внутренняя линия разреза */}
      <motion.circle
        cx={CX}
        cy={CY}
        r={40.5}
        fill="none"
        stroke="url(#ab-gold)"
        strokeWidth={0.8}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: draw ? 1 : 0, opacity: draw ? 0.8 : 0 }}
        transition={{ duration: 1.1, delay: draw ? delay + 0.25 : 0, ease: [0.45, 0, 0.2, 1] }}
      />
      <motion.path
        d={FRUIT}
        fill="none"
        stroke="url(#ab-gold)"
        strokeWidth={1.4}
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: draw ? 1 : 0, opacity: draw ? 1 : 0 }}
        transition={{ duration: 1.3, delay: draw ? delay : 0, ease: [0.45, 0, 0.2, 1] }}
      />
    </svg>
  );
}

/** Целый плод тонкой линией — рамка для числа в «Тўй санаси» */
export function AnorOutline({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 124" className={className} fill="none" stroke="url(#ab-gold)">
      <path d={FRUIT} strokeWidth={0.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* второй контур тоньше — «тиснение» */}
      <path
        d={FRUIT}
        strokeWidth={0.6}
        strokeOpacity={0.45}
        transform="translate(60 72) scale(0.94) translate(-60 -72)"
        vectorEffect="non-scaling-stroke"
      />
      {/* листик на чашечке */}
      <path
        d="M66 22 C 72 12, 84 8, 94 10 C 88 18, 78 22, 66 22 Z M66 22 C 76 17, 84 13, 94 10"
        strokeWidth={0.75}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Маленький целый плод с румяной кожурой — узел на ветке «Тўй дастури» */
export function FruitNode({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="10 6 100 116" className={className}>
      <path d={FRUIT} fill="url(#ab-rind)" />
      <path d={FRUIT} fill="none" stroke="url(#ab-gold)" strokeWidth={2.6} strokeLinejoin="round" />
      {/* блик на боку */}
      <path d="M38 58 C 40 48, 46 41, 54 38" fill="none" stroke="#FFE7DC" strokeOpacity={0.75} strokeWidth={3.5} strokeLinecap="round" />
    </svg>
  );
}

/** Узкий лист граната (ланцет) с жилкой */
const LEAF = "M0 0 C 5 -3.6, 14 -4, 22 0 C 14 4, 5 3.6, 0 0 Z";

/**
 * Гребень рамки «Оқ фотиҳа»: в центре плод, в стороны — ветки с узкими листьями,
 * на концах — цветки граната. Лежит на верхней линии рамки.
 */
export function BranchCrest({ className = "" }: { className?: string }) {
  const leaves: [number, number, number, number][] = [
    [93, 37, 158, 0.92],
    [80, 40, 212, 0.88],
    [64, 39, 150, 0.82],
    [49, 34, 206, 0.76],
    [33, 28, 152, 0.68],
  ];
  const branch = (
    <>
      <path d="M104 34 C 86 41, 62 41, 40 32 S 16 22, 10 24" stroke="url(#ab-gold)" strokeWidth={1.1} strokeLinecap="round" fill="none" />
      {leaves.map(([x, y, r, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path d={LEAF} fill="url(#ab-gold)" fillOpacity={0.16} stroke="url(#ab-gold)" strokeWidth={0.9} />
          <path d="M1.5 0 H19" stroke="url(#ab-gold)" strokeWidth={0.5} />
        </g>
      ))}
      {/* цветок граната: чашечка-колокольчик и мятые лепестки */}
      <g transform="translate(9 24) rotate(-72)">
        <path d="M-3.6 0 C -3.6 -5, 3.6 -5, 3.6 0 L 2.6 6 L -2.6 6 Z" fill="url(#ab-rind)" />
        <path d="M-4.6 -1 C -8.4 -5.4, -6.6 -10.4, -2.8 -8.6 C -1.8 -12.2, 1.8 -12.2, 2.8 -8.6 C 6.6 -10.4, 8.4 -5.4, 4.6 -1" fill="#D84A4A" fillOpacity={0.92} />
        <path d="M-2.6 6 L -4.4 9 M0 6 L0 9.6 M2.6 6 L4.4 9" stroke="url(#ab-gold)" strokeWidth={0.9} strokeLinecap="round" />
      </g>
      <g transform="translate(58 47) rotate(24) scale(0.5)">
        <path d={SEED} fill="url(#ab-seed)" />
      </g>
    </>
  );
  return (
    <svg aria-hidden viewBox="0 0 240 60" className={className}>
      <g>{branch}</g>
      <g transform="translate(240 0) scale(-1 1)">{branch}</g>
      <g transform="translate(120 31) scale(0.37) translate(-60 -64)">
        <path d={FRUIT} fill="url(#ab-rind)" />
        <path d={FRUIT} fill="none" stroke="url(#ab-gold)" strokeWidth={3} strokeLinejoin="round" />
        <path d="M38 58 C 40 48, 46 41, 54 38" fill="none" stroke="#FFE7DC" strokeOpacity={0.75} strokeWidth={4} strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Веточка-стебель «Тўй дастури» с листьями: рисуется вертикально, тянется на всю высоту */
export function StemLeaves({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 60" className={className} fill="none">
      <g transform="translate(20 30) rotate(-130)">
        <path d={LEAF} fill="url(#ab-gold)" fillOpacity={0.18} stroke="url(#ab-gold)" strokeWidth={0.9} />
      </g>
      <g transform="translate(20 38) rotate(-50) scale(0.85)">
        <path d={LEAF} fill="url(#ab-gold)" fillOpacity={0.18} stroke="url(#ab-gold)" strokeWidth={0.9} />
      </g>
    </svg>
  );
}

// Тонкое бумажное зерно (матовая открыточная бумага)
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.28  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

/** Бумага открытки: зерно поверх всего (multiply), не мешает нажатиям */
export function PaperGrain({ className = "absolute inset-0", opacity = 0.22 }: { className?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      data-decor
      className={`pointer-events-none mix-blend-multiply ${className}`}
      style={{ backgroundImage: GRAIN, opacity }}
    />
  );
}

/** Мягкое пудровое пятно за текстом поверх фото */
export function PowderHalo({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-decor
      className={`pointer-events-none absolute rounded-full ${className}`}
      style={{ background: `radial-gradient(closest-side, ${PAPER} 0%, ${PAPER}e6 45%, ${PAPER}00 100%)` }}
    />
  );
}
