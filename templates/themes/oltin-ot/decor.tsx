/** SVG-украшения «Олтин от»: золото, конь в нарядной сбруе, қалампир чуст-дўппи, бархат */

import type { CSSProperties } from "react";

/** Градиенты золота и эмали — один раз на странице */
export function GoldDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="ot-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A6420" />
          <stop offset="0.32" stopColor="#C2923A" />
          <stop offset="0.52" stopColor="#F6DE97" />
          <stop offset="0.72" stopColor="#BD8E37" />
          <stop offset="1" stopColor="#7E5A1C" />
        </linearGradient>
        <linearGradient id="ot-gold-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6DE97" />
          <stop offset="0.45" stopColor="#C2923A" />
          <stop offset="1" stopColor="#8A6420" />
        </linearGradient>
        {/* мягкое золото для мелких қалампиров: без тёмных краёв, чтобы не «грязнили» */}
        <linearGradient id="ot-gq" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C2923A" />
          <stop offset="0.5" stopColor="#F6DE97" />
          <stop offset="1" stopColor="#AD812D" />
        </linearGradient>
        {/* золото коня: в координатах рисунка, чтобы блик шёл по всему телу одной полосой */}
        <linearGradient id="ot-horse" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="360" y2="380">
          <stop offset="0" stopColor="#8A6420" />
          <stop offset="0.3" stopColor="#C99A3C" />
          <stop offset="0.5" stopColor="#F6DE97" />
          <stop offset="0.68" stopColor="#C1913A" />
          <stop offset="1" stopColor="#7E5A1C" />
        </linearGradient>
        <linearGradient id="ot-horse-d" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="360" y2="380">
          <stop offset="0" stopColor="#6E4E16" />
          <stop offset="0.5" stopColor="#A97C30" />
          <stop offset="1" stopColor="#5E4312" />
        </linearGradient>
        {/* рельеф на медальоне: конь чуть темнее диска */}
        <linearGradient id="ot-relief" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="360" y2="380">
          <stop offset="0" stopColor="#9A7027" />
          <stop offset="0.5" stopColor="#E2BE6C" />
          <stop offset="1" stopColor="#8A6420" />
        </linearGradient>
        <linearGradient id="ot-enamel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B7DB0" />
          <stop offset="1" stopColor="#2F4C7C" />
        </linearGradient>
        <radialGradient id="ot-disc" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#FBEBB5" />
          <stop offset="0.45" stopColor="#D8AE58" />
          <stop offset="1" stopColor="#9A7027" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/**
 * Қалампир — «перчинка» с чуст-дўппи: изогнутый стручок с зубчиками по выпуклому краю.
 * Основание в (0,0), кончик вверху и загибается вправо. Высота ~51.
 */
export const QALAMPIR =
  "M0,0 C-7,-1 -9,-8 -9,-15 C-9,-25 -5,-34 1,-41 C4,-45 9,-49 14,-51 C11,-46 9,-42 8,-37 C7,-28 9,-18 7,-10 C6,-4 4,0 0,0 Z M-9,-11 L-13,-13 L-9,-16 Z M-9,-20 L-13,-23 L-8,-25 Z M-6,-29 L-10,-33 L-4,-33 Z M-2,-36 L-5,-41 L1,-40 Z";
/** Внутренний контур перчинки (вышивка второй ниткой) */
const QALAMPIR_INNER =
  "M0,-6 C-4,-6 -5,-11 -5,-15 C-5,-23 -2,-29 3,-35 C3,-27 4,-19 3,-12 C2,-8 2,-6 0,-6 Z";

export function Qalampir({
  transform,
  fill = "url(#ot-gq)",
  inner,
}: {
  transform?: string;
  fill?: string;
  /** цвет внутреннего контура (нет — без контура) */
  inner?: string;
}) {
  return (
    <g transform={transform}>
      <path d={QALAMPIR} fill={fill} />
      {inner && <path d={QALAMPIR_INNER} fill="none" stroke={inner} strokeWidth="1.1" />}
    </g>
  );
}

/** Розетка верха чуст-дўппи: четыре перчинки вокруг центра, как на тюбетейке */
export function DoppiRosette({
  className = "",
  inner,
  style,
}: {
  className?: string;
  inner?: string;
  style?: CSSProperties;
}) {
  return (
    <svg aria-hidden viewBox="-62 -62 124 124" className={className} style={style}>
      {/* соседние перчинки зеркальны: узор симметричен, без «вертушки» */}
      {[45, 135, 225, 315].map((a, i) => (
        <Qalampir key={a} transform={`rotate(${a}) translate(0,-8) scale(${i % 2 ? -1 : 1},1)`} inner={inner} />
      ))}
      <circle r="6.5" fill="url(#ot-gq)" />
      <circle r="2.6" fill={inner ?? "#8A6420"} />
    </svg>
  );
}

