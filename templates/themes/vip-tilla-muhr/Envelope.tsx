"use client";

/* eslint-disable @next/next/no-img-element -- Local WebP assets are pre-sized and explicitly decoded before the envelope animation. */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "../../blocks/useInvitation";
import { OpeningCaption } from "../../blocks/OpeningCaption";
import s from "./vip.module.css";

/** All opening images are decoded before the first animated frame. Music starts in the tap gesture. */
export function Envelope({ inv, id, lining }: { inv: Invitation; id: string; lining?: boolean }) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const ready = useRef<Promise<void> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  const reduced = useReducedMotion();
  const base = `/vip/${id}`;
  function preload() {
    return Promise.all(["hero", "flowers", "paper", "flap", "seal", ...(lining ? ["lining"] : [])].map(async name => {
      const img = new Image();
      img.src = `${base}/${name}.webp`;
      await img.decode();
    })).then(() => document.fonts.ready).then(() => undefined);
  }
  useEffect(() => {
    alive.current = true;
    ready.current = preload();
    void ready.current.then(() => button.current?.setAttribute("data-ready", "true")).catch(() => { /* retry is offered after a tap */ });
    return () => { alive.current = false; timers.current.forEach(clearTimeout); };
    // Asset set is immutable for this theme instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lining]);

  async function open() {
    if (pending.current) return;
    pending.current = true;
    inv.start();
    setError(false);
    setLoading(true);
    button.current?.setAttribute("aria-busy", "true");
    try {
      await (ready.current ?? preload());
      if (!alive.current) return;
      setLoading(false);
      if (reduced) { inv.finishOpening(); return; }
      setPhase("crack");
      const stages: [string, number][] = [["flap", 250], ["letter", 800], ["depart", 1600]];
      timers.current = stages.map(([next, delay]) => setTimeout(() => setPhase(next), delay));
      timers.current.push(setTimeout(inv.finishOpening, 2250));
    } catch {
      pending.current = false;
      ready.current = null;
      if (alive.current) { setError(true); setLoading(false); button.current?.setAttribute("aria-busy", "false"); }
    }
  }
  if (inv.opened) return null;
  const initials = [inv.data.groom?.charAt(0), inv.data.bride?.charAt(0)].join(" · ");
  return (
    <button ref={button} type="button" data-open data-vip-envelope data-phase={phase} aria-label={t.opening.tapToOpen} onClick={open} className={s.envelope} style={{ "--vip-paper-image": `url(${base}/paper.webp)`, "--vip-lining": `url(${base}/${lining ? "lining" : "paper"}.webp)` } as React.CSSProperties}>
      <span className={s.envelopeBack} />
      <span className={s.letter} aria-hidden="true"><img src={`${base}/hero.webp`} alt="" width="1170" height="1755" /><span className={s.letterNames}>{inv.data.groom}<i>{t.natural.and}</i>{inv.data.bride}</span></span>
      <span className={s.pocket} />
      <span className={s.foldLeft} /><span className={s.foldRight} />
      <span data-vip-flap className={s.flap}><span className={s.flapFront} /><span className={s.flapBack} /></span>
      <span className={s.coverCaption}>
        <span className={s.eyebrow}>{t.vip.privateLetter}</span>
        <span className={s.monogram}>{initials}</span>
        <OpeningCaption inv={inv} nameClassName={s.coverNames} metaClassName={s.coverMeta} />
      </span>
      <span className={s.seal} aria-hidden="true">
        {["left", "right"].map(side => <span key={side} className={side === "left" ? s.sealLeft : s.sealRight}><img src={`${base}/seal.webp`} alt="" width="480" height="480" /><span>{initials}</span></span>)}
      </span>
      <span className={s.openLabel} role="status">{error ? t.vip.retry : loading ? t.vip.loading : t.vip.openMe}</span>
      <span className={s.coverFooter}>{t.vip.withLove}</span>
    </button>
  );
}
