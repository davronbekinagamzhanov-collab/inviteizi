"use client";

/* eslint-disable @next/next/no-img-element -- Local, pre-sized paper photographs are decoded before any movement. */
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useAnimate, useReducedMotion } from "motion/react";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "../../blocks/useInvitation";
import { OpeningCaption } from "../../blocks/OpeningCaption";
import { useFitWords, Words } from "../../blocks/FitWords";
import s from "./envelope.module.css";

type Phase = "idle" | "crack" | "flap" | "letter" | "depart" | "reveal";

/** Each physical action finishes before the next starts; no timer can expose the sheet through the diagonal pocket. */
export function Envelope({ inv, id, lining }: { inv: Invitation; id: string; lining?: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const pending = useRef(false);
  const ready = useRef<Promise<void> | null>(null);
  const alive = useRef(true);
  const reduced = useReducedMotion();
  const sheetNames = useFitWords<HTMLSpanElement>(36);
  const pocketClip = `vip-pocket-${useId().replaceAll(":", "")}`;
  const base = `/vip/${id}`;
  const liningName = lining ? "lining" : "opening-lining";

  function preload() {
    return Promise.all(["hero", "flowers", "seal", "opening-envelope", "opening-paper", liningName].map(async name => {
      const img = new Image();
      img.src = `${base}/${name}.webp`;
      await img.decode();
    })).then(() => document.fonts.ready).then(() => undefined);
  }

  useEffect(() => {
    alive.current = true;
    ready.current = preload();
    void ready.current.then(() => scope.current?.setAttribute("data-ready", "true")).catch(() => { /* The tap handler offers a retry. */ });
    return () => { alive.current = false; };
    // This immutable asset set belongs to one theme; useAnimate cleans up its animations on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lining]);

  async function open() {
    if (pending.current) return;
    pending.current = true;
    inv.start(); // Preserve the actual tap gesture for music, even when a slow image is still loading.
    setError(false);
    setLoading(true);
    scope.current?.setAttribute("aria-busy", "true");
    try {
      await (ready.current ?? preload());
    } catch {
      pending.current = false;
      ready.current = null;
      if (alive.current) { setError(true); setLoading(false); scope.current?.setAttribute("aria-busy", "false"); }
      return;
    }
    if (!alive.current) return;
    setLoading(false);
    if (reduced) { inv.finishOpening(); return; }

    const ease = [0.22, 0.68, 0.18, 1] as const;
    setPhase("crack");
    await animate("[data-vip-wax]", { scale: [1, 0.95, 1] }, { duration: 0.22, ease: "easeInOut" });
    if (!alive.current) return;
    await Promise.all([
      animate("[data-vip-seal-half=left]", { x: -16, y: 13, rotate: -10, opacity: 0 }, { duration: 0.36, ease }),
      animate("[data-vip-seal-half=right]", { x: 16, y: 13, rotate: 10, opacity: 0 }, { duration: 0.36, ease }),
      animate("[data-vip-cover-ink]", { opacity: 0, y: -8 }, { duration: 0.32, ease }),
    ]);
    if (!alive.current) return;

    setPhase("flap");
    await Promise.all([
      animate("[data-vip-flap]", { rotateX: 176 }, { duration: 1.25, ease }),
      animate("[data-vip-face-shade]", { opacity: [0, 0.20, 0.04] }, { duration: 1.25, ease: "easeInOut" }),
      animate("[data-vip-hinge-shadow]", { opacity: [0, 0.5, 0.16] }, { duration: 1.25, ease: "easeInOut" }),
    ]);
    if (!alive.current) return;

    setPhase("letter");
    await animate("[data-vip-sheet]", { transform: ["translateY(60dvh)", "translateY(0dvh)"] }, { duration: 0.95, ease });
    if (!alive.current) return;
    // Names appear as a complete, upright inscription only after the rectangular sheet has emerged.
    await animate("[data-vip-sheet-ink]", { opacity: 1 }, { duration: 0.24, ease: "easeOut" });
    if (!alive.current) return;

    setPhase("depart");
    await animate("[data-vip-envelope-layer]", { y: "108dvh" }, { duration: 1.05, ease: [0.42, 0, 0.22, 1] });
    if (!alive.current) return;
    setPhase("reveal");
    await animate("[data-vip-sheet]", { opacity: 0, scale: 1.035 }, { duration: 0.55, ease: "easeInOut" });
    if (alive.current) inv.finishOpening();
  }

  if (inv.opened) return null;
  const initials = [inv.data.groom?.charAt(0), inv.data.bride?.charAt(0)].join(" · ");
  const style = {
    "--vip-envelope-photo": `url(${base}/opening-envelope.webp)`,
    "--vip-paper-photo": `url(${base}/opening-paper.webp)`,
    "--vip-lining-photo": `url(${base}/${liningName}.webp)`,
  } as CSSProperties;

  return (
    <button ref={scope} type="button" data-open data-vip-envelope data-phase={phase} aria-label={t.opening.tapToOpen} onClick={open} className={s.envelope} style={style}>
      <span data-vip-envelope-layer className={s.backPaper} />

      <span data-vip-sheet aria-hidden="true" className={s.sheet}>
        <span className={s.sheetBorder} />
        <span data-vip-sheet-ink className={s.sheetInk}>
          <span className={s.eyebrow}>{t.occasionTitles[inv.occasion]}</span>
          <span ref={sheetNames} className={s.sheetNames}>
            <Words text={inv.data.groom ?? ""} /><i>{t.natural.and}</i><Words text={inv.data.bride ?? ""} />
          </span>
          <span className={s.sheetDate}>{t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}</span>
          <span className={s.sheetRule} />
        </span>
      </span>

      <span data-vip-envelope-layer className={s.innerWall} />
      <span data-vip-envelope-layer data-vip-hinge-shadow className={s.hingeShadow} />
      <svg data-vip-envelope-layer className={s.pocket} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs><clipPath id={pocketClip}><path d="M0 445.9L430 665.4L460 679.1Q500 699 540 679.1L570 665.4L1000 445.9V1000H0Z" /></clipPath></defs>
        <image href={`${base}/opening-envelope.webp`} width="1000" height="1000" preserveAspectRatio="none" clipPath={`url(#${pocketClip})`} />
      </svg>

      <span data-vip-envelope-layer className={s.flapRig}>
        <span data-vip-flap className={s.flap}>
          <span className={s.flapEdge} />
          <span className={s.flapFront}><span data-vip-face-shade className={s.faceShade} /></span>
          <span className={s.flapBack}><span data-vip-face-shade className={s.faceShade} /></span>
        </span>
      </span>

      <span data-vip-envelope-layer data-vip-cover-ink className={s.coverCaption}>
        <span className={s.eyebrow}>{t.vip.privateLetter}</span>
        <span className={s.monogram}>{initials}</span>
        <OpeningCaption inv={inv} nameClassName={s.coverNames} metaClassName={s.coverMeta} />
      </span>

      <span data-vip-envelope-layer className={s.seal} aria-hidden="true">
        <span data-vip-wax className={s.wax}>
          {["left", "right"].map(side => (
            <span key={side} data-vip-seal-half={side} className={side === "left" ? s.sealLeft : s.sealRight}>
              <img src={`${base}/seal.webp`} alt="" width="480" height="480" />
              <span>{initials}</span>
            </span>
          ))}
        </span>
      </span>
      <span data-vip-envelope-layer data-vip-cover-ink className={s.openLabel} role="status">{error ? t.vip.retry : loading ? t.vip.loading : t.vip.openMe}</span>
      <span data-vip-envelope-layer data-vip-cover-ink className={s.coverFooter}>{t.vip.withLove}</span>
    </button>
  );
}