/**
 * Кайма-жияк дўппи: две золотые нити и между ними бегущий ряд перчинок.
 * Повторяется узором на любую ширину.
 */
export function QalampirBand({ className = "", id = "a" }: { className?: string; id?: string }) {
  const pid = `ot-band-${id}`;
  return (
    <svg aria-hidden className={`block w-full ${className}`} height="30" preserveAspectRatio="none">
      <defs>
        <pattern id={pid} width="38" height="30" patternUnits="userSpaceOnUse">
          {/* перчинка лежит на боку, кончиком вперёд */}
          <Qalampir transform="translate(5 16) rotate(90) scale(0.46)" />
          <circle cx="33" cy="15" r="1.7" fill="url(#ot-gq)" />
        </pattern>
      </defs>
      <rect x="0" y="1" width="100%" height="1.6" fill="url(#ot-gold)" />
      <rect x="0" y="5" width="100%" height="0.7" fill="url(#ot-gold)" opacity="0.8" />
      <rect x="0" y="0" width="100%" height="30" fill={`url(#${pid})`} />
      <rect x="0" y="24.3" width="100%" height="0.7" fill="url(#ot-gold)" opacity="0.8" />
      <rect x="0" y="27.4" width="100%" height="1.6" fill="url(#ot-gold)" />
    </svg>
  );
}

/** Тонкий разделитель: нить — перчинка — нить */
export function QalampirRule({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 180 24" className={className} fill="none">
      <path d="M6 12 H64" stroke="url(#ot-gold)" strokeWidth="1" />
      <path d="M116 12 H174" stroke="url(#ot-gold)" strokeWidth="1" />
      {/* две перчинки кончиками врозь и бусина между ними */}
      <Qalampir transform="translate(86 12) rotate(-90) scale(0.4)" />
      <Qalampir transform="translate(94 12) rotate(90) scale(-0.4 0.4)" />
      <circle cx="90" cy="12" r="1.8" fill="url(#ot-gq)" />
    </svg>
  );
}

// Тонкий шум — ворс бархата
const NOISE = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

/**
 * Голубой бархат: база, светлый «гребень» ворса по диагонали, тень по краям и шум.
 * Ставится слоем под содержимым (absolute inset-0).
 */
export function Velvet({ className = "", tone = "light" }: { className?: string; tone?: "light" | "deep" }) {
  const base =
    tone === "light"
      ? "linear-gradient(170deg, #C3D5EA 0%, #A9C1DD 45%, #94B0D4 100%)"
      : "linear-gradient(165deg, #9DB7D9 0%, #7E9CC5 55%, #6584B1 100%)";
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute inset-0" style={{ background: base }} />
      {/* ворс: свет ложится полосой, как на настоящем бархате */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(118deg, rgba(255,255,255,0) 22%, rgba(255,255,255,0.28) 44%, rgba(255,255,255,0.05) 58%, rgba(255,255,255,0) 70%), radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%), radial-gradient(140% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(30,52,90,0.28) 100%)",
        }}
      />
      <div className="absolute inset-0 opacity-[0.22] mix-blend-overlay" style={{ backgroundImage: NOISE }} />
    </div>
  );
}

/* ───────────────────────────── Конь ───────────────────────────── */

