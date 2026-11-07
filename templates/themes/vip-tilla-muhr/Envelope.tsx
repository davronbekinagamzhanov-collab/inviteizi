"use client";

/* eslint-disable @next/next/no-img-element -- Local materials are decoded before the short opening. */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAnimate, useReducedMotion } from "motion/react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "../../blocks/useInvitation";
import { OpeningCaption } from "../../blocks/OpeningCaption";
import { vipPhotos } from "./photos";
import s from "./envelope.module.css";

type Phase = "idle" | "crack" | "opening";

/** A short split-envelope reveal. The invitation itself is the destination: no moving sheet or extra scene. */
export function Envelope({ inv, id }: { inv: Invitation; id: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const pending = useRef(false);
  const ready = useRef<Promise<void> | null>(null);
  const alive = useRef(true);
  const reduced = useReducedMotion();
  const base = `/vip/${id}`;

  function preload() {
    const decode = async (src: string) => { const img = new Image(); img.src = src; await img.decode(); };
    const photos = vipPhotos(inv.data, id).slice(0, 2);
    return Promise.all([
      ...["seal", "opening-envelope"].map(name => decode(`${base}/${name}.webp`)),
      ...photos.map(async photo => {
        if (!photo) return;
        try { await decode(photo.src); } catch { await decode(photo.fallback); }
      }),
    ]).then(() => document.fonts.ready).then(() => undefined);
  }
  useEffect(() => {
    alive.current = true;
    ready.current = preload();
    void ready.current.then(() => scope.current?.setAttribute("data-ready", "true")).catch(() => { /* Retry remains available. */ });
    return () => { alive.current = false; };
    // One immutable theme/ordered photo set per invitation instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, inv.data.photos?.join("|")]);

  async function open() {
    if (pending.current) return;
    pending.current = true;
    inv.start();
    setError(false);
    setLoading(true);
    scope.current?.setAttribute("aria-busy", "true");
    try { await (ready.current ?? preload()); }
    catch {
      pending.current = false;
      ready.current = null;
      if (alive.current) { setError(true); setLoading(false); scope.current?.setAttribute("aria-busy", "false"); }
      return;
    }
    if (!alive.current) return;
    setLoading(false);
    if (reduced) { inv.finishOpening(); return; }

    const ease = [0.22, 0.61, 0.24, 1] as const;
    setPhase("crack");
    await animate("[data-vip-wax]", { scale: [1, 0.955, 1] }, { duration: 0.2, ease: "easeInOut" });
    if (!alive.current) return;
    setPhase("opening");
    await Promise.all([
      animate("[data-vip-envelope-upper]", { y: "-77dvh", rotateX: 8 }, { duration: 1.4, ease }),
      animate("[data-vip-envelope-lower]", { y: "42dvh", rotateX: -6 }, { duration: 1.4, ease }),
      animate("[data-vip-cover-ink]", { y: "-77dvh", opacity: 0 }, { duration: 1.15, ease }),
      animate("[data-vip-footer-ink]", { y: "42dvh", opacity: 0 }, { duration: 1.1, ease }),
      animate("[data-vip-seal-half=upper]", { y: -145, rotate: -5, opacity: 0 }, { duration: 0.65, ease }),
      animate("[data-vip-seal-half=lower]", { y: 145, rotate: 5, opacity: 0 }, { duration: 0.65, ease }),
    ]);
    if (alive.current) inv.finishOpening();
  }

  if (inv.opened) return null;
  const initials = [inv.data.groom?.charAt(0), inv.data.bride?.charAt(0)].join(" · ");
  return <button
    ref={scope} type="button" data-open data-vip-envelope data-vip-opening="split-v3" data-phase={phase}
    aria-label={t.opening.tapToOpen} onClick={open} className={s.envelope}
    style={{ "--vip-envelope-photo": `url(${base}/opening-envelope.webp)` } as CSSProperties}
  >
    <span data-vip-envelope-upper className={s.upper} />
    <span data-vip-envelope-lower className={s.lower} />
    <span data-vip-cover-ink className={s.coverCaption}>
      <span className={s.eyebrow}>{t.vip.privateLetter}</span>
      <span className={s.monogram}>{initials}</span>
      <OpeningCaption inv={inv} nameClassName={s.coverNames} metaClassName={s.coverMeta} />
    </span>
    <span className={s.seal} aria-hidden="true"><span data-vip-wax className={s.wax}>
      {["upper", "lower"].map(side => <span key={side} data-vip-seal-half={side} className={side === "upper" ? s.sealUpper : s.sealLower}>
        <img src={`${base}/seal.webp`} alt="" width={480} height={480} /><span>{initials}</span>
      </span>)}
    </span></span>
    <span data-vip-footer-ink className={s.openLabel} role="status">{error ? t.vip.retry : loading ? t.vip.loading : t.vip.openMe}</span>
    <span data-vip-footer-ink className={s.coverFooter}>{t.vip.withLove}</span>
  </button>;
}
