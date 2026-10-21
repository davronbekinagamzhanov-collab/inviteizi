/** Украшения «Тонгги қозон»: шафрановое золото, гранат, казан, пар */

export function GoldDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="tq-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A87A28" />
          <stop offset="0.3" stopColor="#C68A2E" />
          <stop offset="0.52" stopColor="#F6D58E" />
          <stop offset="0.75" stopColor="#C68A2E" />
          <stop offset="1" stopColor="#A87A28" />
        </linearGradient>
        <radialGradient id="tq-pom" cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#C8504A" />
          <stop offset="0.6" stopColor="#8E2A2A" />
          <stop offset="1" stopColor="#5E1A1A" />
        </radialGradient>
        <radialGradient id="tq-plov" cx="0.5" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#F8DFA0" />
          <stop offset="0.5" stopColor="#E3B25A" />
          <stop offset="1" stopColor="#B97B2C" />
        </radialGradient>
        <linearGradient id="tq-iron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A4636" />
          <stop offset="1" stopColor="#2B1F17" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Гранат: круг, корона и блик */
export function Pomegranate({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className}>
      <path d="M15 8 L17 3 L20 7 L23 3 L25 8 Z" fill="url(#tq-pom)" />
      <circle cx="20" cy="22" r="15" fill="url(#tq-pom)" />
      <ellipse cx="14" cy="16" rx="4" ry="2.5" fill="#fff" fillOpacity="0.25" transform="rotate(-30 14 16)" />
    </svg>
  );
}

/** Разделитель: линии и гранат посередине */
export function PomegranateDivider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="gold-fill h-px w-16" />
      <Pomegranate className="h-6 w-6" />
      <span className="gold-fill h-px w-16" />
    </div>
  );
}

/** Клубы пара: полупрозрачные размытые облачка поднимаются и тают */
export function Steam({ className = "" }: { className?: string }) {
  const puffs = [
    { left: 30, size: 70, dur: 5.5, delay: 0 },
    { left: 46, size: 90, dur: 6.5, delay: 1.4 },
    { left: 58, size: 64, dur: 5, delay: 2.6 },
    { left: 40, size: 80, dur: 7, delay: 3.6 },
    { left: 52, size: 56, dur: 5.8, delay: 4.6 },
  ];
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      <style>{`
        @keyframes tq-steam {
          0% { transform: translate3d(0, 0, 0) scale(0.6); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translate3d(var(--dx), -180px, 0) scale(1.6); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .tq-puff { animation: none !important; opacity: 0.25; } }
      `}</style>
      {puffs.map((p, i) => (
        <span
          key={i}
          className="tq-puff absolute bottom-0 rounded-full"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,250,240,0.6) 40%, rgba(255,255,255,0) 70%)",
              filter: "blur(5px)",
              animation: `tq-steam ${p.dur}s ease-out ${p.delay}s infinite`,
              opacity: 0,
              "--dx": `${i % 2 ? 24 : -20}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * Временный фон вместо картины: казан с пловом на очаге, лепёшки и гранаты на подносе.
 * Рисованный «линией с заливкой», тёплые утренние цвета.
 */
export function KazanScene({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" className={className}>
      {/* очаг из кирпича */}
      <path d="M90 300 V238 Q200 222 310 238 V300 Z" fill="#C9A27A" />
      <path d="M90 238 Q200 222 310 238" fill="none" stroke="#A97F55" strokeWidth="2" />
      {[250, 268, 286].map((y) => (
        <path key={y} d={`M92 ${y} H308`} stroke="#B48C63" strokeWidth="1.2" />
      ))}
      {/* огонь под казаном */}
      <path d="M170 246 C 176 232, 186 236, 190 222 C 196 236, 206 230, 208 246 Z" fill="#E8833A" fillOpacity="0.85" />
      <path d="M196 246 C 202 236, 212 240, 214 228 C 220 238, 228 236, 230 246 Z" fill="#F2B04C" fillOpacity="0.85" />
      {/* казан */}
      <path d="M64 150 Q200 136 336 150 Q330 238 200 244 Q70 238 64 150 Z" fill="url(#tq-iron)" />
      <path d="M64 150 Q200 136 336 150" fill="none" stroke="#7A6250" strokeWidth="3" />
      <ellipse cx="200" cy="150" rx="136" ry="16" fill="#3A2C22" />
      {/* плов горкой */}
      <path d="M78 152 Q200 60 322 152 Q200 166 78 152 Z" fill="url(#tq-plov)" />
      {/* морковь-соломка и нут */}
      {[
        [130, 128, -20],
        [160, 110, 15],
        [196, 100, -8],
        [232, 108, 20],
        [262, 126, -15],
        [178, 132, 30],
        [220, 130, -25],
      ].map(([x, y, r], i) => (
        <rect key={i} x={x} y={y} width="16" height="3" rx="1.5" fill="#D9762E" transform={`rotate(${r} ${x + 8} ${y + 1.5})`} />
      ))}
      {[
        [150, 138],
        [205, 118],
        [245, 140],
        [186, 146],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill="#F1D9A6" />
      ))}
      {/* чеснок сверху */}
      <circle cx="200" cy="88" r="9" fill="#FBF1DC" />
      <path d="M200 79 V72" stroke="#9C8B6A" strokeWidth="2" />
      {/* ручки казана */}
      <path d="M58 168 q-14 4 -12 18 q2 10 14 8" fill="none" stroke="#2B1F17" strokeWidth="5" strokeLinecap="round" />
      <path d="M342 168 q14 4 12 18 q-2 10 -14 8" fill="none" stroke="#2B1F17" strokeWidth="5" strokeLinecap="round" />
      {/* поднос с лепёшкой и гранатами */}
      <ellipse cx="350" cy="286" rx="46" ry="10" fill="url(#tq-gold)" />
      <circle cx="338" cy="270" r="13" fill="url(#tq-pom)" />
      <circle cx="362" cy="274" r="11" fill="url(#tq-pom)" />
      <ellipse cx="48" cy="284" rx="40" ry="12" fill="#D9A869" />
      <ellipse cx="48" cy="281" rx="26" ry="7" fill="#E8C188" />
      {[36, 48, 60].map((x) => (
        <circle key={x} cx={x} cy="281" r="1.5" fill="#B98546" />
      ))}
    </svg>
  );
}