// Силуэт коня (смотрит вправо, правая передняя нога поднята — гарцует). Земля — y=372.
const H = {
  farFore:
    "M264,238 C272,238 280,240 284,244 C284,268 281,292 279,310 C278,326 279,342 281,352 C284,358 289,362 293,366 L293,372 L275,372 C275,364 273,356 273,350 C271,336 271,322 271,310 C269,290 266,266 264,238 Z",
  farHind:
    "M170,236 C180,258 181,280 177,296 C177,312 181,330 185,344 C189,352 195,360 201,366 L201,372 L183,372 C181,362 177,352 175,346 C171,332 167,318 165,308 C158,296 154,280 152,256 Z",
  tail: "M112,170 C94,154 72,158 60,178 C46,202 46,238 56,268 C62,288 66,306 62,326 C74,310 78,294 76,276 C84,296 90,310 90,330 C100,308 98,286 92,264 C86,240 88,214 98,196 C102,190 108,184 116,182 Z",
  body: "M108,170 C120,156 140,152 158,158 C178,164 198,168 216,162 C228,158 236,148 240,136 C248,110 268,80 300,66 C306,63 310,62 314,63 L318,84 C314,98 312,108 314,118 C304,132 296,152 298,176 C300,196 300,214 292,228 C286,240 278,248 270,252 C244,262 204,262 178,254 C168,250 160,244 154,238 C140,250 124,252 112,246 C98,236 92,216 96,198 C98,186 102,176 108,170 Z",
  head: "M306,64 C314,54 330,56 338,68 C348,84 360,104 370,118 C376,126 376,136 368,140 C362,143 356,142 352,139 C348,142 342,141 338,136 C332,128 326,122 318,118 C306,112 300,100 300,88 C300,78 302,70 306,64 Z",
  ears: "M310,60 C306,50 306,40 310,30 C316,40 320,50 319,60 Z M318,60 C318,50 320,42 326,34 C330,44 330,54 326,62 Z",
  nearFore:
    "M286,212 C304,214 324,222 338,232 C345,237 347,246 342,254 C338,264 334,276 333,286 C332,292 329,298 323,301 L316,308 L308,303 C311,297 316,292 319,288 C321,278 323,269 325,261 C315,257 300,255 285,255 C275,255 268,248 268,238 Z",
  nearHind:
    "M156,236 C158,256 150,274 142,288 C137,296 134,306 134,316 L134,344 C135,352 138,358 142,364 L146,372 L128,372 C127,364 126,356 125,350 L124,320 C120,312 114,306 110,298 C102,280 97,256 95,232 C94,220 94,208 96,198 Z",
  mane: "M242.2,129.7 C236.2,117.7 230.2,121.7 222.2,131.7 C228.2,133.7 232,132 240,136 Z M246.2,120.1 C238.7,108.1 229,111.6 221,121.6 C227,123.6 234.8,124.1 242.8,128.1 Z M251.4,110.5 C244.6,98.5 237,101.5 229,111.5 C235,113.5 239,114.5 247,118.5 Z M257.5,101.1 C249.2,89.1 237.9,85.6 229.9,95.6 C235.9,97.6 244.3,104.9 252.3,108.9 Z M264.7,92.1 C257.3,80.1 247.9,76.1 239.9,86.1 C245.9,88.1 250.7,95.5 258.7,99.5 Z M273,83.7 C264,71.7 251,67.2 243,77.2 C249,79.2 258,86.6 266,90.6 Z M282.2,76.2 C274.1,64.2 263,59.2 255,69.2 C261,71.2 266.4,78.4 274.4,82.4 Z M292.6,69.7 C282.8,57.7 268.2,52.2 260.2,62.2 C266.2,64.2 275.9,71 283.9,75 Z",
  hooves:
    "M128,372 L146,372 L145,366 L127,366 Z M183,372 L201,372 L201,367 L182,367 Z M275,372 L293,372 L293,367 L275,367 Z",
};

/** Части силуэта одним списком — для рельефа на медальоне */
const SILHOUETTE = [H.farFore, H.farHind, H.tail, H.body, H.head, H.ears, H.nearFore, H.nearHind, H.mane];

const LINE = "#6E4E16";

/**
 * Золотой конь в нарядной сбруе: бархатный чул с розеткой дўппи и кистями,
 * седло с высокой лукой, нагрудник с подвесками, уздечка с бирюзой, султан-попук, кисть под горлом.
 * prance — конь мягко «гарцует» (покачивается на задних ногах).
 */
