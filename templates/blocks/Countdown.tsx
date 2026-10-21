"use client";

import { useEffect, useState, type ReactNode } from "react";
import { t } from "@/texts/uz-cyrl";

type Left = { days: number; hours: number; minutes: number; seconds: number };

function timeLeft(target: number): Left | null {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/**
 * Механика таймера: undefined — ещё не загрузился в браузере, null — свадьба уже идёт.
 * До загрузки показываем «--», иначе сервер и телефон покажут разное время.
 */
export function useCountdown(startsAt: Date) {
  const target = startsAt.getTime();
  const [left, setLeft] = useState<Left | null | undefined>(undefined);

  useEffect(() => {
    const tick = () => setLeft(timeLeft(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return left;
}

export type CountdownUnit = { key: keyof Left; label: string; value: string };

export type CountdownLook = {
  grid?: string;
  box?: string;
  number?: string;
  label?: string;
  today?: string;
  /** Полностью своя ячейка (например, медальон) */
  renderUnit?: (unit: CountdownUnit) => ReactNode;
};

const DEFAULT: Required<Omit<CountdownLook, "renderUnit">> = {
  grid: "grid grid-cols-4 gap-2.5",
  box: "flex flex-col items-center rounded-2xl border border-gold/40 bg-white/5 px-1 py-3",
  number: "gold-text font-display text-4xl font-semibold leading-none",
  label: "mt-1.5 text-[11px] uppercase tracking-[0.12em] text-gold-light/80",
  today: "font-display text-3xl text-gold-light",
};

/** Таймер обратного отсчёта до начала свадьбы. look — внешний вид от дизайна */
export function Countdown({ startsAt, look = {} }: { startsAt: Date; look?: CountdownLook }) {
  const left = useCountdown(startsAt);
  const s = { ...DEFAULT, ...look };

  if (left === null) return <p className={s.today}>{t.countdown.today}</p>;

  const units: CountdownUnit[] = (
    [
      ["days", t.countdown.days],
      ["hours", t.countdown.hours],
      ["minutes", t.countdown.minutes],
      ["seconds", t.countdown.seconds],
    ] as const
  ).map(([key, label]) => ({
    key,
    label,
    value: left ? String(left[key]).padStart(2, "0") : "--",
  }));

  return (
    <div className={s.grid}>
      {units.map((u) =>
        look.renderUnit ? (
          <div key={u.key}>{look.renderUnit(u)}</div>
        ) : (
          <div key={u.key} className={s.box}>
            <span className={`${s.number} lining-nums tabular-nums`}>{u.value}</span>
            <span className={s.label}>{u.label}</span>
          </div>
        ),
      )}
    </div>
  );
}
