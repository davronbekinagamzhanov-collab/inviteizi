"use client";
import { useEffect } from "react";

const EVERY_MS = 15_000;
const STOP_AFTER_MS = 30 * 60_000;

/**
 * Только для личной НАМУНА (/{slug}): страница могла остаться открытой (вкладка Telegram, Safari, приложение)
 * или вернуться из памяти браузера без запроса к серверу. Пока страница на экране — раз в 15 с
 * и при каждом возвращении спрашиваем режим; заказ подтверждён → перезагрузка, НАМУНА исчезает.
 */
export function PaidRefresh() {
  useEffect(() => {
    const slug = window.location.pathname.slice(1);
    if (!/^[a-z0-9-]{1,60}$/.test(slug) || ["demo", "app", "catalog", "dev"].includes(slug)) return;
    const started = Date.now();
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const r = await fetch(`/api/status?slug=${slug}`, { cache: "no-store" });
        const j = (await r.json()) as { mode?: string };
        if (j.mode === "full") window.location.reload();
      } catch {
        /* нет сети — спросим в следующий раз */
      } finally {
        busy = false;
      }
    };
    const onShow = () => check();
    const id = setInterval(() => (Date.now() - started > STOP_AFTER_MS ? clearInterval(id) : check()), EVERY_MS);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, []);
  return null;
}