export function Horse({
  className = "",
  prance = false,
  style,
}: {
  className?: string;
  prance?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg aria-hidden viewBox="40 12 344 364" className={className} style={style}>
      {prance && (
        <style>{`
          @keyframes ot-prance { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(-2.4deg) } }
          @keyframes ot-hoof { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(-7deg) } }
          .ot-prance { transform-origin: 137px 372px; animation: ot-prance 3.6s ease-in-out infinite; }
          .ot-hoof { transform-origin: 290px 234px; animation: ot-hoof 3.6s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .ot-prance, .ot-hoof { animation: none; } }
        `}</style>
      )}
      <g className={prance ? "ot-prance" : undefined}>
        <g fill="url(#ot-horse-d)">
          <path d={H.farFore} />
          <path d={H.farHind} />
        </g>
        <g fill="url(#ot-horse)">
          <path d={H.tail} />
          <path d={H.body} />
          <path d={H.head} />
          <path d={H.ears} />
          <g className={prance ? "ot-hoof" : undefined}>
            <path d={H.nearFore} />
            <path d="M316,308 L308,303 L311,299 L319,304 Z" fill="#5E4312" />
          </g>
          <path d={H.nearHind} />
          <path d={H.mane} />
        </g>
        <path d={H.hooves} fill="#5E4312" />

        {/* рельеф мышц: светлые штрихи, как гравировка */}
        <g fill="none" stroke="#FFF3CC" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round">
          <path d="M150,236 C140,214 128,196 112,186" />
          <path d="M272,246 C266,226 262,206 266,186" />
          <path d="M300,180 C292,160 292,140 304,124" />
          <path d="M129,322 L129,346" />
          <path d="M276,316 L276,346" />
          <path d="M70,200 C64,230 66,262 74,290" strokeOpacity="0.35" />
        </g>

        <g strokeLinecap="round" strokeLinejoin="round">
          {/* чул — бархатная попона с золотой каймой */}
          <path
            d="M150,166 C176,172 206,170 236,156 C243,178 246,204 244,232 C214,244 180,244 152,236 C147,214 147,188 150,166 Z"
            fill="url(#ot-enamel)"
            stroke="url(#ot-horse)"
            strokeWidth="2.6"
          />
          <path
            d="M156,174 C179,179 206,177 230,166 C236,186 238,206 237,226 C211,236 181,236 158,229 C154,211 154,191 156,174 Z"
            fill="none"
            stroke="#F6DE97"
            strokeOpacity="0.75"
            strokeWidth="0.9"
            strokeDasharray="1.5 2.5"
          />
          <g transform="translate(197 203) scale(0.42)">
            {[45, 135, 225, 315].map((a, i) => (
              <Qalampir key={a} transform={`rotate(${a}) translate(0,-8) scale(${i % 2 ? -1 : 1},1)`} />
            ))}
            <circle r="6" fill="url(#ot-gq)" />
          </g>
          {/* кисти по краю чула */}
          <g stroke={ENAMEL_DARK} strokeWidth="1.6" fill={ENAMEL_DARK}>
            {[
              [158, 237, 157, 252],
              [171, 240, 170, 255],
              [184, 242, 184, 257],
              [198, 242, 198, 257],
              [212, 242, 213, 257],
              [226, 240, 227, 255],
              [240, 235, 242, 250],
            ].map(([x1, y1, x2, y2]) => (
              <g key={x1}>
                <path d={`M${x1},${y1} L${x2},${y2}`} />
                <circle cx={x2} cy={y2 + 2} r="2.1" stroke="url(#ot-horse)" strokeWidth="0.8" />
              </g>
            ))}
          </g>

          {/* седло с высокой лукой */}
          <path
            d="M166,163 C163,152 168,147 175,152 C189,160 207,158 219,148 C221,138 225,131 231,128 C235,134 232,146 228,156 C210,170 182,170 166,163 Z"
            fill="url(#ot-horse)"
            stroke={LINE}
            strokeWidth="1.2"
          />
          <circle cx="226" cy="140" r="2.2" fill="url(#ot-enamel)" />

          {/* нагрудник с подвесками */}
          <path d="M236,168 C256,194 278,208 300,204" fill="none" stroke={LINE} strokeWidth="5" />
          <path d="M236,168 C256,194 278,208 300,204" fill="none" stroke="url(#ot-horse)" strokeWidth="3" />
          <g fill="url(#ot-enamel)" stroke="url(#ot-horse)" strokeWidth="1">
            <circle cx="256" cy="191" r="3.2" />
            <circle cx="278" cy="203" r="3.2" />
          </g>
          <g fill="url(#ot-horse)" stroke={LINE} strokeWidth="0.7">
            <path d="M256,194 C252,202 252,208 256,214 C260,208 260,202 256,194 Z" />
            <path d="M278,206 C274,214 274,220 278,226 C282,220 282,214 278,206 Z" />
          </g>

          {/* уздечка, повод */}
          <path
            d="M312,64 C318,86 328,106 342,124 M316,72 L336,77 M340,114 C350,121 360,126 372,124"
            fill="none"
            stroke={LINE}
            strokeWidth="2.2"
          />
          <path d="M350,134 C326,170 270,176 226,150" fill="none" stroke={LINE} strokeWidth="2" />
          <circle cx="350" cy="132" r="3.2" fill="url(#ot-horse)" stroke={LINE} />
          <g fill="url(#ot-enamel)" stroke="url(#ot-horse)" strokeWidth="0.8">
            <circle cx="322" cy="88" r="2" />
            <circle cx="330" cy="102" r="2" />
            <circle cx="326" cy="74" r="2" />
          </g>

          {/* султан-попук на темени: веер золотых нитей с бусинами */}
          <g fill="none" stroke="url(#ot-horse)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M310,60 C304,44 296,30 284,22" />
            <path d="M309,61 C300,50 288,42 274,40" />
            <path d="M311,59 C308,42 304,28 298,16" />
          </g>
          <g fill="url(#ot-horse)" stroke={LINE} strokeWidth="0.6">
            <circle cx="284" cy="22" r="2.6" />
            <circle cx="274" cy="40" r="2.6" />
            <circle cx="298" cy="16" r="2.6" />
          </g>
          <circle cx="311" cy="62" r="4" fill="url(#ot-horse)" stroke={LINE} strokeWidth="0.8" />
          <circle cx="311" cy="62" r="1.8" fill="url(#ot-enamel)" />

          {/* кисть под горлом */}
          <path d="M316,120 L316,132" stroke={LINE} strokeWidth="1.4" />
          <circle cx="316" cy="134" r="3" fill="url(#ot-horse)" stroke={LINE} strokeWidth="0.7" />
          <path
            d="M316,137 C310,144 310,160 312,166 L320,166 C322,160 322,144 316,137 Z"
            fill="url(#ot-horse)"
            stroke={LINE}
            strokeWidth="0.7"
          />
        </g>

        {/* глаз и ноздря */}
        <path d="M330,82 C333,79 338,80 340,84 C337,86 333,86 330,82 Z" fill="#4A350E" />
        <path d="M360,128 C362,126 365,126 366,128" stroke={LINE} strokeWidth="1" fill="none" />
      </g>
    </svg>
  );
}

