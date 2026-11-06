"use client";
/**
 * Telegram WebApp (telegram-web-app.js): initData, MainButton, BackButton, вибро, ссылки.
 * Вне Telegram (проверка в браузере) native-кнопок нет — приложение рисует свои внизу страницы.
 */
import { useEffect, useRef } from "react";

type Btn = {
  setParams(p: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean; has_shine_effect?: boolean }): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  show(): void;
  hide(): void;
};

export type WebApp = {
  initData: string;
  platform: string;
  version: string;
  ready(): void;
  expand(): void;
  close(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  setBottomBarColor?(c: string): void;
  isVersionAtLeast?(v: string): boolean;
  MainButton: Btn;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: { impactOccurred(s: "light" | "medium" | "soft"): void; notificationOccurred(t: "success" | "error" | "warning"): void; selectionChanged(): void };
  openLink(url: string, o?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  showAlert?(text: string): void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

export const tg = (): WebApp | undefined => (typeof window === "undefined" ? undefined : window.Telegram?.WebApp);

/** Внутри Telegram (есть подписанные данные и native-кнопки) */
export const insideTelegram = () => {
  const w = tg();
  return !!w && !!w.initData && w.platform !== "unknown";
};

export const MILK = "#f7efe3";
export const INK = "#3b2a1e";
export const GOLD = "#a8772a";

export function setupTelegram() {
  const w = tg();
  if (!w) return;
  w.ready();
  w.expand();
  w.disableVerticalSwipes?.();
  // Светлая тёплая тема всегда, даже если у человека тёмный Telegram
  w.setHeaderColor?.(MILK);
  w.setBackgroundColor?.(MILK);
  w.setBottomBarColor?.(MILK);
}

export const haptic = {
  tap: () => tg()?.HapticFeedback?.impactOccurred("light"),
  ok: () => tg()?.HapticFeedback?.notificationOccurred("success"),
  error: () => tg()?.HapticFeedback?.notificationOccurred("error"),
  select: () => tg()?.HapticFeedback?.selectionChanged(),
};

/** Главная кнопка Telegram. text=null — скрыть. Обработчик всегда свежий (без повторной подписки) */
export function useMainButton(text: string | null, onClick: () => void, opts: { active?: boolean; progress?: boolean } = {}) {
  const cb = useRef(onClick);
  useEffect(() => {
    cb.current = onClick;
  });
  useEffect(() => {
    const w = tg();
    if (!w || !insideTelegram()) return;
    const handler = () => cb.current();
    w.MainButton.onClick(handler);
    return () => w.MainButton.offClick(handler);
  }, []);
  useEffect(() => {
    const w = tg();
    if (!w || !insideTelegram()) return;
    if (!text) {
      w.MainButton.hide();
      return;
    }
    w.MainButton.setParams({ text, color: GOLD, text_color: "#ffffff", is_active: opts.active !== false, is_visible: true });
    if (opts.progress) w.MainButton.showProgress(false);
    else w.MainButton.hideProgress();
  }, [text, opts.active, opts.progress]);
}

export function useBackButton(visible: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  useEffect(() => {
    cb.current = onBack;
  });
  useEffect(() => {
    const w = tg();
    if (!w || !insideTelegram()) return;
    const handler = () => cb.current();
    w.BackButton.onClick(handler);
    return () => w.BackButton.offClick(handler);
  }, []);
  useEffect(() => {
    const w = tg();
    if (!w || !insideTelegram()) return;
    if (visible) w.BackButton.show();
    else w.BackButton.hide();
  }, [visible]);
}

export function openLink(url: string) {
  const w = tg();
  if (w && insideTelegram()) w.openLink(url, { try_instant_view: false });
  else window.open(url, "_blank", "noopener");
}

export function shareLink(url: string, text: string) {
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const w = tg();
  if (w && insideTelegram()) w.openTelegramLink(share);
  else window.open(share, "_blank", "noopener");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
