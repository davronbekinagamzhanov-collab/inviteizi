"use client";
/**
 * Telegram WebApp (telegram-web-app.js): initData, MainButton, BackButton, вибро, ссылки.
 * Вне Telegram (проверка в браузере) native-кнопок нет — приложение рисует свои внизу страницы.
 */
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";

type Btn = {
  setParams(p: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean; has_shine_effect?: boolean }): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  show(): void;
  hide(): void;
  enable?(): void;
  isVisible?: boolean;
};

export type WebApp = {
  initData: string;
  initDataUnsafe?: { user?: { language_code?: string } };
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

/**
 * Подписанные данные Telegram приходят и в адресе (#tgWebAppData=…). Читаем их сразу при загрузке модуля:
 * приложение не ждёт telegram-web-app.js (на медленном интернете он грузится секунды, а бывает — не грузится).
 * Сервер всё равно проверяет подпись.
 */
const hashInitData = (() => {
  if (typeof window === "undefined") return "";
  try {
    return new URLSearchParams(window.location.hash.slice(1)).get("tgWebAppData") ?? "";
  } catch {
    return "";
  }
})();
export const initDataOf = () => tg()?.initData || hashInitData;

/** Внутри Telegram (есть подписанные данные и native-кнопки) */
export const insideTelegram = () => {
  const w = tg();
  return !!w && !!w.initData && w.platform !== "unknown";
};

export const MILK = "#f7efe3";
export const INK = "#3b2a1e";
export const GOLD = "#a8772a";

/*
 * Готовность Telegram. telegram-web-app.js грузится ПОСЛЕ страницы (afterInteractive), а кнопки приложения
 * монтируются сразу. Раньше подписка MainButton.onClick делалась один раз при монтировании — когда
 * window.Telegram ещё не было — и не повторялась: кнопка потом показывалась (setParams), но нажатие
 * ни к чему не было привязано. Теперь подписка ждёт этого сигнала.
 */
let ready = false;
const readyListeners = new Set<() => void>();
const subscribeReady = (f: () => void) => {
  readyListeners.add(f);
  return () => {
    readyListeners.delete(f);
  };
};
export const useTelegramReady = () => useSyncExternalStore(subscribeReady, () => ready, () => false);

/** Видна ли native MainButton (иначе приложение рисует свою кнопку внизу страницы) */
let nativeMain = false;
const nativeListeners = new Set<() => void>();
function setNativeMain(v: boolean) {
  if (nativeMain === v) return;
  nativeMain = v;
  nativeListeners.forEach((f) => f());
}
const subscribeNative = (f: () => void) => {
  nativeListeners.add(f);
  return () => {
    nativeListeners.delete(f);
  };
};
export const useNativeMainVisible = () => useSyncExternalStore(subscribeNative, () => nativeMain, () => false);

export function setupTelegram() {
  const w = tg();
  if (!w) return;
  if (!ready) {
    ready = true;
    readyListeners.forEach((f) => f());
  }
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

/** Одно нажатие — одно действие (iOS иногда шлёт событие дважды); на новом экране защита сбрасывается */
const TAP_GUARD_MS = 300;

/**
 * Главная кнопка Telegram. text=null — скрыть. Подписка — после загрузки telegram-web-app.js (ready),
 * обработчик всегда свежий (ref), снимается при размонтировании.
 */
export function useMainButton(text: string | null, onClick: () => void, opts: { active?: boolean; progress?: boolean } = {}) {
  const cb = useRef(onClick);
  const last = useRef(0);
  const isReady = useTelegramReady();
  useEffect(() => {
    cb.current = onClick;
  });
  useEffect(() => {
    const w = tg();
    if (!isReady || !w || !insideTelegram()) return;
    const handler = () => {
      const now = Date.now();
      if (now - last.current < TAP_GUARD_MS) return;
      last.current = now;
      cb.current();
    };
    w.MainButton.onClick(handler);
    return () => w.MainButton.offClick(handler);
  }, [isReady]);
  // До отрисовки: своя кнопка не мелькает на экране, где видна native
  useLayoutEffect(() => {
    const w = tg();
    if (!isReady || !w || !insideTelegram()) return;
    if (!text) {
      w.MainButton.hideProgress();
      w.MainButton.hide();
      setNativeMain(false);
      return;
    }
    last.current = 0; // новое действие экрана — защита от двойного нажатия начинается заново
    const active = opts.active !== false;
    w.MainButton.setParams({ text, color: GOLD, text_color: "#ffffff", is_active: active, is_visible: true });
    if (active) w.MainButton.enable?.();
    w.MainButton.show();
    if (opts.progress) w.MainButton.showProgress(false);
    else w.MainButton.hideProgress();
    // isVisible выставляет сам telegram-web-app.js; если его нет или false — показываем свою кнопку
    setNativeMain(w.MainButton.isVisible !== false);
  }, [isReady, text, opts.active, opts.progress]);
  useEffect(
    () => () => {
      tg()?.MainButton?.hide();
      setNativeMain(false);
    },
    [],
  );
}

export function useBackButton(visible: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  const isReady = useTelegramReady();
  useEffect(() => {
    cb.current = onBack;
  });
  useEffect(() => {
    const w = tg();
    if (!isReady || !w || !insideTelegram()) return;
    const handler = () => cb.current();
    w.BackButton.onClick(handler);
    return () => w.BackButton.offClick(handler);
  }, [isReady]);
  useEffect(() => {
    const w = tg();
    if (!isReady || !w || !insideTelegram()) return;
    if (visible) w.BackButton.show();
    else w.BackButton.hide();
  }, [isReady, visible]);
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
