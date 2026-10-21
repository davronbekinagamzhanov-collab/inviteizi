/** Украшения «Пион гулдаста»: золото, атласная лента с бантом, пионы и розы */

export function GoldDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="pg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A87A28" />
          <stop offset="0.3" stopColor="#B8892F" />
          <stop offset="0.52" stopColor="#F3D58A" />
          <stop offset="0.75" stopColor="#B8892F" />
          <stop offset="1" stopColor="#A87A28" />
        </linearGradient>
        {/* атлас: тёмный край, блик посередине */}
        <linearGradient id="pg-satin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4E1220" />
          <stop offset="0.35" stopColor="#7E2537" />
          <stop offset="0.5" stopColor="#B5536A" />
          <stop offset="0.65" stopColor="#7E2537" />
          <stop offset="1" stopColor="#4E1220" />
        </linearGradient>
        <radialGradient id="pg-peony" cx="0.5" cy="0.6" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#FBE0DE" />
          <stop offset="1" stopColor="#E7A9AE" />
        </radialGradient>
        <radialGradient id="pg-peony-blush" cx="0.5" cy="0.6" r="0.7">
          <stop offset="0" stopColor="#FFE9EC" />
          <stop offset="0.5" stopColor="#F2B9C0" />
          <stop offset="1" stopColor="#D47F8E" />
        </radialGradient>
        <radialGradient id="pg-rose" cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#B33A52" />
          <stop offset="0.6" stopColor="#7A1F33" />
          <stop offset="1" stopColor="#4E1220" />
        </radialGradient>
        <linearGradient id="pg-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9DB59A" />
          <stop offset="1" stopColor="#5E7D5E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Пион: слои лепестков вокруг центра */
function Peony({ x, y, r, fill = "url(#pg-peony)", rot = 0 }: { x: number; y: number; r: number; fill?: string; rot?: number }) {
  const ring = (n: number, rr: number, w: number, h: number, off: number) =>
    Array.from({ length: n }, (_, i) => (
      <ellipse
        key={`${rr}-${i}`}
        cx={0}
        cy={-rr}
        rx={w}
        ry={h}
        fill={fill}
        stroke="#D88F98"
        strokeOpacity="0.35"
        strokeWidth="0.6"
        transform={`rotate(${(360 / n) * i + off})`}
      />
    ));
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {ring(9, r * 0.55, r * 0.42, r * 0.5, 0)}
      {ring(7, r * 0.32, r * 0.34, r * 0.4, 20)}
      {ring(5, r * 0.14, r * 0.26, r * 0.3, 40)}
      <circle r={r * 0.14} fill="#FFF3F2" />
    </g>
  );
}

/** Роза: закрученные лепестки-дуги */
function Rose({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="url(#pg-rose)" />
      {[0.8, 0.58, 0.36].map((k, i) => (
        <path
          key={k}
          d={`M${-r * k} 0 A ${r * k} ${r * k} 0 1 1 ${r * k * 0.6} ${r * k * 0.8}`}
          fill="none"
          stroke="#E07A8E"
          strokeOpacity={0.55 - i * 0.1}
          strokeWidth="1.2"
          transform={`rotate(${i * 70})`}
        />
      ))}
    </g>
  );
}

function Leaf({ x, y, s, rot }: { x: number; y: number; s: number; rot: number }) {
  return (
    <path
      d="M0 0 C 10 -14, 34 -16, 48 0 C 34 16, 10 14, 0 0 Z"
      fill="url(#pg-leaf)"
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
    />
  );
}

