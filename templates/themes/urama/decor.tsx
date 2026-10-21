import { useId, type CSSProperties } from "react";
import type { Palette } from "../types";

/** Восьмиконечная звезда (основа восточного орнамента) */
const STAR8 =
  "M12 1l3 4.8 5.6-.8-.8 5.6L23 12l-4.2 3 .8 5.6-5.6-.8L12 23l-3-4.2-5.6.8.8-5.6L1 12l4.2-3-.8-5.6 5.6.8z";

function svgUrl(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Фон «ночное небо миниатюры»: лазурит и маленькие золотые звёзды */
export const starrySky: CSSProperties = {
  backgroundColor: "var(--c-primary-dark)",
  backgroundImage: [
    svgUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="#d9ad4f" opacity="0.28"><path transform="translate(4 4) scale(0.5)" d="${STAR8}"/><path transform="translate(38 36) scale(0.35)" d="${STAR8}"/></g><circle cx="44" cy="12" r="1" fill="#f0d58e" opacity="0.5"/><circle cx="16" cy="48" r="0.8" fill="#f0d58e" opacity="0.5"/></svg>`,
    ),
    "radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--c-primary) 70%, transparent), transparent 75%)",
  ].join(","),
};

/** Полоса бордюра миниатюры: киноварь, золотые линии и лазуритовые ромбы с цветком */
const borderPattern = (vertical: boolean, c: Palette) =>
  svgUrl(
    vertical
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" viewBox="0 0 16 24"><rect width="16" height="24" fill="${c.accent ?? c.gold}"/><path d="M1 0V24M15 0V24" stroke="${c.gold}" stroke-width="1"/><path d="M8 3l5 9-5 9-5-9z" fill="${c.primary}"/><circle cx="8" cy="12" r="1.8" fill="${c.goldLight}"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16"><rect width="24" height="16" fill="${c.accent ?? c.gold}"/><path d="M0 1H24M0 15H24" stroke="${c.gold}" stroke-width="1"/><path d="M3 8l9-5 9 5-9 5z" fill="${c.primary}"/><circle cx="12" cy="8" r="1.8" fill="${c.goldLight}"/></svg>`,
  );

export function SideBorders({ colors }: { colors: Palette }) {
  const style: CSSProperties = { backgroundImage: borderPattern(true, colors), backgroundSize: "16px 24px" };
  return (
    <>
      <div aria-hidden className="absolute top-0 bottom-0 left-0 w-4" style={style} />
      <div aria-hidden className="absolute top-0 right-0 bottom-0 w-4" style={style} />
    </>
  );
}

export function BandDivider({ colors, className }: { colors: Palette; className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-4 ${className ?? ""}`}
      style={{ backgroundImage: borderPattern(false, colors), backgroundSize: "24px 16px" }}
    />
  );
}

/** Пергамент: тёплая бумага с лёгкими пятнами старины */
export const parchment: CSSProperties = {
  backgroundColor: "var(--c-paper)",
  backgroundImage: [
    "radial-gradient(ellipse at 20% 15%, rgba(255,255,255,0.45), transparent 45%)",
    "radial-gradient(ellipse at 85% 60%, rgba(150,110,50,0.10), transparent 50%)",
    "radial-gradient(ellipse at 30% 90%, rgba(150,110,50,0.08), transparent 45%)",
  ].join(","),
};

/** Золотой стержень свитка с набалдашниками */
export function Rod({ className }: { className?: string }) {
  const knob =
    "absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full shadow-md";
  const knobBg = { background: "radial-gradient(circle at 35% 30%, #fbe7a6, #c99a3c 55%, #6e4c14)" };
  return (
    <div className={`relative h-7 ${className ?? ""}`}>
      <div
        className="absolute inset-x-3 top-1/2 h-3.5 -translate-y-1/2 rounded-full shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
        style={{ background: "linear-gradient(180deg, #fbe7a6, #c99a3c 50%, #7a5518)" }}
      />
      <div className={`${knob} left-0`} style={knobBg} />
      <div className={`${knob} right-0`} style={knobBg} />
    </div>
  );
}

/** Скатанная часть свитка (цилиндр из пергамента) */
export function Roll({ className }: { className?: string }) {
  return (
    <div className={`relative h-12 ${className ?? ""}`}>
      <div
        className="absolute inset-x-2 inset-y-0 rounded-[10px] shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
        style={{
          background:
            "linear-gradient(180deg, #a48a5c 0%, #f6ecd2 35%, #e8d6ad 60%, #9c8052 100%)",
        }}
      />
      <Rod className="absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-90" />
    </div>
  );
}

/** Арка-михраб: рамка для имён на обложке */
export function ArchFrame({ children }: { children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--c-gold-light)" />
            <stop offset="1" stopColor="var(--c-gold)" />
          </linearGradient>
        </defs>
        {/* стрельчатая арка: внешняя и внутренняя линии */}
        <path
          d="M10 395V150C10 90 60 50 150 6C240 50 290 90 290 150V395"
          stroke="var(--c-primary)"
          strokeWidth="6"
        />
        <path
          d="M22 395V154C22 100 68 64 150 22C232 64 278 100 278 154V395"
          stroke={`url(#${id}-g)`}
          strokeWidth="1.6"
        />
        <path
          d="M30 395V157C30 106 73 72 150 32C227 72 270 106 270 157V395"
          stroke="var(--c-accent)"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
        <path transform="translate(138 44)" d={STAR8} fill="var(--c-accent)" />
        <circle cx="150" cy="56" r="3" fill="var(--c-gold-light)" />
      </svg>
      <div className="relative px-10 pt-24 pb-10">{children}</div>
    </div>
  );
}

/** Медальон-звезда для таймера */
export function StarMedallion({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[68px] w-[68px] items-center justify-center">
        <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d={STAR8} fill="var(--c-primary)" stroke="var(--c-gold)" strokeWidth="0.6" />
          <circle cx="12" cy="12" r="6.6" fill="none" stroke="var(--c-gold-light)" strokeWidth="0.3" />
        </svg>
        <span className="relative font-display text-[1.6rem] leading-none text-gold-light tabular-nums">
          {value}
        </span>
      </div>
      <span className="mt-2 font-accent text-[13px] tracking-wider text-accent lowercase">{label}</span>
    </div>
  );
}

export function SmallStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={STAR8} fill="currentColor" />
    </svg>
  );
}
