"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { GROUND, PLASTER, SHADE, SURFACE } from "./style";
import { GIRIH_RELIEF, ISLIMI_RELIEF, LATTICE_RELIEF } from "./relief";

/* ───────────────────────── Геометрия ───────────────────────── */

const f = (n: number) => Math.round(n * 10) / 10;

/** Размер элемента (offsetWidth не зависит от transform, поэтому Reveal не мешает) */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((s) => (Math.abs(s.w - w) < 0.5 && Math.abs(s.h - h) < 0.5 ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Арка: левый и правый край проёма, вершина, линия пят (где начинается свод), низ */
export type ArchBox = { L: number; R: number; ay: number; sy: number; bottom: number };

// Килевидная (бухарская) арка: две кривые сходятся в острую вершину
function archCurve({ L, R, ay, sy }: ArchBox) {
  const cx = (L + R) / 2;
  const aw = R - L;
  const H = sy - ay;
  return {
    cx,
    p1: [L, sy - 0.52 * H],
    p2: [cx - 0.1 * aw, ay + 0.22 * H],
    q1: [cx + 0.1 * aw, ay + 0.22 * H],
    q2: [R, sy - 0.52 * H],
  };
}

export function archPath(b: ArchBox) {
  const { cx, p1, p2, q1, q2 } = archCurve(b);
  return (
    `M${f(b.L)} ${f(b.bottom)}L${f(b.L)} ${f(b.sy)}` +
    `C${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])} ${f(cx)} ${f(b.ay)}` +
    `C${f(q1[0])} ${f(q1[1])} ${f(q2[0])} ${f(q2[1])} ${f(b.R)} ${f(b.sy)}` +
    `L${f(b.R)} ${f(b.bottom)}Z`
  );
}

/** Та же арка, расширенная наружу на d (для профилей-обрамлений) */
export const grow = (b: ArchBox, d: number): ArchBox => ({
  L: b.L - d,
  R: b.R + d,
  ay: b.ay - d * 1.15,
  sy: b.sy,
  bottom: b.bottom,
});

/** Полуширина проёма на высоте y (по точкам кривой свода) */
export function halfWidthAt(b: ArchBox, y: number) {
  const aw = b.R - b.L;
  if (y >= b.sy) return aw / 2;
  if (y <= b.ay) return 0;
  const { cx, p1, p2 } = archCurve(b);
  const p0 = [b.L, b.sy];
  const p3 = [cx, b.ay];
  let prev = p0;
  for (let i = 1; i <= 48; i++) {
    const t = i / 48;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const yy = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    if (yy <= y) {
      const k = (prev[1] - y) / (prev[1] - yy || 1);
      return cx - (prev[0] + (x - prev[0]) * k);
    }
    prev = [x, yy];
  }
  return 0;
}

/* ───────────────────────── Муқарнас ───────────────────────── */

type Tier = { y: number; h: number; cells: [number, number][] };

/** Ячейка муқарнаса: маленькая стрельчатая ниша. Между соседними ячейками остаётся светлая грань-сталактит */
function cellPath(xa: number, xb: number, yT: number, yB: number) {
  const ch = yB - yT;
  const g = (xb - xa) * 0.09;
  const a = xa + g;
  const b = xb - g;
  const cw = b - a;
  const xm = (a + b) / 2;
  const top = yT + ch * 0.04;
  return (
    `M${f(a)} ${f(yB)}L${f(a)} ${f(yT + 0.56 * ch)}` +
    `C${f(a)} ${f(yT + 0.3 * ch)} ${f(xm - 0.08 * cw)} ${f(top + 0.2 * ch)} ${f(xm)} ${f(top)}` +
    `C${f(xm + 0.08 * cw)} ${f(top + 0.2 * ch)} ${f(b)} ${f(yT + 0.3 * ch)} ${f(b)} ${f(yT + 0.56 * ch)}` +
    `L${f(b)} ${f(yB)}Z`
  );
}

/** Ярусы муқарнаса внутри свода: чётные ярусы — нечётное число ячеек, нечётные — со сдвигом на полъячейки */
export function archTiers(b: ArchBox, bottomY: number, cellH: number): Tier[] {
  const cx = (b.L + b.R) / 2;
  const cw = cellH * 0.98;
  const n = Math.max(1, Math.floor((bottomY - b.ay) / cellH));
  const tiers: Tier[] = [];
  for (let k = 0; k < n; k++) {
    const y = b.ay + k * cellH;
    let count = Math.max(1, Math.ceil((halfWidthAt(b, y + cellH * 0.6) * 2) / cw));
    if (count % 2 !== (k % 2 === 0 ? 1 : 0)) count += 1;
    const x0 = cx - (count * cw) / 2;
    tiers.push({ y, h: cellH, cells: Array.from({ length: count }, (_, i) => [x0 + i * cw, x0 + (i + 1) * cw]) });
  }
  return tiers;
}

/** Карниз-разделитель: ярусы сужаются книзу, как сталактиты */
export function friezeTiers(width: number, cellH: number, counts: number[]): Tier[] {
  const cw = width / counts[0];
  return counts.map((count, k) => {
    const x0 = width / 2 - (count * cw) / 2;
    return { y: k * cellH, h: cellH, cells: Array.from({ length: count }, (_, i) => [x0 + i * cw, x0 + (i + 1) * cw]) };
  });
}

/** Рисует ярусы: светлая полка, затенённые ячейки, нижний край с подвесками */
export function MuqarnasCells({ tiers, pendants = true }: { tiers: Tier[]; pendants?: boolean }) {
  const last = tiers[tiers.length - 1];
  return (
    <g>
      {tiers.map((tier, k) => {
        const x0 = tier.cells[0][0];
        const x1 = tier.cells[tier.cells.length - 1][1];
        const yB = tier.y + tier.h;
        return (
          <g key={k}>
            {/* светлая лицевая грань яруса */}
            <rect x={f(x0)} y={f(tier.y)} width={f(x1 - x0)} height={f(tier.h)} fill="#F7F3EC" />
            {tier.cells.map(([a, b], i) => {
              const d = cellPath(a, b, tier.y, yB);
              return (
                <g key={i}>
                  <path d={d} fill="url(#gp-cell)" />
                  <path d={d} fill="url(#gp-cell-side)" stroke="#A8987F" strokeOpacity={0.55} strokeWidth={0.55} />
                </g>
              );
            })}
            {/* губа яруса: светлая кромка и тень под ней */}
            <line x1={f(x0)} x2={f(x1)} y1={f(yB - 0.5)} y2={f(yB - 0.5)} stroke="#FFFFFF" strokeWidth={1.1} />
            <line x1={f(x0)} x2={f(x1)} y1={f(yB + 0.6)} y2={f(yB + 0.6)} stroke={SHADE} strokeOpacity={0.55} strokeWidth={0.8} />
          </g>
        );
      })}
      {pendants &&
        last &&
        last.cells.slice(0, -1).map(([a, b], i) => {
          const y = last.y + last.h;
          const s = (b - a) * 0.13;
          return (
            <g key={i}>
              <path d={`M${f(b - s)} ${f(y)}L${f(b)} ${f(y + s * 2.6)}L${f(b + s)} ${f(y)}Z`} fill="#F4EFE6" />
              <path d={`M${f(b)} ${f(y + s * 2.6)}L${f(b + s)} ${f(y)}`} stroke={SHADE} strokeOpacity={0.75} strokeWidth={0.7} />
            </g>
          );
        })}
    </g>
  );
}

/* ───────────────────────── Общие узоры и фильтры ───────────────────────── */

/** 8-конечная звезда (ҳотам, основа гириха): 16 точек */
export function starPoints(cx: number, cy: number, r: number, inner = 0.76) {
  return Array.from({ length: 16 }, (_, i) => {
    const a = ((i * 22.5 - 90) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * inner;
    return `${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`;
  }).join(" ");
}

/** Ромб-квадрат, повёрнутый на 45° */
const diamond = (cx: number, cy: number, r: number) =>
  `${f(cx)},${f(cy - r)} ${f(cx + r)},${f(cy)} ${f(cx)},${f(cy + r)} ${f(cx - r)},${f(cy)}`;

/**
 * Ислими для ганча: вьющийся стебель со спиралями и миндалевидными листьями.
 * Плитка 64×64 стыкуется без шва (стебель входит и выходит на одной высоте).
 */
function IslimiTile() {
  return (
    <g fill={SURFACE}>
      <path d="M0 32C16 8 48 56 64 32" fill="none" stroke={SURFACE} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M0 32C16 8 48 56 64 32" fill="none" stroke={SURFACE} strokeWidth={3.4} strokeLinecap="round" transform="translate(0 64)" />
      <path d="M0 32C16 8 48 56 64 32" fill="none" stroke={SURFACE} strokeWidth={3.4} strokeLinecap="round" transform="translate(0 -64)" />
      {/* верхняя спираль */}
      <path d="M19 21C20 9 33 4 39 11C44 17 39 25 32 22C28 20 29 15 33 15" fill="none" stroke={SURFACE} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={34} cy={17.5} r={2.6} />
      {/* нижняя спираль */}
      <path d="M45 43C44 55 31 60 25 53C20 47 25 39 32 42C36 44 35 49 31 49" fill="none" stroke={SURFACE} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={30} cy={46.5} r={2.6} />
      {/* листья-бодом от стебля */}
      <path d="M6 24C1 16 4 8 11 4C12 12 10 19 6 24Z" />
      <path d="M58 40C63 48 60 56 53 60C52 52 54 45 58 40Z" />
      <path d="M44 27C50 21 58 21 62 25C56 29 50 30 44 27Z" />
      <path d="M20 37C14 43 6 43 2 39C8 35 14 34 20 37Z" />
      {/* бутоны-тройчатки в пустых углах */}
      <path d="M52 6c-2-3 0-6 2.5-6s4.5 3 2.5 6c3-1 5 1 4 3.5s-4 2.5-6 .5c0 3-2 4.5-3.5 4.5S48 12 49.5 9.5c-2.5 1-4.5-1-3.5-3.5s3.5-1.5 6 0Z" />
      <path d="M10 58c-2-3 0-6 2.5-6s4.5 3 2.5 6c3-1 5 1 4 3.5s-4 2.5-6 .5c0 3-2 4.5-3.5 4.5S6 64 7.5 61.5c-2.5 1-4.5-1-3.5-3.5s3.5-1.5 6 0Z" />
    </g>
  );
}

/**
 * Один раз на страницу: золото, тени ячеек, ниша, рельеф (фильтр), ислими, гирих, решётка панжара.
 */
export function GanchDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="gp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8C6A2C" />
          <stop offset="0.3" stopColor="#B08A45" />
          <stop offset="0.52" stopColor="#F0DCA4" />
          <stop offset="0.74" stopColor="#B08A45" />
          <stop offset="1" stopColor="#8C6A2C" />
        </linearGradient>
        <linearGradient id="gp-cell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B3A287" />
          <stop offset="0.5" stopColor="#DDD2C0" />
          <stop offset="1" stopColor="#F7F2E9" />
        </linearGradient>
        {/* свет слева-сверху: левая стенка ячейки в тени, правая светлее */}
        <linearGradient id="gp-cell-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6E5A41" stopOpacity="0.24" />
          <stop offset="0.5" stopColor="#6E5A41" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="gp-niche" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9E0D1" />
          <stop offset="0.32" stopColor="#F6F1E8" />
          <stop offset="0.75" stopColor="#FBF8F2" />
          <stop offset="1" stopColor="#EFE8DC" />
        </linearGradient>
        <linearGradient id="gp-behind" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#CFC2AC" />
          <stop offset="1" stopColor="#E9DCC2" />
        </linearGradient>
        <radialGradient id="gp-glow" cx="0.5" cy="0.55" r="0.6">
          <stop offset="0" stopColor="#FFF3D6" stopOpacity="1" />
          <stop offset="0.45" stopColor="#FFE6B0" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FFE6B0" stopOpacity="0" />
        </radialGradient>

        {/*
          Рельеф ганча: светлая кромка сверху-слева, тень снизу-справа и мягкая падающая тень на фон.
          На странице НЕ используется (тяжёлый: первое открытие дёргалось) — им запечены плитки узоров
          (scripts/bake-ganch-relief.mjs → relief.ts, паттерны gp-*-r ниже). Менять узор — перезапечь.
        */}
        <filter id="gp-relief" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="a" />
          <feOffset in="a" dx="1.1" dy="1.4" result="down" />
          <feOffset in="a" dx="-0.9" dy="-1.1" result="up" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="soft" />
          <feOffset in="soft" dx="1.3" dy="1.9" result="softDown" />
          <feFlood floodColor="#7E6E57" floodOpacity="0.42" />
          <feComposite in2="softDown" operator="in" result="cast" />
          <feComposite in="SourceAlpha" in2="down" operator="out" result="rimTL" />
          <feFlood floodColor="#FFFFFF" floodOpacity="1" />
          <feComposite in2="rimTL" operator="in" result="hi" />
          <feComposite in="SourceAlpha" in2="up" operator="out" result="rimBR" />
          <feFlood floodColor="#A08F75" floodOpacity="0.75" />
          <feComposite in2="rimBR" operator="in" result="lo" />
          <feMerge>
            <feMergeNode in="cast" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="lo" />
            <feMergeNode in="hi" />
          </feMerge>
        </filter>
        <filter id="gp-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>

        <pattern id="gp-islimi" width="64" height="64" patternUnits="userSpaceOnUse">
          <IslimiTile />
        </pattern>

        {/* Гирих для каймы: звезда-ҳотам в каждой плитке и ромбики на стыках */}
        <pattern id="gp-girih" width="14" height="14" viewBox="0 0 14 14" patternUnits="userSpaceOnUse">
          <polygon points={starPoints(7, 7, 5.6, 0.72)} fill={SURFACE} />
          {[
            [0, 0],
            [14, 0],
            [0, 14],
            [14, 14],
          ].map(([x, y]) => (
            <polygon key={`${x}${y}`} points={diamond(x, y, 1.9)} fill={SURFACE} />
          ))}
        </pattern>

        {/* Узоры с готовым рельефом (картинки): ислими, гирих, решётка панжара с прозрачными отверстиями */}
        <pattern id="gp-islimi-r" width="64" height="64" patternUnits="userSpaceOnUse">
          <image href={ISLIMI_RELIEF} width="64" height="64" preserveAspectRatio="none" />
        </pattern>
        <pattern id="gp-girih-r" width="14" height="14" viewBox="0 0 14 14" patternUnits="userSpaceOnUse">
          <image href={GIRIH_RELIEF} width="14" height="14" preserveAspectRatio="none" />
        </pattern>
        <pattern id="gp-lattice-r" width="26" height="26" patternUnits="userSpaceOnUse">
          <image href={LATTICE_RELIEF} width="26" height="26" preserveAspectRatio="none" />
        </pattern>

        {/* Отверстия панжара: звёзды и ромбы (чёрное — дырка) */}
        <pattern id="gp-holes" width="26" height="26" patternUnits="userSpaceOnUse">
          <polygon points={starPoints(13, 13, 9.4, 0.7)} fill="#000" />
          {[
            [0, 0],
            [26, 0],
            [0, 26],
            [26, 26],
          ].map(([x, y]) => (
            <polygon key={`${x}${y}`} points={diamond(x, y, 4.4)} fill="#000" />
          ))}
        </pattern>
        <mask id="gp-lattice" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000">
          <rect x="-2000" y="-2000" width="6000" height="6000" fill="#fff" />
          <rect x="-2000" y="-2000" width="6000" height="6000" fill="url(#gp-holes)" />
        </mask>
      </defs>
    </svg>
  );
}

/** Профиль-обрамление: тень, блик и тело линии (выпуклый валик) */
export function Bead({ d, width = 2.4, gold = false }: { d: string; width?: number; gold?: boolean }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={SHADE} strokeOpacity={0.7} strokeWidth={width} transform="translate(0.7 1)" />
      <path d={d} stroke="#FFFFFF" strokeWidth={width} transform="translate(-0.5 -0.6)" />
      <path d={d} stroke={gold ? "url(#gp-gold)" : SURFACE} strokeWidth={gold ? width * 0.55 : width * 0.8} />
    </g>
  );
}

