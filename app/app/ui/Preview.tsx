"use client";
/**
 * Живое превью приглашения: окно /app/preview получает данные сообщением и перерисовывается при каждом вводе.
 * На весь экран — через портал в корень приложения: экран формы анимируется transform-ом, а внутри такого
 * предка position: fixed встаёт не на весь экран (окно обрезалось, «Ёпиш» уезжал вниз). Пока открыто
 * большое — маленькое iframe снимается: два тяжёлых дизайна сразу iPhone может не выдержать.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { InvitationData } from "@/lib/types";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { CloseIcon, ExpandIcon } from "./icons";
import s from "../app.module.css";

const FRAME_W = 390;
const FRAME_H = 693;

function useFeed(templateId: string, data: InvitationData) {
  const ref = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const latest = useRef({ templateId, data });
  const raf = useRef(0);
  const post = useCallback(() => {
    if (!ready.current) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() =>
      ref.current?.contentWindow?.postMessage({ type: "inviteizi:preview", ...latest.current }, window.location.origin),
    );
  }, []);
  useEffect(() => {
    latest.current = { templateId, data };
    post();
  }, [templateId, data, post]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== ref.current?.contentWindow) return;
      if ((e.data as { type?: string })?.type === "inviteizi:preview-ready") {
        ready.current = true;
        post();
      }
    };
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("message", onMsg);
      cancelAnimationFrame(raf.current);
    };
  }, [post]);
  return ref;
}

/** Ширина карточки: крупно, но с полями по краям экрана (320–430 px) */
const cardWidth = () =>
  typeof window === "undefined" ? 260 : Math.round(Math.min(300, Math.max(230, window.innerWidth * 0.72)));

/** Карточка-превью (уменьшенная копия экрана телефона) + «⤢ Очиш» сверху */
export function PreviewCard({
  templateId,
  data,
  big,
  onBig,
}: {
  templateId: string;
  data: InvitationData;
  big: boolean;
  onBig: (open: boolean) => void;
}) {
  const T = useT();
  const [width] = useState(cardWidth);
  const scale = width / FRAME_W;
  const toggle = (open: boolean) => {
    haptic.tap();
    onBig(open);
  };
  return (
    <>
      <div
        className={s.previewCard}
        style={{ width, height: FRAME_H * scale }}
        aria-label={T.form.preview}
        data-preview-card
      >
        {!big && <PreviewFrame templateId={templateId} data={data} scale={scale} />}
        <button type="button" className={s.previewOpen} onClick={() => toggle(true)}>
          <ExpandIcon size={18} />
          {T.form.previewOpen}
        </button>
      </div>
      {big && <BigPreview templateId={templateId} data={data} onClose={() => toggle(false)} />}
    </>
  );
}

function PreviewFrame({ templateId, data, scale }: { templateId: string; data: InvitationData; scale: number }) {
  const T = useT();
  const ref = useFeed(templateId, data);
  // Маленькое превью не нажимается (pointer-events: none) — без музыки и её кнопок (?mini=1)
  return (
    <iframe
      ref={ref}
      src="/app/preview?mini=1"
      title={T.form.preview}
      className={s.previewFrame}
      style={{ transform: `scale(${scale})` }}
      tabIndex={-1}
    />
  );
}

function BigPreview({ templateId, data, onClose }: { templateId: string; data: InvitationData; onClose: () => void }) {
  const T = useT();
  const ref = useFeed(templateId, data);
  // Рисуется только после нажатия «Очиш» (в браузере), поэтому document уже есть
  const root = document.querySelector("[data-app-root]") ?? document.body;
  return createPortal(
    <div className={s.viewer} role="dialog" aria-modal="true" aria-label={T.form.preview} data-big-preview>
      <div className={s.viewerTop}>
        <span className={s.viewerTitle}>{T.form.preview}</span>
        <button type="button" className={s.backPill} onClick={onClose}>
          <CloseIcon size={18} />
          {T.form.previewClose}
        </button>
      </div>
      <iframe ref={ref} src="/app/preview" title={T.form.preview} allow="autoplay; fullscreen" />
    </div>,
    root,
  );
}
