"use client";
import { useEffect } from "react";

/** Prefetches, preview crawlers and reloads alone do not count as human demo opens. */
export function DemoTracker() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = new URLSearchParams(url.hash.slice(1)).get("dt");
    if (!token) return;
    // Drop the opaque capability from the address bar and subsequent referrers.
    url.hash = "";
    window.history.replaceState(window.history.state, "", url.toString());
    const onInteraction = (event: Event) => {
      if (!event.isTrusted || document.visibilityState !== "visible") return;
      document.removeEventListener("pointerdown", onInteraction);
      document.removeEventListener("keydown", onInteraction);
      void fetch("/api/demo-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), keepalive: true }).catch(() => {});
    };
    document.addEventListener("pointerdown", onInteraction, { passive: true });
    document.addEventListener("keydown", onInteraction);
    return () => { document.removeEventListener("pointerdown", onInteraction); document.removeEventListener("keydown", onInteraction); };
  }, []);
  return null;
}