/** Матовое зерно гипса */
export const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

/* ───────────────────────── Пештоқ ───────────────────────── */

export type Peshtoq = ReturnType<typeof peshtoqGeo>;

/**
 * Геометрия портала-пештоқа: рамка с гирихом, панель с ислими, килевидная арка, ярусы муқарнаса.
 * Плитка каймы подгоняется так, чтобы по краям укладывалось целое число звёзд.
 */
export function peshtoqGeo(
  w: number,
  h: number,
  o: { margin?: number; pier?: number; top?: number; headK?: number; headMax?: number; muq?: number } = {},
) {
  const { margin = 12, pier = 20, top = 22, headK = 0.8, headMax = 0.32, muq = 0.72 } = o;
  const x0 = margin;
  const y0 = margin;
  const x1 = w - margin;
  const y1 = h - margin;
  const bx = (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 14));
  const by = (y1 - y0) / Math.max(1, Math.round((y1 - y0) / 14));
  const ix0 = x0 + bx;
  const iy0 = y0 + by;
  const ix1 = x1 - bx;
  const iy1 = y1 - by;
  const L = ix0 + pier;
  const R = ix1 - pier;
  const aw = R - L;
  const ay = iy0 + top;
  const H = Math.min(aw * headK, h * headMax);
  const arch: ArchBox = { L, R, ay, sy: ay + H, bottom: iy1 };
  const cellH = Math.max(11, Math.min(17, aw / 17));
  const mqBottom = ay + H * muq;
  const tiers = archTiers(arch, mqBottom, cellH);
  const mqEnd = tiers.length ? tiers[tiers.length - 1].y + cellH : ay;
  return { w, h, x0, y0, x1, y1, bx, by, ix0, iy0, ix1, iy1, arch, aw, H, tiers, mqEnd, cellH };
}

