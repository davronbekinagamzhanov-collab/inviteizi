/** Золотые лепестки и блёстки, падающие после открытия конверта */

// Фиксированные значения (не Math.random), чтобы сервер и браузер рисовали одинаково
const PETALS = [
  { left: 6, size: 10, dur: 9, delay: 0, drift: 40, kind: "leaf" },
  { left: 18, size: 6, dur: 11, delay: 1.5, drift: -30, kind: "dot" },
  { left: 29, size: 12, dur: 10, delay: 3, drift: 50, kind: "leaf" },
  { left: 41, size: 5, dur: 12, delay: 0.8, drift: 20, kind: "dot" },
  { left: 52, size: 9, dur: 9.5, delay: 2.2, drift: -45, kind: "leaf" },
  { left: 63, size: 6, dur: 13, delay: 4, drift: 35, kind: "dot" },
  { left: 72, size: 11, dur: 10.5, delay: 0.4, drift: -25, kind: "leaf" },
  { left: 83, size: 5, dur: 11.5, delay: 2.8, drift: 30, kind: "dot" },
  { left: 92, size: 10, dur: 9, delay: 1.2, drift: -40, kind: "leaf" },
  { left: 12, size: 8, dur: 12.5, delay: 5, drift: 25, kind: "leaf" },
  { left: 47, size: 7, dur: 10, delay: 6, drift: -20, kind: "leaf" },
  { left: 77, size: 4, dur: 14, delay: 5.5, drift: 15, kind: "dot" },
] as const;

export function Petals() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.kind === "leaf" ? p.size * 1.4 : p.size,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              animationIterationCount: 2,
              "--drift": `${p.drift}px`,
              borderRadius: p.kind === "leaf" ? "80% 0 80% 0" : "50%",
              background:
                p.kind === "leaf"
                  ? "linear-gradient(135deg, var(--c-gold-light), var(--c-gold))"
                  : "var(--c-gold-light)",
              boxShadow: p.kind === "dot" ? "0 0 8px var(--c-gold-light)" : undefined,
              opacity: 0,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
