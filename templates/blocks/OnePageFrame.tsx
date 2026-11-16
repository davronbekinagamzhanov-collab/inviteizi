/**
 * Рамка и орнамент «Оддий»-дизайна (17.11.2026): у каждого из 15 — своя комбинация
 * линии рамки, уголков, полосы-бордюра, навершия и разделителя (templates/one-page-looks.ts → frame).
 * Слой поверх страницы, не влияет на высоту содержимого (один экран сохраняется), клики не перехватывает.
 * Цвет — акцент и линии палитры дизайна.
 */
import type { CSSProperties, ReactNode } from "react";

export type FrameCorner =
  | "girih"
  | "curl"
  | "album"
  | "rosette"
  | "lattice"
  | "bracket"
  | "leaf"
  | "tulip"
  | "bodom"
  | "dots";
export type FrameEdge = "diamonds" | "zigzag" | "scallop" | "wave" | "chevron" | "dots" | "flap";
export type FrameDivider = "line" | "diamond" | "dots" | "star" | "leaf" | "seal" | "knot";
export type FrameSpec = {
  border: "single" | "double" | "dotted" | "dashed" | "none";
  /** Отступ рамки от края экрана, px */
  inset: number;
  radius?: number | string;
  corner?: FrameCorner;
  edge?: FrameEdge;
  edgeAt?: "both" | "top" | "bottom";
  /** Навершие по центру верхней линии */
  crest?: "star" | "arch" | "bud";
  divider: FrameDivider;
};

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Уголок для верхнего левого угла (остальные — зеркально), 56×56 */
const CORNERS: Record<FrameCorner, ReactNode> = {
  girih: (
    <>
      <rect x="10" y="10" width="16" height="16" {...S} />
      <rect x="10" y="10" width="16" height="16" transform="rotate(45 18 18)" {...S} />
      <circle cx="18" cy="18" r="2.2" fill="currentColor" />
      <path d="M30 4H54M4 30V54" {...S} />
    </>
  ),
  curl: (
    <>
      <path d="M6 52C6 26 24 6 52 6" {...S} />
      <path d="M14 46C14 28 28 14 46 14" {...S} />
      <path d="M22 26c4-6 12-6 13 0s-6 8-8 4" {...S} />
      <path d="M40 10c3 2 4 5 2 8M10 40c2 3 5 4 8 2" {...S} />
    </>
  ),
  album: (
    <>
      <path d="M0 0H30L0 30Z" fill="currentColor" fillOpacity="0.16" />
      <path d="M0 30L30 0" {...S} />
    </>
  ),
  rosette: (
    <>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="18" cy="11" rx="3.2" ry="6.5" transform={`rotate(${a} 18 18)`} {...S} />
      ))}
      <circle cx="18" cy="18" r="2.6" fill="currentColor" />
      <path d="M34 8H54M8 34V54" {...S} strokeDasharray="1 4" />
    </>
  ),
  lattice: (
    <>
      {[10, 20, 30, 40].map((k) => (
        <path key={k} d={`M0 ${k}L${k} 0`} {...S} />
      ))}
      {[6, 14, 22].map((k) => (
        <path key={"r" + k} d={`M${k} ${k}L${k + 8} ${k + 8}`} {...S} />
      ))}
    </>
  ),
  bracket: <path d="M4 44V4H44M11 44V11H44M4 24H11M24 4V11" {...S} />,
  leaf: (
    <>
      <path d="M6 54C12 34 26 18 52 6" {...S} />
      {[
        [16, 36, -40],
        [26, 24, -50],
        [38, 14, -60],
      ].map(([x, y, r]) => (
        <ellipse key={x} cx={x} cy={y} rx="7" ry="3" transform={`rotate(${r} ${x} ${y})`} {...S} />
      ))}
    </>
  ),
  tulip: (
    <>
      <path d="M18 34V18" {...S} />
      <path d="M18 18c-6 0-9-6-8-12 4 2 6 5 8 8 2-3 4-6 8-8 1 6-2 12-8 12z" {...S} />
      <path d="M18 30c-4-1-8-4-9-8M18 28c4-1 7-3 8-6" {...S} />
      <path d="M34 6H54M6 40V54" {...S} />
    </>
  ),
  bodom: (
    <>
      <path d="M14 36c-9-8-7-26 8-28 11-1 15 9 11 15-3 5-10 4-10-1 0-3 3-4 5-3" {...S} />
      <path d="M36 6H54M6 44V54" {...S} />
    </>
  ),
  dots: (
    <>
      {[
        [8, 8, 2.4],
        [17, 17, 1.8],
        [25, 25, 1.3],
        [20, 8, 1.4],
        [8, 20, 1.4],
      ].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="currentColor" />
      ))}
    </>
  ),
};

/** Повторяющийся узор полосы-бордюра: [ширина плитки, высота, содержимое] */
const EDGES: Record<Exclude<FrameEdge, "flap">, [number, number, ReactNode]> = {
  diamonds: [16, 12, <path key="d" d="M0 6L8 1L16 6L8 11Z" {...S} strokeWidth={1.1} />],
  zigzag: [12, 10, <path key="z" d="M0 9L6 2L12 9" {...S} strokeWidth={1.1} />],
  scallop: [16, 9, <path key="s" d="M0 1A8 8 0 0 0 16 1" {...S} strokeWidth={1.1} />],
  wave: [24, 10, <path key="w" d="M0 5C4 0 8 0 12 5S20 10 24 5" {...S} strokeWidth={1.1} />],
  chevron: [12, 12, <path key="c" d="M0 2L6 7L12 2M0 6L6 11L12 6" {...S} strokeWidth={1} />],
  dots: [10, 6, <circle key="o" cx="5" cy="3" r="1.4" fill="currentColor" />],
};

