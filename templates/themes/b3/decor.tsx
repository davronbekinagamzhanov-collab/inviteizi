/**
 * Тонкая линейная графика батча 3 (код, не картинки — чётко на любом экране, не «мыло» и не мультик).
 * Все мотивы — местные: ислими, пахта, бодом, лола, нон, чойнак, қозон, дўппи, сузана, ганч-гириҳ.
 * Цвет — currentColor, толщина линии не зависит от масштаба.
 */
import type { CSSProperties } from "react";

type P = { className?: string; style?: CSSProperties };
const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" } as const;

/** Ислими: вьющаяся лоза с листьями, горизонтальная лента */
export function Islimi({ className, style }: P) {
  return (
    <svg viewBox="0 0 240 40" className={className} style={style} aria-hidden data-decor>
      <path d="M0 20c20 0 20-14 40-14s20 28 40 28 20-28 40-28 20 28 40 28 20-14 40-14 20 14 40 14" {...line} strokeWidth="1.1" />
      {[40, 120, 200].map((x) => (
        <g key={x} transform={`translate(${x} 6)`}>
          <path d="M0 0c-6-6-4-12 2-14 2 6 2 10-2 14z" {...line} strokeWidth=".9" />
          <circle r="1.6" cx="0" cy="0" fill="currentColor" />
        </g>
      ))}
      {[80, 160].map((x) => (
        <g key={x} transform={`translate(${x} 34)`}>
          <path d="M0 0c6 6 4 12-2 14-2-6-2-10 2-14z" {...line} strokeWidth=".9" />
          <circle r="1.6" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

/** Пахта: раскрытая коробочка хлопка */
export function Paxta({ className, style }: P) {
  return (
    <svg viewBox="-24 -24 48 48" className={className} style={style} aria-hidden data-decor>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0-2C7-6 9-16 0-20-9-16-7-6 0-2z" {...line} strokeWidth="1" />
      ))}
      {[36, 108, 180, 252, 324].map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0-6l0-12" {...line} strokeWidth=".7" opacity=".6" />
      ))}
      <circle r="2.2" fill="currentColor" />
    </svg>
  );
}

/** Бодом гули: пять лепестков и тычинки */
export function Bodom({ className, style }: P) {
  return (
    <svg viewBox="-20 -20 40 40" className={className} style={style} aria-hidden data-decor>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0-3C5-6 7-13 2-17 0-15-2-15-2-17-7-13-5-6 0-3z" {...line} strokeWidth="1" />
      ))}
      {[18, 90, 162, 234, 306].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0-2v-6" {...line} strokeWidth=".7" />
          <circle cy="-8.6" r=".9" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

/** Лола: тюльпан на стебле с листом */
export function Lola({ className, style }: P) {
  return (
    <svg viewBox="0 0 40 90" className={className} style={style} aria-hidden data-decor>
      <path d="M20 34C9 34 7 20 8 8l6 7 6-11 6 11 6-7c1 12-1 26-12 26z" {...line} strokeWidth="1.1" />
      <path d="M20 34v54M20 70c-8-4-14-14-14-26 8 4 13 12 14 22M20 80c6-4 11-10 12-20" {...line} strokeWidth="1" />
    </svg>
  );
}

/** Нон: лепёшка с узором чекича */
export function Non({ className, style }: P) {
  const dots: [number, number][] = [];
  for (let r = 6; r <= 18; r += 6) for (let a = 0; a < 360; a += 360 / (r * 1.1)) dots.push([Math.cos((a * Math.PI) / 180) * r, Math.sin((a * Math.PI) / 180) * r]);
  return (
    <svg viewBox="-34 -34 68 68" className={className} style={style} aria-hidden data-decor>
      <circle r="31" {...line} strokeWidth="1.1" />
      <circle r="23" {...line} strokeWidth=".8" />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r=".9" fill="currentColor" />
      ))}
      <circle r="2" fill="currentColor" />
    </svg>
  );
}

