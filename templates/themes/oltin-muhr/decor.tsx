import { useId } from "react";

// Край сургучной печати: круг с неровными «наплывами» воска
const SEAL_PATH = (() => {
  const pts: string[] = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = 46 + 2.2 * Math.sin(a * 11) + 1.1 * Math.sin(a * 5 + 1);
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
})();

/** Золотая сургучная печать с инициалами пары */
export function Seal({ initials }: { initials: [string, string] }) {
  const id = useId();
  return (
    <div className="relative h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={`${id}-wax`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fbeab0" />
            <stop offset="40%" stopColor="#d9b25a" />
            <stop offset="80%" stopColor="#a87d2d" />
            <stop offset="100%" stopColor="#7d5a1c" />
          </radialGradient>
          <radialGradient id={`${id}-inner`} cx="60%" cy="65%" r="70%">
            <stop offset="0%" stopColor="#e9c873" />
            <stop offset="100%" stopColor="#b88d38" />
          </radialGradient>
        </defs>
        <path d={SEAL_PATH} fill={`url(#${id}-wax)`} />
        <circle cx="50" cy="50" r="35" fill={`url(#${id}-inner)`} />
        <circle cx="50" cy="50" r="35" fill="none" stroke="#7d5a1c" strokeOpacity="0.55" strokeWidth="1.4" />
        <circle cx="50" cy="50" r="31.5" fill="none" stroke="#fff3c8" strokeOpacity="0.5" strokeWidth="0.6" strokeDasharray="1.2 2.2" />
        <ellipse cx="36" cy="28" rx="9" ry="4" fill="#fff8dc" opacity="0.35" transform="rotate(-30 36 28)" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-[1.65rem] font-bold leading-none text-[#5e3f0c] [text-shadow:0_1px_0_rgba(255,240,190,0.7)]">
        <span>{initials[0]}</span>
        <span className="mx-0.5 font-script text-lg font-normal">&amp;</span>
        <span>{initials[1]}</span>
      </div>
    </div>
  );
}

/** Золотой разделитель с цветком посередине */
export function Divider({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 240 28" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id={`${id}-l`} x1="0" x2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="1" x2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <path d="M8 14H96" stroke={`url(#${id}-l)`} strokeWidth="1" />
      <path d="M144 14H232" stroke={`url(#${id}-r)`} strokeWidth="1" />
      <path d="M100 14l4-4 4 4-4 4z" fill="currentColor" />
      <path d="M132 14l4-4 4 4-4 4z" fill="currentColor" />
      {/* цветок из четырёх лепестков */}
      <g stroke="currentColor" strokeWidth="1.1">
        <path d="M120 14c-3-4-3-8 0-11 3 3 3 7 0 11z" fill="currentColor" fillOpacity="0.35" />
        <path d="M120 14c3 4 3 8 0 11-3-3-3-7 0-11z" fill="currentColor" fillOpacity="0.35" />
        <path d="M120 14c-4-3-8-3-11 0 3 3 7 3 11 0z" fill="currentColor" fillOpacity="0.35" />
        <path d="M120 14c4 3 8 3 11 0-3-3-7-3-11 0z" fill="currentColor" fillOpacity="0.35" />
      </g>
      <circle cx="120" cy="14" r="1.8" fill="currentColor" />
    </svg>
  );
}

/** Уголок-орнамент для рамки обложки */
export function Corner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" aria-hidden>
      <path d="M4 78V30C4 15 15 4 30 4h48" strokeWidth="1.2" />
      <path d="M11 78V34c0-13 10-23 23-23h44" strokeWidth="0.6" strokeOpacity="0.7" />
      <path d="M22 22c0-6 5-10 10-8 4 2 3 8-1 8-3 0-3-4 0-4" strokeWidth="1" />
      <path d="M30 4c-2 5-1 9 3 11M4 30c5-2 9-1 11 3" strokeWidth="0.8" />
      <path d="M40 11c4-4 9-4 12 0-4 3-8 3-12 0zM11 40c-4 4-4 9 0 12 3-4 3-8 0-12z" fill="currentColor" fillOpacity="0.3" strokeWidth="0.7" />
    </svg>
  );
}