function Edge({ kind, id, flip }: { kind: FrameEdge; id: string; flip?: boolean }) {
  if (kind === "flap")
    return (
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-[34px] w-full" aria-hidden>
        <path d="M0 0L50 22L100 0" {...S} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  const [w, h, tile] = EDGES[kind];
  const pid = `op-edge-${id}-${kind}${flip ? "-b" : ""}`;
  return (
    <svg className="w-full" style={{ height: h, transform: flip ? "scaleY(-1)" : undefined }} aria-hidden>
      <defs>
        <pattern id={pid} width={w} height={h} patternUnits="userSpaceOnUse">
          {tile}
        </pattern>
      </defs>
      <rect width="100%" height={h} fill={`url(#${pid})`} />
    </svg>
  );
}

const CREST: Record<NonNullable<FrameSpec["crest"]>, ReactNode> = {
  star: (
    <>
      <rect x="12" y="4" width="16" height="16" transform="rotate(45 20 12)" {...S} />
      <rect x="13" y="5" width="14" height="14" {...S} />
      <circle cx="20" cy="12" r="2" fill="currentColor" />
    </>
  ),
  arch: <path d="M6 22V14C6 6 13 2 20 2s14 4 14 12v8M12 22v-7c0-4 4-7 8-7s8 3 8 7v7" {...S} />,
  bud: <path d="M20 22c-7-3-9-10-6-16 2 3 4 5 6 9 2-4 4-6 6-9 3 6 1 13-6 16z" {...S} />,
};

export function FrameLayer({
  id,
  frame,
  accent,
  line,
}: {
  id: string;
  frame: FrameSpec;
  accent: string;
  line: string;
}) {
  const i = frame.inset;
  const borderStyle: CSSProperties =
    frame.border === "none"
      ? {}
      : frame.border === "double"
        ? { border: `3px double ${line}` }
        : { border: `1px ${frame.border === "single" ? "solid" : frame.border} ${line}` };
  const corner = frame.corner && CORNERS[frame.corner];
  const at = frame.edgeAt ?? "both";
  return (
    <div aria-hidden data-one-frame={id} className="pointer-events-none absolute inset-0" style={{ color: accent }}>
      {frame.border !== "none" && (
        <div className="absolute" style={{ inset: i, borderRadius: frame.radius, ...borderStyle }} />
      )}
      {frame.edge && at !== "bottom" && (
        <div className="absolute" style={{ left: i + 6, right: i + 6, top: i + 5 }}>
          <Edge kind={frame.edge} id={id} />
        </div>
      )}
      {frame.edge && frame.edge !== "flap" && at !== "top" && (
        <div className="absolute" style={{ left: i + 6, right: i + 6, bottom: i + 5 }}>
          <Edge kind={frame.edge} id={id} flip />
        </div>
      )}
      {corner &&
        (["", "scaleX(-1)", "scaleY(-1)", "scale(-1,-1)"] as const).map((t, k) => (
          <svg
            key={k}
            viewBox="0 0 56 56"
            width="44"
            height="44"
            className="absolute"
            style={{
              [k % 2 ? "right" : "left"]: i + 4,
              [k < 2 ? "top" : "bottom"]: i + 4,
              transform: t || undefined,
            }}
          >
            {corner}
          </svg>
        ))}
      {frame.crest && (
        <svg
          viewBox="0 0 40 24"
          width="40"
          height="24"
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: Math.max(0, i - 11) }}
        >
          {CREST[frame.crest]}
        </svg>
      )}
    </div>
  );
}

/** Разделитель между именами и тадбирами — в узоре дизайна */
export function FrameDividerMark({ kind, accent }: { kind: FrameDivider; accent: string }) {
  if (kind === "line")
    return <span aria-hidden className="block" style={{ width: 56, height: 1, background: accent, opacity: 0.6 }} />;
  const mark: Record<Exclude<FrameDivider, "line">, ReactNode> = {
    diamond: <path d="M50 2L55 7L50 12L45 7Z" fill="currentColor" />,
    dots: (
      <>
        <circle cx="42" cy="7" r="1.6" fill="currentColor" />
        <circle cx="50" cy="7" r="2.2" fill="currentColor" />
        <circle cx="58" cy="7" r="1.6" fill="currentColor" />
      </>
    ),
    star: (
      <>
        <rect x="45" y="2" width="10" height="10" {...S} />
        <rect x="45" y="2" width="10" height="10" transform="rotate(45 50 7)" {...S} />
      </>
    ),
    leaf: <path d="M40 7c4-5 16-5 20 0-4 5-16 5-20 0zM40 7h20" {...S} />,
    seal: (
      <>
        <circle cx="50" cy="7" r="5.5" fill="currentColor" fillOpacity="0.85" />
        <circle cx="50" cy="7" r="3" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" />
      </>
    ),
    knot: <path d="M44 7c0-4 6-4 6 0s6 4 6 0-6-4-6 0-6 4-6 0z" {...S} />,
  };
  const gap = kind === "leaf" || kind === "knot" ? 38 : 42;
  return (
    <svg aria-hidden viewBox="0 0 100 14" width="110" height="15" style={{ color: accent, opacity: 0.85 }}>
      <path d={`M2 7H${gap}M${100 - gap} 7H98`} stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      {mark[kind]}
    </svg>
  );
}
