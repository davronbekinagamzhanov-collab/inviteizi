import type { CSSProperties } from "react";

/**
 * После открытия сверху медленно падают зёрна граната, лепестки его цветка и узкие листья.
 * Два круга и всё — не мешает читать. Значения фиксированные: сервер и браузер рисуют одинаково.
 */
const ITEMS = [
  { left: 7, size: 9, dur: 10, delay: 0, drift: 34, kind: "petal" },
  { left: 17, size: 7, dur: 11.5, delay: 1.4, drift: -24, kind: "seed" },
  { left: 28, size: 12, dur: 12, delay: 3.2, drift: 40, kind: "leaf" },
  { left: 39, size: 6, dur: 10.5, delay: 0.7, drift: 18, kind: "seed" },
  { left: 51, size: 10, dur: 11, delay: 2.4, drift: -38, kind: "petal" },
  { left: 62, size: 7, dur: 12.5, delay: 4.1, drift: 28, kind: "seed" },
  { left: 71, size: 13, dur: 11, delay: 0.4, drift: -22, kind: "leaf" },
  { left: 82, size: 8, dur: 10, delay: 2.9, drift: 26, kind: "petal" },
  { left: 92, size: 6, dur: 12, delay: 1.1, drift: -30, kind: "seed" },
  { left: 45, size: 11, dur: 13, delay: 5.2, drift: 22, kind: "leaf" },
] as const;

const LOOK: Record<(typeof ITEMS)[number]["kind"], (size: number) => CSSProperties> = {
  // зерно: капля с бликом
  seed: (s) => ({
    width: s,
    height: s * 1.25,
    borderRadius: "50% 50% 46% 46% / 58% 58% 42% 42%",
    background: "radial-gradient(circle at 35% 30%, #F7A3AC 0%, #D43D57 32%, #9E2338 70%, #5E0F1E 100%)",
  }),
  // лепесток цветка граната: мятый, огненно-коралловый
  petal: (s) => ({
    width: s * 1.2,
    height: s,
    borderRadius: "62% 38% 55% 45% / 50% 60% 40% 50%",
    background: "linear-gradient(140deg, #F08A6E 0%, #DA4A43 55%, #B42B3A 100%)",
    opacity: 0.9,
  }),
  // узкий лист
  leaf: (s) => ({
    width: s * 0.42,
    height: s * 1.5,
    borderRadius: "100% 0 100% 0",
    background: "linear-gradient(160deg, #A7B48A 0%, #7E8F62 60%, #66774D 100%)",
  }),
};

export function FallingGarden() {
  return (
    <div
      aria-hidden
      data-decor
      className="pointer-events-none fixed inset-y-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 overflow-hidden"
    >
      {ITEMS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={
            {
              left: `${p.left}%`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              animationIterationCount: 2,
              "--drift": `${p.drift}px`,
              ...LOOK[p.kind](p.size),
              opacity: 0,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
