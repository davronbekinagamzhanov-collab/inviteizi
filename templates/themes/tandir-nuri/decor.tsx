"use client";

import { motion } from "motion/react";

/** Украшения «Тандир нури»: янтарь, нон с узором чекич, свечение и пар */

// Округляем координаты: иначе сервер и браузер дают разные знаки после запятой (ошибка гидрации)
export const round = (n: number) => Math.round(n * 100) / 100;

export function Defs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        {/* янтарное золото: корочка нона с бликом */}
        <linearGradient id="tn-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#94561A" />
          <stop offset="0.3" stopColor="#C9822C" />
          <stop offset="0.52" stopColor="#F6D79A" />
          <stop offset="0.74" stopColor="#C9822C" />
          <stop offset="1" stopColor="#94561A" />
        </linearGradient>
        {/* жар: светлая сердцевина → янтарь → тёмная медь */}
        <radialGradient id="tn-ember" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#FFF0C4" />
          <stop offset="0.35" stopColor="#F6C064" />
          <stop offset="0.75" stopColor="#D9782A" />
          <stop offset="1" stopColor="#A9471B" />
        </radialGradient>
        <linearGradient id="tn-steam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.3" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Нон сверху: бортик и наколотый чекичем узор (кольца точек и розетка в центре).
 * Рисуется тонкой янтарной линией — как тиснение.
 */
export function NonRosette({
  className = "",
  dots = true,
  rosette = true,
}: {
  className?: string;
  dots?: boolean;
  rosette?: boolean;
}) {
  const ring = (r: number, n: number, size: number, phase = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + phase;
      return <circle key={`${r}-${i}`} cx={round(50 + r * Math.cos(a))} cy={round(50 + r * Math.sin(a))} r={size} />;
    });
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#tn-amber)" strokeWidth="2.4" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="url(#tn-amber)" strokeWidth="1" strokeOpacity="0.8" />
      {dots && <g fill="url(#tn-amber)">{ring(31, 18, 1.5)}</g>}
      {dots && rosette && <g fill="url(#tn-amber)">{ring(21, 10, 1.7, Math.PI / 10)}</g>}
      {/* розетка: шесть лепестков-вмятин */}
      {rosette && (
        <g fill="none" stroke="url(#tn-amber)" strokeWidth="1.3">
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse key={i} cx="50" cy="42.5" rx="3.6" ry="7.5" transform={`rotate(${i * 60} 50 50)`} />
          ))}
        </g>
      )}
      {rosette && <circle cx="50" cy="50" r="2.2" fill="url(#tn-amber)" />}
    </svg>
  );
}

/** Разделитель: две тонкие янтарные линии и маленький нон */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#C9822C]" />
      <NonRosette className="h-6 w-6" dots={false} />
      <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#C9822C]" />
    </div>
  );
}

/** Пар над горячим ноном: три тонкие струйки поднимаются, расширяются и тают */
export function Steam({ className = "" }: { className?: string }) {
  const wisps = [
    { x: 30, d: "M20 200 C 6 165, 34 140, 20 105 S 6 50, 22 10", dur: 6.2, delay: 0 },
    { x: 50, d: "M20 200 C 36 170, 4 140, 22 100 S 36 45, 18 5", dur: 7, delay: 2.1 },
    { x: 68, d: "M20 200 C 8 160, 32 135, 18 95 S 8 45, 24 12", dur: 5.6, delay: 3.8 },
  ];
  return (
    <div aria-hidden data-decor className={`pointer-events-none ${className}`}>
      {wisps.map((w, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 40 210"
          className="absolute bottom-0 h-full w-[18%] -translate-x-1/2 blur-[3px]"
          style={{ left: `${w.x}%` }}
          initial={{ opacity: 0, y: 30, scaleX: 0.8 }}
          animate={{ opacity: [0, 0.75, 0], y: [30, -10, -50], scaleX: [0.8, 1.1, 1.5] }}
          transition={{ duration: w.dur, delay: w.delay, repeat: Infinity, ease: "easeOut", times: [0, 0.45, 1] }}
        >
          <path d={w.d} fill="none" stroke="url(#tn-steam)" strokeWidth="7" strokeLinecap="round" />
        </motion.svg>
      ))}
    </div>
  );
}

/** Тёплое свечение, которое медленно «дышит» (за временем и в конце) */
export function Glow({ className = "", strong = false }: { className?: string; strong?: boolean }) {
  return (
    <motion.div
      aria-hidden
      data-decor
      className={`pointer-events-none rounded-full ${className}`}
      style={{
        background: strong
          ? "radial-gradient(closest-side, rgba(248,196,110,0.75) 0%, rgba(245,190,105,0.38) 45%, rgba(245,190,105,0) 100%)"
          : "radial-gradient(closest-side, rgba(250,206,130,0.6) 0%, rgba(248,200,125,0.28) 50%, rgba(248,200,125,0) 100%)",
      }}
      animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Стрелка «листайте вниз» */
export function ScrollHint({ show }: { show: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="absolute bottom-5 left-1/2 -translate-x-1/2"
      initial={{ opacity: 0 }}
      animate={show ? { opacity: 0.9, y: [0, 6, 0] } : { opacity: 0 }}
      transition={{ opacity: { delay: 1.4, duration: 0.6 }, y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 drop-shadow-[0_1px_6px_rgba(90,50,20,0.6)]" fill="none" stroke="#FFF6E6" strokeWidth="1.6">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </motion.div>
  );
}
