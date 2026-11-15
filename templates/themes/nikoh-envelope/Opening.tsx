"use client";
import { useEffect, useRef, useState } from "react";
import type { InvitationData } from "@/lib/types";
import { t } from "@/texts/uz-cyrl";
import s from "./opening.module.css";

type OpeningKind = "muhr" | "ipak" | "maktub";
type Props = {
  kind: OpeningKind;
  data: InvitationData;
  date: string;
  started: boolean;
  onOpen: () => void;
};

function Paper({ className, src }: { className: string; src: string }) {
  return (
    <span className={className} aria-hidden>
      {/* Pre-sized, local photographic assets; no runtime image optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" decoding="sync" fetchPriority="high" draggable={false} />
    </span>
  );
}

/** Photographic paper layers scoped to the three envelope-polish designs. */
export function WeddingOpening({ kind, data, date, started, onOpen }: Props) {
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const open = () => {
    if (!ready || locked.current || started) return;
    locked.current = true;
    onOpen();
  };
  const ownCover = kind === "ipak" && data.photos?.[0];
  const asset = kind === "ipak" ? "ipak-1" : kind === "muhr" ? "muhr-paper" : "maktub-cover";
  const src = ownCover || `/art/nikoh-envelope/${asset}.webp`;
  return (
    <button
      type="button"
      data-open
      data-opening-kind={kind}
      data-client-cover={Boolean(ownCover) || undefined}
      data-started={started}
      disabled={!ready || started}
      onClick={open}
      aria-label={t.natural.playHint}
      className={`${s.opening} ${s[kind]}`}
    >
      {kind === "muhr" ? (
        <>
          <Paper className={s.pocket} src={src} />
          <Paper className={s.flap} src={src} />
          <span className={s.wax} aria-hidden>
            {[s.waxLeft, s.waxRight].map((className) => (
              <span key={className} className={className}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/art/nikoh-envelope/muhr-wax.webp" alt="" draggable={false} />
              </span>
            ))}
          </span>
        </>
      ) : kind === "maktub" ? (
        <>
          <Paper className={s.left} src={src} />
          <Paper className={s.right} src={src} />
        </>
      ) : <Paper className={s.curtain} src={src} />}
      <span className={s.type}>
        <span className={s.kicker}>{t.occasionTitles.nikoh}</span>
        <span className={s.names}>
          <span>{data.groom}</span><i>{t.natural.and}</i><span>{data.bride}</span>
        </span>
        <span className={s.date}>{date}</span>
      </span>
      <span className={s.hint}>{t.floral.tap}</span>
    </button>
  );
}