/** Временный фон вместо картины: пышный букет пионов и роз в золотой вазе */
export function BouquetFallback({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 420" preserveAspectRatio="xMidYMax meet" className={className}>
      {/* ткань стола */}
      <ellipse cx="200" cy="404" rx="210" ry="22" fill="#F3E2D6" />
      {/* листья за цветами */}
      <Leaf x={70} y={190} s={1.4} rot={200} />
      <Leaf x={330} y={180} s={1.4} rot={-20} />
      <Leaf x={110} y={110} s={1.1} rot={230} />
      <Leaf x={292} y={104} s={1.1} rot={-50} />
      <Leaf x={150} y={250} s={1} rot={160} />
      <Leaf x={250} y={250} s={1} rot={20} />
      {/* цветы */}
      <Peony x={118} y={176} r={58} fill="url(#pg-peony-blush)" rot={10} />
      <Peony x={286} y={170} r={60} rot={-12} />
      <Peony x={200} y={112} r={64} />
      <Rose x={196} y={208} r={30} />
      <Peony x={168} y={236} r={48} fill="url(#pg-peony-blush)" rot={30} />
      <Peony x={252} y={232} r={44} rot={-30} />
      <Rose x={96} y={248} r={22} />
      <Rose x={318} y={240} r={24} />
      <Peony x={140} y={70} r={34} fill="url(#pg-peony-blush)" />
      <Peony x={268} y={66} r={32} fill="url(#pg-peony-blush)" />
      {/* золотая ваза */}
      <path d="M150 272 Q200 262 250 272 L242 300 Q270 330 252 372 Q236 400 200 402 Q164 400 148 372 Q130 330 158 300 Z" fill="url(#pg-gold)" />
      <path d="M150 272 Q200 262 250 272" fill="none" stroke="#FFF2C6" strokeOpacity="0.7" strokeWidth="2" />
      <path d="M170 312 Q200 304 230 312" fill="none" stroke="#8A6420" strokeOpacity="0.5" strokeWidth="1.5" />
      <ellipse cx="182" cy="340" rx="8" ry="22" fill="#FFF5D6" fillOpacity="0.35" />
      {/* лепестки на столе */}
      <ellipse cx="96" cy="392" rx="10" ry="5" fill="#F2B9C0" transform="rotate(-20 96 392)" />
      <ellipse cx="300" cy="396" rx="9" ry="4.5" fill="#F7D3D6" transform="rotate(25 300 396)" />
      <ellipse cx="330" cy="388" rx="7" ry="3.5" fill="#B33A52" transform="rotate(-10 330 388)" />
    </svg>
  );
}

/** Бант: две петли, два хвоста и узел (атлас) */
export function Bow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 160 110" className={className}>
      <path d="M80 52 C 60 20, 18 8, 14 34 C 10 58, 50 64, 80 56 Z" fill="url(#pg-satin)" />
      <path d="M80 52 C 100 20, 142 8, 146 34 C 150 58, 110 64, 80 56 Z" fill="url(#pg-satin)" />
      <path d="M74 58 C 64 76, 52 92, 40 106 L54 104 L60 110 C 70 92, 78 76, 80 60 Z" fill="url(#pg-satin)" />
      <path d="M86 58 C 96 76, 108 92, 120 106 L106 104 L100 110 C 90 92, 82 76, 80 60 Z" fill="url(#pg-satin)" />
      <ellipse cx="80" cy="54" rx="13" ry="11" fill="url(#pg-satin)" />
      <path d="M30 30 C 40 24, 56 28, 70 44 M130 30 C 120 24, 104 28, 90 44" fill="none" stroke="#E7A0B2" strokeOpacity="0.55" strokeWidth="1.5" />
    </svg>
  );
}

/** Разделитель: золотые линии и лепесток */
export function PetalDivider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="gold-fill h-px w-14" />
      <svg viewBox="0 0 30 20" className="h-5 w-7">
        <path d="M15 2 C 22 6, 22 14, 15 18 C 8 14, 8 6, 15 2 Z" fill="url(#pg-satin)" />
        <path d="M4 10 C 7 7, 10 7, 11 10 C 10 13, 7 13, 4 10 Z M26 10 C 23 7, 20 7, 19 10 C 20 13, 23 13, 26 10 Z" fill="url(#pg-gold)" />
      </svg>
      <span className="gold-fill h-px w-14" />
    </div>
  );
}
