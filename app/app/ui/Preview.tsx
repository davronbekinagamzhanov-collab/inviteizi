"use client";
/** Живое превью приглашения: окно /app/preview получает данные сообщением и перерисовывается при каждом вводе */
import { useCallback, useEffect, useRef, useState } from "react";
import type { InvitationData } from "@/lib/types";
import { useT } from "./shared";
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

/** Карточка-превью (уменьшенная копия экрана телефона) + «Катта қилиб кўриш» */
export function PreviewCard({ templateId, data, width = 220 }: { templateId: string; data: InvitationData; width?: number }) {
  const T = useT();
  const ref = useFeed(templateId, data);
  const [big, setBig] = useState(false);
  const scale = width / FRAME_W;
  return (
    <>
      <div className={s.previewCard} style={{ width, height: FRAME_H * scale }} aria-label={T.form.preview}>
        <iframe ref={ref} src="/app/preview" title={T.form.preview} className={s.previewFrame} style={{ transform: `scale(${scale})` }} tabIndex={-1} />
        <button type="button" className={s.previewOpen} onClick={() => setBig(true)}>
          {T.form.previewOpen}
        </button>
      </div>
      {big && <BigPreview templateId={templateId} data={data} onClose={() => setBig(false)} />}
    </>
  );
}

function BigPreview({ templateId, data, onClose }: { templateId: string; data: InvitationData; onClose: () => void }) {
  const T = useT();
  const ref = useFeed(templateId, data);
  return (
    <div className={s.viewer} role="dialog" aria-modal="true">
      <iframe ref={ref} src="/app/preview" title={T.form.preview} />
      <div className={s.viewerTop}>
        <button type="button" className={s.backPill} onClick={onClose}>
          ✕ {T.form.previewClose}
        </button>
      </div>
    </div>
  );
}
