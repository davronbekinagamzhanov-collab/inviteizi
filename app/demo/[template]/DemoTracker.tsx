"use client";
import { useEffect } from "react";
import { BOT_USERNAME } from "@/lib/brand";

const BOT_START = `https://t.me/${BOT_USERNAME}?start=`;

/**
 * Prefetches, preview crawlers and reloads alone do not count as human demo opens.
 * #p=<код> — демо открыли с постера партнёра: ссылки в бота ведут с его кодом (p_<код>), и клиент засчитывается партнёру.
 */
export function DemoTracker() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const partner = /^[a-z0-9]{4,32}$/.exec(hash.get("p") ?? "")?.[0];
    const token = hash.get("dt");
    const cleanup: (() => void)[] = [];

    if (partner) {
      // Ссылки на бота появляются и после открытия (заставки), поэтому подменяем адрес в момент нажатия
      const toPartner = (event: Event) => {
        const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (link?.href.startsWith(BOT_START)) link.href = `${BOT_START}p_${partner}`;
      };
      document.addEventListener("pointerdown", toPartner, { capture: true });
      document.addEventListener("click", toPartner, { capture: true });
      cleanup.push(() => {
        document.removeEventListener("pointerdown", toPartner, { capture: true });
        document.removeEventListener("click", toPartner, { capture: true });
      });
    }

    if (token) {
      // Drop the opaque capability from the address bar and subsequent referrers (код партнёра остаётся).
      hash.delete("dt");
      url.hash = hash.toString();
      window.history.replaceState(window.history.state, "", url.toString());
      const onInteraction = (event: Event) => {
        if (!event.isTrusted || document.visibilityState !== "visible") return;
        document.removeEventListener("pointerdown", onInteraction);
        document.removeEventListener("keydown", onInteraction);
        void fetch("/api/demo-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          keepalive: true,
        }).catch(() => {});
      };
      document.addEventListener("pointerdown", onInteraction, { passive: true });
      document.addEventListener("keydown", onInteraction);
      cleanup.push(() => {
        document.removeEventListener("pointerdown", onInteraction);
        document.removeEventListener("keydown", onInteraction);
      });
    }
    return () => cleanup.forEach((f) => f());
  }, []);
  return null;
}