/** Рисунок пештоқа (без текста). idp — префикс для своих clipPath */
export function PeshtoqArt({ g, idp, glow = 0 }: { g: Peshtoq; idp: string; glow?: number }) {
  const { x0, y0, x1, y1, bx, by, ix0, iy0, ix1, iy1, arch } = g;
  const niche = archPath(arch);
  const volt = archPath(grow(arch, 12));
  const band = `M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z M${f(ix0)} ${f(iy0)}V${f(iy1)}H${f(ix1)}V${f(iy0)}Z`;
  const corners = [
    [x0, y0],
    [ix1, y0],
    [x0, iy1],
    [ix1, iy1],
  ];
  return (
    <svg aria-hidden data-decor viewBox={`0 0 ${f(g.w)} ${f(g.h)}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <pattern id={`${idp}-gb`} href="#gp-girih-r" x={f(x0)} y={f(y0)} width={f(bx)} height={f(by)} />
        <clipPath id={`${idp}-n`}>
          <path d={niche} />
        </clipPath>
        <clipPath id={`${idp}-p`}>
          <rect x={f(ix0)} y={f(iy0)} width={f(ix1 - ix0)} height={f(iy1 - iy0)} />
        </clipPath>
      </defs>

      {/* кайма с гирихом */}
      <path d={band} fill={GROUND} fillRule="evenodd" />
      <path d={band} fill={`url(#${idp}-gb)`} fillRule="evenodd" />
      {corners.map(([x, y], i) => (
        <g key={i}>
          <rect x={f(x)} y={f(y)} width={f(bx)} height={f(by)} fill={SURFACE} />
          <polygon points={starPoints(x + bx / 2, y + by / 2, Math.min(bx, by) * 0.36, 0.72)} fill="url(#gp-gold)" opacity={0.9} />
        </g>
      ))}
      <Bead d={`M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`} width={1.6} />
      <Bead d={`M${f(ix0)} ${f(iy0)}H${f(ix1)}V${f(iy1)}H${f(ix0)}Z`} width={1.8} />

      {/* панель с ислими вокруг арки */}
      <g clipPath={`url(#${idp}-p)`}>
        <rect x={f(ix0)} y={f(iy0)} width={f(ix1 - ix0)} height={f(iy1 - iy0)} fill={GROUND} />
        <rect x={f(ix0)} y={f(iy0)} width={f(ix1 - ix0)} height={f(iy1 - iy0)} fill="url(#gp-islimi-r)" />
        {/* гладкий архивольт вокруг проёма */}
        <path d={volt} fill={PLASTER} />
        <Bead d={volt} width={2.6} />
        <Bead d={archPath(grow(arch, 6.5))} width={2} />
        <path d={archPath(grow(arch, 3))} fill="none" stroke="url(#gp-gold)" strokeWidth={1} />
      </g>

      {/* ниша: глубина и тёплый свет */}
      <path d={niche} fill="url(#gp-niche)" />
      <g clipPath={`url(#${idp}-n)`}>
        <MuqarnasCells tiers={g.tiers} />
        <line x1={f(arch.L)} x2={f(arch.R)} y1={f(g.mqEnd + 4)} y2={f(g.mqEnd + 4)} stroke="url(#gp-gold)" strokeWidth={0.8} opacity={0.8} />
        <path d={niche} fill="url(#gp-glow)" opacity={glow} />
        <path d={niche} fill="none" stroke="#7E6E57" strokeOpacity={0.4} strokeWidth={12} filter="url(#gp-blur)" />
      </g>
      {/* порог */}
      <rect x={f(ix0)} y={f(iy1 - 5)} width={f(ix1 - ix0)} height={5} fill={PLASTER} />
      <Bead d={`M${f(ix0)} ${f(iy1 - 5)}H${f(ix1)}`} width={1.4} />
    </svg>
  );
}

/* ───────────────────────── Ниша-арка для блоков ───────────────────────── */

/**
 * Резная ниша (михроб) вокруг блока. head — высота свода в долях ширины, muq — доля свода под муқарнас.
 * padTop — отступ контента сверху (в % ширины, как CSS padding).
 */
export function CarvedArch({
  children,
  head = 0.5,
  muq = 0,
  padTop,
  className = "",
  style,
}: {
  children: ReactNode;
  head?: number;
  muq?: number;
  padTop: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const id = `gpa${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const box: ArchBox = { L: 8, R: w - 8, ay: 10, sy: 10 + head * w, bottom: h };
  const niche = archPath(box);
  const cellH = Math.max(8, Math.min(13, w / 16));
  const tiers = muq > 0 && w > 0 ? archTiers(box, box.ay + head * w * muq, cellH) : [];

  return (
    <div ref={ref} className={`relative ${className}`} style={style}>
      {w > 0 && (
        <svg aria-hidden data-decor viewBox={`0 0 ${f(w)} ${f(h)}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <clipPath id={id}>
              <path d={niche} />
            </clipPath>
          </defs>
          <path d={archPath(grow(box, 7))} fill={PLASTER} />
          <Bead d={archPath(grow(box, 7))} width={2.2} />
          <path d={niche} fill="url(#gp-niche)" />
          <g clipPath={`url(#${id})`}>
            {tiers.length > 0 && <MuqarnasCells tiers={tiers} />}
            <path d={niche} fill="none" stroke="#7E6E57" strokeOpacity={0.32} strokeWidth={10} filter="url(#gp-blur)" />
          </g>
          <path d={archPath(grow(box, 2.5))} fill="none" stroke="url(#gp-gold)" strokeWidth={0.9} />
          <rect x={0} y={f(h - 4)} width={f(w)} height={4} fill={PLASTER} />
          <Bead d={`M1 ${f(h - 4)}H${f(w - 1)}`} width={1.3} />
        </svg>
      )}
      <div className="relative" style={{ paddingTop: padTop }}>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── Мелкие украшения ───────────────────────── */

/** Карниз-муқарнас как разделитель секций */
export function MuqarnasFrieze({ className = "" }: { className?: string }) {
  const W = 260;
  const tiers = friezeTiers(W, 13, [13, 12, 11, 8, 5]);
  return (
    <svg aria-hidden viewBox={`-4 -6 ${W + 8} 80`} className={`mx-auto block w-[min(78%,260px)] ${className}`}>
      <rect x={-4} y={-6} width={W + 8} height={6} fill={PLASTER} />
      <Bead d={`M-3 -1H${W + 3}`} width={1.6} />
      <MuqarnasCells tiers={tiers} />
      <polygon points={starPoints(W / 2, 72, 4.5, 0.6)} fill="url(#gp-gold)" />
    </svg>
  );
}

/** Звезда-ҳотам: медальон даты. Две ленты-квадрата сплетаются, внутри золотая звезда */
export function KhatamMedallion({ className = "" }: { className?: string }) {
  const c = 100;
  const sq = (r: number, rot: number) => {
    const pts = [0, 90, 180, 270].map((a) => {
      const rad = ((a + 45 + rot) * Math.PI) / 180;
      return `${f(c + r * Math.cos(rad))},${f(c + r * Math.sin(rad))}`;
    });
    return `M${pts.join("L")}Z`;
  };
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={className}>
      <polygon points={starPoints(c, c, 96, 0.8)} fill={GROUND} />
      <polygon points={starPoints(c, c, 96, 0.8)} fill="none" stroke="#FFFFFF" strokeWidth={1.4} transform="translate(-0.6 -0.6)" />
      <polygon points={starPoints(c, c, 96, 0.8)} fill="none" stroke={SHADE} strokeOpacity={0.7} strokeWidth={1.2} transform="translate(0.8 1)" />
      {/* две сплетённые ленты */}
      <Bead d={sq(80, 0)} width={7} />
      <Bead d={sq(80, 45)} width={7} />
      <path d={sq(80, 0)} fill="none" stroke="url(#gp-gold)" strokeWidth={0.9} />
      <path d={sq(80, 45)} fill="none" stroke="url(#gp-gold)" strokeWidth={0.9} />
      <circle cx={c} cy={c} r={58} fill={SURFACE} />
      <circle cx={c} cy={c} r={58} fill="none" stroke={SHADE} strokeOpacity={0.6} strokeWidth={1.2} transform="translate(0.6 0.8)" />
      <circle cx={c} cy={c} r={53} fill="none" stroke="url(#gp-gold)" strokeWidth={0.8} />
    </svg>
  );
}

/** Маленький гирих-ромб для соединительной линии дастура */
export function StarDot({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={className}>
      <polygon points={starPoints(10, 10, 9, 0.62)} fill="url(#gp-gold)" />
      <circle cx={10} cy={10} r={2.6} fill={PLASTER} />
    </svg>
  );
}

/** Картуш-китоба (надпись в ганче): заострённые концы, двойная обводка, звёздочки по краям */
export function Kitoba({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [ref, { w, h }] = useSize<HTMLSpanElement>();
  const shape = (i: number) => {
    const a = i;
    const b = w - i;
    const t = i;
    const bt = h - i;
    const e = Math.min(36, (bt - t) * 0.55);
    const m = (t + bt) / 2;
    return (
      `M${f(a + e)} ${f(t)}H${f(b - e)}C${f(b - e * 0.35)} ${f(t)} ${f(b)} ${f(m - (m - t) * 0.45)} ${f(b)} ${f(m)}` +
      `C${f(b)} ${f(m + (bt - m) * 0.45)} ${f(b - e * 0.35)} ${f(bt)} ${f(b - e)} ${f(bt)}H${f(a + e)}` +
      `C${f(a + e * 0.35)} ${f(bt)} ${f(a)} ${f(m + (bt - m) * 0.45)} ${f(a)} ${f(m)}` +
      `C${f(a)} ${f(m - (m - t) * 0.45)} ${f(a + e * 0.35)} ${f(t)} ${f(a + e)} ${f(t)}Z`
    );
  };
  return (
    <span ref={ref} className={`relative block ${className}`}>
      {w > 0 && (
        <svg aria-hidden data-decor viewBox={`0 0 ${f(w)} ${f(h)}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <path d={shape(1)} fill={GROUND} />
          <path d={shape(1)} fill="url(#gp-islimi-r)" opacity={0.85} />
          <path d={shape(9)} fill={SURFACE} />
          <Bead d={shape(1)} width={2} />
          <Bead d={shape(9)} width={2.2} />
          <path d={shape(13)} fill="none" stroke="url(#gp-gold)" strokeWidth={0.9} />
          {[22, w - 22].map((x) => (
            <polygon key={x} points={starPoints(x, h / 2, 5.5, 0.6)} fill="url(#gp-gold)" />
          ))}
        </svg>
      )}
      <span className="relative block">{children}</span>
    </span>
  );
}

/** Рамка календаря: кайма-гирих по прямоугольнику */
export function GirihPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const id = `gpp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const bx = w > 0 ? w / Math.max(1, Math.round(w / 13)) : 13;
  const by = h > 0 ? h / Math.max(1, Math.round(h / 13)) : 13;
  const ring = `M0 0H${f(w)}V${f(h)}H0Z M${f(bx)} ${f(by)}V${f(h - by)}H${f(w - bx)}V${f(by)}Z`;
  return (
    <div ref={ref} className={`relative ${className}`}>
      {w > 0 && (
        <svg aria-hidden data-decor viewBox={`0 0 ${f(w)} ${f(h)}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <pattern id={id} href="#gp-girih-r" x={0} y={0} width={f(bx)} height={f(by)} />
          </defs>
          <path d={ring} fill={GROUND} fillRule="evenodd" />
          <path d={ring} fill={`url(#${id})`} fillRule="evenodd" />
          <rect x={f(bx)} y={f(by)} width={f(w - 2 * bx)} height={f(h - 2 * by)} fill={SURFACE} />
          <Bead d={`M0 0H${f(w)}V${f(h)}H0Z`} width={1.5} />
          <Bead d={`M${f(bx)} ${f(by)}H${f(w - bx)}V${f(h - by)}H${f(bx)}Z`} width={1.6} />
          <rect x={f(bx + 5)} y={f(by + 5)} width={f(w - 2 * bx - 10)} height={f(h - 2 * by - 10)} fill="none" stroke="url(#gp-gold)" strokeWidth={0.8} />
        </svg>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