const ENAMEL_DARK = "#2F4C7C";

/** Конь-рельеф для золотого медальона в шкатулке (без сбруи, выпуклый) */
export function HorseRelief({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="40 12 344 364" className={className}>
      {/* светлая кромка сверху-слева и тень снизу-справа — выпуклость */}
      <g fill="#FFF3CC" opacity="0.8" transform="translate(-2.5 -2.5)">
        {SILHOUETTE.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="#6E4E16" opacity="0.55" transform="translate(2.5 3)">
        {SILHOUETTE.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="url(#ot-relief)">
        {SILHOUETTE.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Золотой медальон с конём (то, что лежит в шкатулке).
 * Диск, кайма из перчинок, рельефный конь.
 */
export function Medallion({ className = "" }: { className?: string }) {
  const ring = Array.from({ length: 20 }, (_, i) => i * 18);
  return (
    <div className={`relative ${className}`}>
      <svg aria-hidden viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full">
        <circle r="98" fill="url(#ot-gold)" />
        <circle r="92" fill="url(#ot-disc)" />
        <circle r="91" fill="none" stroke="#8A6420" strokeOpacity="0.6" strokeWidth="1" />
        {ring.map((a) => (
          <Qalampir key={a} transform={`rotate(${a}) translate(0,-86) rotate(90) scale(0.2)`} fill="#9A7027" />
        ))}
        <circle r="74" fill="none" stroke="#8A6420" strokeOpacity="0.55" strokeWidth="0.9" />
        <circle r="72" fill="none" stroke="#FFF3CC" strokeOpacity="0.6" strokeWidth="0.7" />
      </svg>
      <HorseRelief className="absolute top-[17%] left-[18%] h-[64%] w-[64%]" />
    </div>
  );
}

/**
 * Кольцо вокруг коня на обложке: двойная золотая нить и венец из 24 перчинок.
 * draw — нити прорисовываются.
 */
export function HeroRing({ className = "" }: { className?: string }) {
  const ring = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg aria-hidden viewBox="-100 -100 200 200" className={className}>
      <circle r="97" fill="none" stroke="url(#ot-gold)" strokeWidth="1.4" />
      <circle r="93.5" fill="none" stroke="url(#ot-gold)" strokeWidth="0.6" />
      {ring.map((a) => (
        <Qalampir key={a} transform={`rotate(${a}) translate(0,-86) rotate(90) scale(0.17)`} />
      ))}
      <circle r="78.5" fill="none" stroke="url(#ot-gold)" strokeWidth="0.6" />
    </svg>
  );
}
