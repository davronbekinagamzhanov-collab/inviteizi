import { useId, type CSSProperties } from "react";

/** Бархат: вертикальные складки поверх основного цвета */
export const velvet: CSSProperties = {
  backgroundColor: "var(--c-primary)",
  backgroundImage: [
    // блик сверху и тень снизу
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 30%, rgba(0,0,0,0.45) 100%)",
    // складки
    "repeating-linear-gradient(90deg, rgba(0,0,0,0.42) 0px, rgba(0,0,0,0.05) 14px, rgba(255,255,255,0.10) 22px, rgba(0,0,0,0.05) 30px, rgba(0,0,0,0.42) 44px)",
  ].join(","),
};

/** Ламбрекен — бархатная полоса с фестонами и золотым шнуром вверху сцены */
export function Valance({ className }: { className?: string }) {
  const id = useId();
  const scallops = 7;
  const w = 420 / scallops;
  let d = "M0 0H420V52";
  for (let i = scallops - 1; i >= 0; i--) {
    const x0 = (i + 1) * w;
    const x1 = i * w;
    d += `Q${(x0 + x1) / 2} 92 ${x1} 52`;
  }
  d += "Z";
  let rope = "M0 50";
  for (let i = 0; i < scallops; i++) rope += `Q${i * w + w / 2} 88 ${(i + 1) * w} 50`;

  return (
    <div className={className}>
      <svg viewBox="0 0 420 96" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
        <defs>
          <clipPath id={`${id}-clip`}>
            <path d={d} />
          </clipPath>
          <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${id}-clip)`}>
          <rect width="420" height="96" fill="var(--c-primary)" />
          {Array.from({ length: scallops }).map((_, i) => (
            <ellipse
              key={i}
              cx={i * w + w / 2}
              cy="40"
              rx={w / 2.4}
              ry="46"
              fill="#fff"
              opacity="0.07"
            />
          ))}
          <rect width="420" height="96" fill={`url(#${id}-shade)`} />
        </g>
        <path d={rope} fill="none" stroke="var(--c-gold)" strokeWidth="2.4" />
        <path d={rope} fill="none" stroke="var(--c-gold-light)" strokeWidth="0.8" strokeDasharray="2 3" />
        <path d="M0 6H420" stroke="var(--c-gold)" strokeWidth="2" />
        {/* кисточки между фестонами */}
        {Array.from({ length: scallops - 1 }).map((_, i) => {
          const x = (i + 1) * w;
          return (
            <g key={i} fill="var(--c-gold)">
              <circle cx={x} cy="53" r="3.2" />
              <path d={`M${x - 3} 55h6l2 14h-10z`} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Золотая бахрома по низу занавеса */
export function Fringe({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundImage: [
          "linear-gradient(180deg, var(--c-gold-light), var(--c-gold) 40%, #8a6a22)",
        ].join(","),
        WebkitMaskImage:
          "linear-gradient(#000 0 6px, transparent 6px), repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 5px)",
        maskImage:
          "linear-gradient(#000 0 6px, transparent 6px), repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 5px)",
      }}
    />
  );
}

/** Театральный разделитель: линии с ромбами и короной из трёх лепестков */
export function StageDivider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 24" className={className} fill="none" aria-hidden>
      <path d="M4 12H88M132 12H216" stroke="currentColor" strokeWidth="0.8" />
      <path d="M4 15H70M150 15H216" stroke="currentColor" strokeWidth="0.4" strokeOpacity="0.6" />
      <path d="M92 12l4-3 4 3-4 3z M120 12l4-3 4 3-4 3z" fill="currentColor" />
      <path
        d="M110 4c2 3 2 6 0 8-2-2-2-5 0-8zM110 12c-3-3-7-3-9 0 3 2 6 2 9 0zM110 12c3-3 7-3 9 0-3 2-6 2-9 0z"
        fill="currentColor"
      />
      <path d="M104 17h12" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Рамка «театральной программки»: двойная золотая линия и ромбы в углах */
export function ProgrammeFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const corner = "absolute h-2.5 w-2.5 rotate-45 bg-gold";
  return (
    <div className={`relative border border-gold/70 p-1.5 ${className ?? ""}`}>
      <div className="border border-gold/30 px-5 py-9">{children}</div>
      <span className={`${corner} -top-[5px] -left-[5px]`} />
      <span className={`${corner} -top-[5px] -right-[5px]`} />
      <span className={`${corner} -bottom-[5px] -left-[5px]`} />
      <span className={`${corner} -right-[5px] -bottom-[5px]`} />
    </div>
  );
}
