"use client";

import { motion } from "motion/react";
import { MOTION } from "@/templates/blocks/motion";

/** Золотые градиенты для SVG дизайна. Вставляется один раз на страницу */
export function GoldDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="om-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A87A28" />
          <stop offset="0.28" stopColor="#B8892F" />
          <stop offset="0.5" stopColor="#F3D58A" />
          <stop offset="0.72" stopColor="#B8892F" />
          <stop offset="1" stopColor="#A87A28" />
        </linearGradient>
        <radialGradient id="om-wax" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#FBE6A6" />
          <stop offset="0.35" stopColor="#E0B758" />
          <stop offset="0.75" stopColor="#B8892F" />
          <stop offset="1" stopColor="#8A6420" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Тиснёный растительный узор: светлая и тёмная линия со сдвигом дают объём */
const vine = (stroke: string, dx: number) =>
  `<g fill='none' stroke='${stroke}' stroke-width='1.1' stroke-linecap='round' transform='translate(${dx} ${dx})'>` +
  `<path d='M10 150 C 40 120, 30 80, 60 70 S 110 60, 120 20'/>` +
  `<path d='M60 70 c -10 -14 -2 -28 12 -30 c 0 14 -4 24 -12 30z'/>` +
  `<path d='M88 52 c 8 -14 24 -16 32 -6 c -12 6 -22 8 -32 6z'/>` +
  `<path d='M38 104 c -16 -4 -22 -18 -14 -28 c 10 8 14 18 14 28z'/>` +
  `<path d='M120 20 c 10 4 14 12 10 20'/><circle cx='26' cy='132' r='2.2'/>` +
  `<path d='M150 90 C 130 110, 140 140, 110 150 S 70 160, 60 160'/>` +
  `<path d='M120 146 c 4 -14 18 -20 28 -12 c -8 10 -18 14 -28 12z'/></g>`;

const EMBOSS = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 160 160'>${vine("#ffffff", -0.6)}${vine("#e4d6bd", 0.6)}</svg>`,
)}")`;

/** Фон «слоновая кость с тиснением»: бумажное зерно + еле заметный узор */
export function EmbossedPaper({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `${EMBOSS}, radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%), radial-gradient(90% 60% at 50% 110%, rgba(232,216,188,0.55), rgba(232,216,188,0) 70%)`,
        backgroundSize: "220px 220px, 100% 100%, 100% 100%",
        opacity: 0.42,
      }}
    />
  );
}

/** Лист для веточек венка */
const LEAF = "M0 0 C 3 -4.5, 10 -5, 14 0 C 10 5, 3 4.5, 0 0 Z";

/** Листья вдоль дуги окружности: [x, y, угол] */
function leavesOnArc(cx: number, cy: number, r: number, from: number, to: number, count: number) {
  const out: [number, number, number, boolean][] = [];
  for (let i = 0; i < count; i++) {
    const a = from + ((to - from) * (i + 0.5)) / count;
    const rad = (a * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    // по касательной, через один — наружу и внутрь
    const outward = i % 2 === 0;
    const tangent = a + (from < to ? 90 : -90);
    out.push([x, y, tangent + (outward ? -38 : 38), outward]);
  }
  return out;
}

/** Венок из тонких золотых веточек вокруг монограммы. Рисуется линией, когда draw = true */
export function Wreath({ draw, className = "" }: { draw: boolean; className?: string }) {
  const cx = 130;
  const cy = 130;
  const r = 112;
  // левая ветвь идёт снизу (100°) вверх до 245°, правая — зеркально
  const left = leavesOnArc(cx, cy, r, 104, 246, 13);
  const arc = (from: number, to: number) => {
    const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };

  const branch = (
    <>
      <motion.path
        d={arc(100, 250)}
        fill="none"
        stroke="url(#om-gold)"
        strokeWidth={1.2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: draw ? 1 : 0 }}
        transition={{ duration: MOTION.slow, ease: MOTION.ease }}
      />
      {left.map(([x, y, rot, outward], i) => (
        <motion.path
          key={i}
          d={LEAF}
          transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${outward ? 1.15 : 0.95})`}
          fill="url(#om-gold)"
          fillOpacity={0.22}
          stroke="url(#om-gold)"
          strokeWidth={0.9}
          initial={{ opacity: 0 }}
          animate={{ opacity: draw ? 1 : 0 }}
          transition={{ duration: MOTION.fast, ease: MOTION.ease, delay: draw ? 0.25 + i * MOTION.step : 0 }}
        />
      ))}
      {[118, 168, 214].map((a, i) => (
        <motion.circle
          key={a}
          cx={cx + (r - 9) * Math.cos((a * Math.PI) / 180)}
          cy={cy + (r - 9) * Math.sin((a * Math.PI) / 180)}
          r={2}
          fill="url(#om-gold)"
          initial={{ opacity: 0 }}
          animate={{ opacity: draw ? 1 : 0 }}
          transition={{ delay: draw ? 0.9 + i * 0.2 : 0 }}
        />
      ))}
    </>
  );

  return (
    <svg aria-hidden viewBox="0 0 260 260" className={className}>
      <g>{branch}</g>
      <g transform="translate(260 0) scale(-1 1)">{branch}</g>
      {/* бантик-узелок внизу, где сходятся ветви */}
      <motion.path
        d="M130 246 c -8 -6 -18 -4 -18 2 c 0 6 10 6 18 -2 c 8 8 18 8 18 2 c 0 -6 -10 -8 -18 -2 z"
        fill="none"
        stroke="url(#om-gold)"
        strokeWidth={1.1}
        initial={{ opacity: 0 }}
        animate={{ opacity: draw ? 1 : 0 }}
        transition={{ delay: draw ? 1.2 : 0, duration: MOTION.fast, ease: MOTION.ease }}
      />
    </svg>
  );
}

/** Разделитель: тонкие золотые линии и ромбик-лист посередине */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="gold-fill h-px w-16 opacity-80" />
      <svg viewBox="0 0 40 16" className="h-4 w-10">
        <path
          d="M20 1 C 23 5, 23 11, 20 15 C 17 11, 17 5, 20 1 Z M2 8 C 8 4, 14 4, 17 8 C 14 12, 8 12, 2 8 Z M38 8 C 32 4, 26 4, 23 8 C 26 12, 32 12, 38 8 Z"
          fill="url(#om-gold)"
        />
      </svg>
      <span className="gold-fill h-px w-16 opacity-80" />
    </div>
  );
}

/** Иконка утра: солнце над горизонтом (наҳорги ош) */
export function SunriseIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={className} fill="none" stroke="url(#om-gold)" strokeWidth={1.4} strokeLinecap="round">
      <path d="M8 34 H40" />
      <path d="M14 34 a10 10 0 0 1 20 0" />
      <path d="M24 12 v5 M11 19 l3.5 3.5 M37 19 l-3.5 3.5 M5 28 h4 M39 28 h4" />
      <path d="M14 40 H34" opacity={0.6} />
    </svg>
  );
}

/** Иконка вечера: два кольца (никоҳ базми) */
export function RingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={className} fill="none" stroke="url(#om-gold)" strokeWidth={1.5}>
      <circle cx="19" cy="28" r="10" />
      <circle cx="29" cy="28" r="10" />
      <path d="M26 15 l3 -4 l3 4 l-3 3 z" fill="url(#om-gold)" />
    </svg>
  );
}