/** Чойнак ва пиёла */
export function Choynak({ className, style }: P) {
  return (
    <svg viewBox="0 0 160 90" className={className} style={style} aria-hidden data-decor>
      <g {...line} strokeWidth="1.2">
        <path d="M34 26h40M38 26c-12 7-17 19-15 32 2 14 12 22 31 22s29-8 31-22c2-13-3-25-15-32" />
        <path d="M44 26c0-7 5-12 10-12s10 5 10 12M54 14V9m-4 0h8" />
        <path d="M23 50c-9-3-15-12-18-22 5 0 10 3 14 8M85 42c10-5 15 3 12 12-3 7-9 10-14 12" />
        <path d="M112 58h40c-2 13-10 20-20 20s-18-7-20-20zM126 78h12" />
        <path d="M124 48c-2-4 2-7 0-11M132 46c-2-4 2-7 0-11M140 48c-2-4 2-7 0-11" opacity=".6" />
        <path d="M36 48h36M114 63h36" strokeDasharray="2 3" />
      </g>
    </svg>
  );
}

/** Қозон на огне */
export function Qozon({ className, style }: P) {
  return (
    <svg viewBox="0 0 120 90" className={className} style={style} aria-hidden data-decor>
      <g {...line} strokeWidth="1.2">
        <path d="M14 30h92M18 30c0 24 18 38 42 38s42-14 42-38" />
        <path d="M10 26c4 0 4 8 8 8M110 26c-4 0-4 8-8 8" />
        <path d="M44 22c-3-5 3-8 0-14M60 20c-3-5 3-8 0-14M76 22c-3-5 3-8 0-14" opacity=".55" />
        <path d="M40 80c4-8 10-6 10-14 6 6 4 10 10 14 4-6 10-8 10-14 6 6 6 12 10 14" />
        <path d="M30 86h60" />
      </g>
    </svg>
  );
}

/** Чуст дўппи: четыре «қалампир» по бокам */
export function Doppi({ className, style }: P) {
  return (
    <svg viewBox="0 0 120 80" className={className} style={style} aria-hidden data-decor>
      <g {...line} strokeWidth="1.2">
        <path d="M14 62V40C14 22 36 10 60 10s46 12 46 30v22z" />
        <path d="M14 62h92M20 54h80" strokeDasharray="3 3" />
        <path d="M60 10v44" opacity=".5" />
        {[34, 86].map((x) => (
          <path key={x} d={`M${x} 48c-7-3-9-14-2-22 2 3 6 3 8 1 3 9-1 18-6 21z`} />
        ))}
        {[34, 86].map((x) => (
          <path key={`c${x}`} d={`M${x} 26c0-3 2-5 4-6`} />
        ))}
      </g>
    </svg>
  );
}

/** Сузана: круглая розетка из лепестков */
export function Suzani({ className, style }: P) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} style={style} aria-hidden data-decor>
      <circle r="46" {...line} strokeWidth="1" />
      <circle r="12" {...line} strokeWidth="1" />
      <circle r="4" fill="currentColor" />
      {Array.from({ length: 12 }, (_, i) => i * 30).map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0-14C7-20 7-32 0-40-7-32-7-20 0-14z" {...line} strokeWidth="1" />
          <circle cy="-44" r="1.4" fill="currentColor" />
        </g>
      ))}
      {Array.from({ length: 12 }, (_, i) => i * 30 + 15).map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0-16v-12" {...line} strokeWidth=".7" opacity=".6" />
      ))}
    </svg>
  );
}

/** Ганч-гириҳ: решётка восьмиконечных звёзд для створок и окон */
export function GanchLattice({ className, style, id }: P & { id: string }) {
  return (
    <svg className={className} style={style} aria-hidden data-decor preserveAspectRatio="xMidYMid slice" viewBox="0 0 120 240">
      <defs>
        <pattern id={id} width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M15 3l3.5 8.5L27 15l-8.5 3.5L15 27l-3.5-8.5L3 15l8.5-3.5z" {...line} strokeWidth=".8" />
          <path d="M15 8l7 7-7 7-7-7z" {...line} strokeWidth=".6" />
          <path d="M0 0l6 6M30 0l-6 6M0 30l6-6M30 30l-6-6" {...line} strokeWidth=".6" />
        </pattern>
      </defs>
      <rect width="120" height="240" fill={`url(#${id})`} />
    </svg>
  );
}

/** Стрельчатая арка-контур (окно, ниша) */
export function ArchLine({ className, style }: P) {
  return (
    <svg viewBox="0 0 100 140" preserveAspectRatio="none" className={className} style={style} aria-hidden data-decor>
      <path d="M2 138V54C2 28 26 12 50 2c24 10 48 26 48 52v84" {...line} strokeWidth="1.1" />
      <path d="M8 138V56C8 33 29 18 50 9c21 9 42 24 42 47v82" {...line} strokeWidth=".6" />
    </svg>
  );
}
