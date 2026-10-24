"use client";

import { motion } from "motion/react";
import { SILVER_GOLD, SILK, SILK_LIGHT, SILK_SHADOW } from "./style";

export const EASE = [0.22, 1, 0.36, 1] as const;
/** Ислими вокруг имён прорисовывается за это время */
export const DRAW_S = 2.4;

/** Общие градиенты: серебристое золото (5 стопов, блик посередине) */
export function SilverGoldDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="ir-gold" x1="0" y1="0" x2="1" y2="1">
          {SILVER_GOLD.map((c, i) => (
            <stop key={i} offset={[0, 0.28, 0.5, 0.72, 1][i]} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id="ir-gold-h" x1="0" y1="0" x2="1" y2="0">
          {SILVER_GOLD.map((c, i) => (
            <stop key={i} offset={[0, 0.3, 0.5, 0.7, 1][i]} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Шёлк: мягкие складки (размытые полосы света и тени) + тонкое плетение */

const FOLDS_LIGHT = [
  // широкая складка из левого верхнего угла вниз вправо
  "M-60 60 C 60 120, 170 250, 240 420 C 300 560, 370 650, 470 720 L 470 800 C 350 720, 270 620, 210 470 C 140 300, 50 170, -60 140 Z",
  // узкая складка справа сверху
  "M300 -40 C 330 80, 360 170, 470 250 L 470 300 C 340 220, 300 120, 270 -40 Z",
  // нижняя волна
  "M-60 760 C 60 720, 150 780, 230 860 C 260 890, 300 930, 330 960 L 260 960 C 200 900, 130 820, -60 820 Z",
];
const FOLDS_SHADOW = [
  "M-60 150 C 50 180, 150 300, 210 470 C 260 610, 350 720, 470 800 L 470 880 C 330 800, 230 680, 170 520 C 110 360, 40 260, -60 230 Z",
  "M270 -40 C 300 120, 340 220, 470 300 L 470 380 C 310 300, 260 180, 230 -40 Z",
  "M-60 420 C 20 430, 60 500, 80 600 C 90 660, 60 720, -60 760 Z",
];

export function SilkBackdrop() {
  return (
    <div aria-hidden data-decor className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(170deg, ${SILK_LIGHT} 0%, ${SILK} 38%, #E4DCEE 64%, ${SILK} 82%, #DFD6EA 100%)`,
        }}
      />
      {/* тени складок */}
      <svg viewBox="0 0 400 900" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="ir-blur-s" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>
        <g filter="url(#ir-blur-s)" fill={SILK_SHADOW} opacity="0.75">
          {FOLDS_SHADOW.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
      {/* свет на складках: дышит очень медленно — «блеск шёлка» */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: [0.7, 1, 0.7], y: [0, 6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 400 900" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <filter id="ir-blur-l" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="16" />
            </filter>
          </defs>
          <g filter="url(#ir-blur-l)" fill="#FFFFFF" opacity="0.85">
            {FOLDS_LIGHT.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </svg>
      </motion.div>
      {/* плетение ткани: еле заметная косая сетка */}
      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-soft-light"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, rgba(90,60,120,0.18) 0 1px, transparent 1px 5px)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Кайма рўмола: печатная полоса с бодомчами (миндалинками) и точками */

export function HemBand({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden data-decor viewBox="0 0 400 26" preserveAspectRatio="xMidYMid slice" className={`relative block h-[26px] w-full ${className}`}>
      <defs>
        <pattern id="ir-hem" width="26" height="26" patternUnits="userSpaceOnUse" x="-3">
          {/* бодомча, наклонённая — как на набивных рўмолах */}
          <path
            d="M13 6.5 C 17.5 8.5, 18 15, 13 19.5 C 8 15, 8.5 8.5, 13 6.5 Z"
            fill="none"
            stroke="url(#ir-gold)"
            strokeWidth="0.9"
          />
          <path d="M13 10 C 14.6 11.5, 14.6 14.5, 13 16 C 11.4 14.5, 11.4 11.5, 13 10 Z" fill="url(#ir-gold)" opacity="0.75" />
          <circle cx="0" cy="13" r="1.2" fill="url(#ir-gold)" />
          <circle cx="26" cy="13" r="1.2" fill="url(#ir-gold)" />
        </pattern>
      </defs>
      <rect width="400" height="26" fill="#DCD0E8" opacity="0.55" />
      <rect y="0" width="400" height="26" fill="url(#ir-hem)" />
      <rect y="2.5" width="400" height="0.7" fill="url(#ir-gold-h)" />
      <rect y="22.8" width="400" height="0.7" fill="url(#ir-gold-h)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Попук — бахрома на конце рўмола: нити, собранные в кисточки с узелками */

const TASSELS = 26;
export function Fringe() {
  const step = 400 / TASSELS;
  return (
    <svg aria-hidden data-decor viewBox="0 0 400 64" preserveAspectRatio="xMidYMin slice" className="block h-[64px] w-full">
      {Array.from({ length: TASSELS }, (_, i) => {
        const x = step * i + step / 2;
        // длина кисточки «гуляет», как у настоящей бахромы
        const len = 44 + Math.round(Math.sin(i * 1.7) * 5 + Math.cos(i * 0.6) * 4);
        return (
          <g key={i}>
            {[-3, -1.5, 0, 1.5, 3].map((dx, k) => (
              <path
                key={k}
                d={`M${x + dx * 0.4} 0 L${x + dx * 0.25} 9 C ${x + dx} 18, ${x + dx * 1.3} ${len - 12}, ${x + dx * 1.2 + Math.sin(i + k) * 0.8} ${len}`}
                fill="none"
                stroke={k === 2 ? "url(#ir-gold)" : "#B7A6CA"}
                strokeWidth={k === 2 ? 0.9 : 0.75}
                strokeLinecap="round"
              />
            ))}
            {/* узелок */}
            <ellipse cx={x} cy={9.5} rx={2.4} ry={2} fill="url(#ir-gold)" />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Ислими вокруг имён: две ветви поднимаются от нижней пальметты,
   обнимают имена и встречаются наверху у бутона. Рисуется линией. */

// Левая половина (ось симметрии x = 160). Правая — зеркально.
// Контур — бодомча (миндалина): острые верх и низ, как у «бодом» на набивных рўмолах.
const HALF: { d: string; w: number; leaf?: boolean; at: number }[] = [
  // главная лоза
  { d: "M160 282 C 154 266, 140 256, 120 250 C 70 236, 32 200, 30 140 C 26 72, 70 36, 120 22 C 140 16, 154 8, 160 -10", w: 1.5, at: 0 },
  // тонкая внутренняя линия, вторит лозе
  { d: "M160 266 C 154 256, 138 248, 120 242 C 76 228, 45 196, 43 140 C 40 86, 78 50, 122 36 C 140 30, 152 22, 160 8", w: 0.7, at: 0.25 },
  // нижний завиток наружу
  { d: "M57 212 C 36 228, 12 222, 10 204 C 9 190, 24 184, 32 192 C 38 199, 32 207, 26 203", w: 1.2, at: 0.55 },
  // румий-лист внизу
  { d: "M37 184 C 14 182, 0 166, 2 148 C 14 158, 27 168, 37 184 Z", w: 1.1, leaf: true, at: 0.75 },
  { d: "M35 182 C 24 174, 12 164, 6 154", w: 0.6, at: 0.9 },
  // усик в середине
  { d: "M30 140 C 16 136, 8 126, 10 116 C 12 108, 22 108, 22 116", w: 1, at: 0.95 },
  // лист выше
  { d: "M33 100 C 14 94, 6 78, 10 62 C 20 74, 27 86, 33 100 Z", w: 1.1, leaf: true, at: 1.1 },
  { d: "M31 97 C 22 88, 16 78, 12 68", w: 0.6, at: 1.2 },
  // верхний завиток
  { d: "M55 61 C 34 54, 22 36, 32 22 C 41 10, 57 16, 52 27 C 49 33, 41 30, 43 24", w: 1.2, at: 1.3 },
  // маленький лист у вершины
  { d: "M118 22 C 104 14, 100 0, 106 -12 C 116 -2, 120 10, 118 22 Z", w: 1, leaf: true, at: 1.55 },
  // завиток нижней пальметты
  { d: "M120 250 C 108 262, 92 266, 82 258 C 76 252, 82 244, 88 248", w: 1.1, at: 0.2 },
  // лист у нижнего острия
  { d: "M146 270 C 134 280, 120 280, 110 274 C 122 268, 134 266, 146 270 Z", w: 0.9, leaf: true, at: 0.35 },
];

// Центр — без зеркала: бутон наверху, капля внизу
const CENTER: { d: string; w: number; leaf?: boolean; at: number }[] = [
  { d: "M160 -10 C 151 -18, 151 -30, 160 -40 C 169 -30, 169 -18, 160 -10 Z", w: 1.3, leaf: true, at: 1.7 },
  { d: "M160 -16 C 157 -20, 157 -26, 160 -30 C 163 -26, 163 -20, 160 -16 Z", w: 0.8, at: 1.85 },
  { d: "M160 282 C 154 290, 155 300, 160 306 C 165 300, 166 290, 160 282 Z", w: 1.2, leaf: true, at: 0.35 },
];

function Stroke({ d, w, leaf, at }: { d: string; w: number; leaf?: boolean; at: number }) {
  const dur = DRAW_S - at * 0.55;
  return (
    <>
      {leaf && (
        <motion.path
          d={d}
          fill="url(#ir-gold)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.28 }}
          transition={{ delay: 0.2 + at * 0.55 + dur * 0.8, duration: 0.8 }}
        />
      )}
      <motion.path
        d={d}
        fill="none"
        stroke="url(#ir-gold)"
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { delay: 0.2 + at * 0.55, duration: dur, ease: [0.45, 0, 0.25, 1] },
          opacity: { delay: 0.2 + at * 0.55, duration: 0.2 },
        }}
      />
    </>
  );
}

/** Ислими-медальон вокруг имён; внутри — children (имена) */
export function IslimiCartouche({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[320/354] w-full">
      <svg aria-hidden data-decor viewBox="0 -44 320 354" className="absolute inset-0 h-full w-full overflow-visible">
        {/* мягкое сияние внутри медальона, чтобы имена читались на складках */}
        <ellipse cx="160" cy="132" rx="110" ry="120" fill="#FBF8FD" opacity="0.55" filter="url(#ir-blur-l)" />
        <g>
          {HALF.map((p) => (
            <Stroke key={p.d} {...p} />
          ))}
        </g>
        <g transform="translate(320 0) scale(-1 1)">
          {HALF.map((p) => (
            <Stroke key={p.d} {...p} />
          ))}
        </g>
        {CENTER.map((p) => (
          <Stroke key={p.d} {...p} />
        ))}
        {/* бусины на концах завитков */}
        {[
          [26, 203],
          [294, 203],
          [43, 24],
          [277, 24],
          [22, 116],
          [298, 116],
          [88, 248],
          [232, 248],
        ].map(([cx, cy]) => (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={1.9}
            fill="url(#ir-gold)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: DRAW_S + 0.05, duration: 0.4 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
      </svg>
      <div className="absolute inset-x-[14%] top-[19%] bottom-[19%] flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Маленькая веточка-разделитель: линия, бодомча, линия */
export function Sprig({ className = "w-[120px]" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 14" preserveAspectRatio="xMidYMid meet" className={`h-[14px] shrink-0 ${className}`}>
      <path d="M2 7 C 20 7, 34 4, 50 7" fill="none" stroke="url(#ir-gold-h)" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M118 7 C 100 7, 86 4, 70 7" fill="none" stroke="url(#ir-gold-h)" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M60 1 C 65 3.5, 65 10.5, 60 13 C 55 10.5, 55 3.5, 60 1 Z" fill="url(#ir-gold)" />
      <circle cx="47" cy="7" r="1.3" fill="url(#ir-gold)" />
      <circle cx="73" cy="7" r="1.3" fill="url(#ir-gold)" />
    </svg>
  );
}

/** Бусина-бодомча на нити «Тўй дастури» */
export function Bead() {
  return (
    <svg aria-hidden viewBox="0 0 14 20" className="h-5 w-[14px]">
      <path d="M7 1 C 12 5, 12 15, 7 19 C 2 15, 2 5, 7 1 Z" fill={SILK_LIGHT} stroke="url(#ir-gold)" strokeWidth="1.1" />
      <path d="M7 6 C 9 8, 9 12, 7 14 C 5 12, 5 8, 7 6 Z" fill="url(#ir-gold)" />
    </svg>
  );
}
