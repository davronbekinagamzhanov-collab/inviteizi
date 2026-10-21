/** SVG-украшения «Оқ от»: золото, силуэт Регистана, завитки */

export function GoldDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="oo-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A87A28" />
          <stop offset="0.3" stopColor="#B8892F" />
          <stop offset="0.52" stopColor="#F3D58A" />
          <stop offset="0.75" stopColor="#B8892F" />
          <stop offset="1" stopColor="#A87A28" />
        </linearGradient>
        <linearGradient id="oo-gold-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3D58A" />
          <stop offset="0.5" stopColor="#B8892F" />
          <stop offset="1" stopColor="#8A6420" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Золотой завиток-разделитель (как в эталоне суннат тўй) */
export function Swirl({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 160 24" className={className} fill="none" stroke="url(#oo-gold)" strokeWidth="1.3" strokeLinecap="round">
      <path d="M80 12 C 72 2, 60 4, 62 12 C 64 18, 72 16, 70 11" />
      <path d="M80 12 C 88 2, 100 4, 98 12 C 96 18, 88 16, 90 11" />
      <path d="M62 12 C 48 20, 30 6, 6 12" />
      <path d="M98 12 C 112 20, 130 6, 154 12" />
      <circle cx="80" cy="12" r="1.8" fill="url(#oo-gold)" />
    </svg>
  );
}

/** Уголок-орнамент для карточек */
export function CornerFlourish({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={className} fill="none" stroke="url(#oo-gold)" strokeWidth="1.2" strokeLinecap="round">
      <path d="M3 30 C 3 14, 14 3, 30 3" />
      <path d="M30 3 C 38 3, 44 8, 41 14 C 38 19, 31 16, 33 11" />
      <path d="M3 30 C 3 38, 8 44, 14 41 C 19 38, 16 31, 11 33" />
      <path d="M10 10 C 17 12, 21 17, 23 23 C 17 21, 12 17, 10 10 Z" fill="url(#oo-gold)" fillOpacity="0.25" />
    </svg>
  );
}

/**
 * Временный фон вместо картины: силуэт Регистана (порталы-пештаки, купола, минареты)
 * в утреннем голубом, с золотыми контурами.
 */
export function RegistanSilhouette({ className = "" }: { className?: string }) {
  // Портал с аркой: x — центр, w — ширина, h — высота
  const portal = (x: number, w: number, h: number) => {
    const l = x - w / 2;
    const top = 300 - h;
    const aw = w * 0.52;
    const al = x - aw / 2;
    const ah = h * 0.72;
    return (
      <g key={x}>
        <rect x={l} y={top} width={w} height={h} fill="#C9D6EA" />
        <path
          d={`M${al} 300 V${300 - ah * 0.62} Q${al} ${300 - ah} ${x} ${300 - ah - 6} Q${al + aw} ${300 - ah} ${al + aw} ${300 - ah * 0.62} V300 Z`}
          fill="#AFC2DF"
        />
        <rect x={l} y={top} width={w} height={h} fill="none" stroke="url(#oo-gold)" strokeWidth="1.1" />
        <path
          d={`M${al} 300 V${300 - ah * 0.62} Q${al} ${300 - ah} ${x} ${300 - ah - 6} Q${al + aw} ${300 - ah} ${al + aw} ${300 - ah * 0.62} V300`}
          fill="none"
          stroke="url(#oo-gold)"
          strokeWidth="1"
        />
      </g>
    );
  };
  const minaret = (x: number, h: number) => (
    <g key={`m${x}`}>
      <path d={`M${x - 7} 300 L${x - 5} ${300 - h} H${x + 5} L${x + 7} 300 Z`} fill="#BCCBE3" stroke="url(#oo-gold)" strokeWidth="0.8" />
      <rect x={x - 8} y={300 - h - 8} width="16" height="8" fill="#C9D6EA" stroke="url(#oo-gold)" strokeWidth="0.8" />
      <path d={`M${x - 6} ${300 - h - 8} Q${x} ${300 - h - 20} ${x + 6} ${300 - h - 8}`} fill="#AFC2DF" />
    </g>
  );
  const dome = (x: number, r: number, base: number) => (
    <g key={`d${x}`}>
      <rect x={x - r * 0.7} y={base - 14} width={r * 1.4} height="14" fill="#C2D1E8" />
      <path d={`M${x - r} ${base - 14} Q${x - r} ${base - 14 - r * 1.5} ${x} ${base - 14 - r * 1.7} Q${x + r} ${base - 14 - r * 1.5} ${x + r} ${base - 14} Z`} fill="#9FB6D9" />
      <path
        d={`M${x - r} ${base - 14} Q${x - r} ${base - 14 - r * 1.5} ${x} ${base - 14 - r * 1.7} Q${x + r} ${base - 14 - r * 1.5} ${x + r} ${base - 14}`}
        fill="none"
        stroke="url(#oo-gold)"
        strokeWidth="1"
      />
      {/* рёбра купола */}
      {[-0.5, 0, 0.5].map((k) => (
        <path key={k} d={`M${x + k * r} ${base - 14} Q${x + k * r * 0.6} ${base - 14 - r * 1.2} ${x} ${base - 14 - r * 1.7}`} fill="none" stroke="#E8EEF7" strokeOpacity="0.5" strokeWidth="0.8" />
      ))}
    </g>
  );

  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className={className}>
      {dome(108, 30, 205)}
      {dome(292, 30, 205)}
      {minaret(36, 150)}
      {minaret(364, 150)}
      {minaret(150, 175)}
      {minaret(250, 175)}
      {portal(80, 92, 150)}
      {portal(320, 92, 150)}
      {portal(200, 120, 205)}
      <rect x="0" y="292" width="400" height="8" fill="#C9D6EA" />
    </svg>
  );
}

/** Восьмиконечная звезда-гирих: медальон для временного фона */
export function GirihMedallion({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="-100 -100 200 200" className={className} fill="none" stroke="url(#oo-gold)" strokeWidth="0.9">
      <path d="M0 -90 L26 -26 L90 0 L26 26 L0 90 L-26 26 L-90 0 L-26 -26 Z" />
      <path d="M0 -90 L26 -26 L90 0 L26 26 L0 90 L-26 26 L-90 0 L-26 -26 Z" transform="rotate(45)" />
      <circle r="38" />
      <circle r="62" strokeOpacity="0.5" />
      <path d="M0 -38 L11 -11 L38 0 L11 11 L0 38 L-11 11 L-38 0 L-11 -11 Z" fill="url(#oo-gold)" fillOpacity="0.18" />
    </svg>
  );
}
