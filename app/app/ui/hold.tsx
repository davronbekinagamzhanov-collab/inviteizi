"use client";
/**
 * Подсказки по долгому нажатию (≈450 мс) на неочевидные значки каталога: 📷, ♡, цена, «Мои».
 * Маленькая всплывашка над значком, исчезает сама через 2 с. После долгого нажатия обычное
 * нажатие не срабатывает (сердце не переключается, дизайн не открывается). В каталоге — без лишних надписей.
 */
import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from "react";
import { haptic } from "./telegram";
import s from "../app.module.css";

const HOLD_MS = 450;
const SHOW_MS = 2000;
const MOVE_PX = 10;

export type HoldProps = HTMLAttributes<HTMLElement> & { "data-hold": string };

export function useHoldTips() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fired = useRef(false);
  const from = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!tip) return;
    const id = setTimeout(() => setTip(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [tip]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const cancel = () => clearTimeout(timer.current);

  const bind = (text: string): HoldProps => ({
    "data-hold": text,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      fired.current = false;
      from.current = { x: e.clientX, y: e.clientY };
      const el = e.currentTarget;
      cancel();
      timer.current = setTimeout(() => {
        fired.current = true;
        haptic.select();
        const r = el.getBoundingClientRect();
        setTip({ text, x: r.left + r.width / 2, y: r.top, key: Date.now() });
      }, HOLD_MS);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (Math.hypot(e.clientX - from.current.x, e.clientY - from.current.y) > MOVE_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClickCapture: (e) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onContextMenu: (e) => e.preventDefault(),
  });

  const half = 116;
  const layer = tip ? (
    <span
      key={tip.key}
      className={s.holdTip}
      role="status"
      style={{ left: Math.min(Math.max(tip.x, half + 8), (typeof window === "undefined" ? 390 : window.innerWidth) - half - 8), top: Math.max(tip.y, 64) }}
    >
      {tip.text}
    </span>
  ) : null;
  return { bind, layer };
}
