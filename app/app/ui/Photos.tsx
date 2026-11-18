"use client";
/** Фото клиента (только дизайны с clientPhotos): сразу 1–3, сжатие на телефоне, прогресс, ✕ */
import { useEffect, useRef, useState } from "react";
import { ApiError, shrinkImage, upload } from "./api";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { CameraIcon, SpinnerIcon } from "./icons";
import s from "../app.module.css";

export const MAX_PHOTOS = 3;
type Pending = { key: string; preview: string; progress: number };

export function Photos({ photos, onChange, onToast, onPending }: { photos: string[]; onChange: (p: string[]) => void; onToast: (t: string) => void; onPending?: (n: number) => void }) {
  const T = useT();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);
  const free = MAX_PHOTOS - photos.length - pending.length;
  // Галерея не открылась или закрыта без выбора (часто — нет доступа к фото): подсказываем, а не молчим
  const [noPick, setNoPick] = useState(false);
  const waiting = useRef(false);
  // Chrome/Android: событие «cancel», когда выбор закрыли без файла
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const onCancel = () => {
      waiting.current = false;
      setNoPick(true);
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, []);
  function openPicker() {
    setNoPick(false);
    waiting.current = true;
    const back = () => {
      if (document.visibilityState !== "visible") return;
      window.removeEventListener("focus", back);
      document.removeEventListener("visibilitychange", back);
      setTimeout(() => {
        if (waiting.current) setNoPick(true);
        waiting.current = false;
      }, 1500);
    };
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", back);
    input.current?.click();
  }
  // Пока фото грузятся, «Давом этиш» закрыта: фото не потеряются
  useEffect(() => {
    onPending?.(pending.length);
  }, [pending.length, onPending]);
  useEffect(() => () => onPending?.(0), [onPending]);

  async function pick(files: FileList | null) {
    waiting.current = false;
    if (!files?.length) return setNoPick(true);
    setNoPick(false);
    const chosen = [...files];
    if (chosen.length > free) onToast(T.photos.max);
    for (const file of chosen.slice(0, Math.max(0, free))) {
      const key = `${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      setPending((p) => [...p, { key, preview, progress: 0 }]);
      try {
        const { blob, name } = await shrinkImage(file);
        const r = await upload<{ url: string }>("photo", blob, name, {}, (progress) => setPending((p) => p.map((x) => (x.key === key ? { ...x, progress } : x))));
        if (r.url && latest.current.length < MAX_PHOTOS) {
          latest.current = [...latest.current, r.url];
          onChange(latest.current);
          haptic.ok();
        }
      } catch (e) {
        haptic.error();
        onToast(
          e instanceof ApiError && e.code === "tooBig"
            ? T.photos.tooBig
            : e instanceof ApiError && e.code === "storage"
              ? T.photos.unavailable
              : T.photos.bad,
        );
      } finally {
        setPending((p) => p.filter((x) => x.key !== key));
        URL.revokeObjectURL(preview);
      }
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className={s.screen}>
      <h1 className={s.title}>{T.photos.title}</h1>
      <p className={s.lead}>{T.photos.lead}</p>
      <div className={s.photos}>
        {photos.map((url, i) => (
          <div key={url} className={s.photo} data-photo>
            {/* eslint-disable-next-line @next/next/no-img-element -- фото клиента из Storage, размер уже ужат */}
            <img src={url} alt="" />
            <button type="button" className={s.photoX} aria-label={T.photos.remove} onClick={() => { haptic.tap(); onChange(photos.filter((_, j) => j !== i)); }}>
              ✕
            </button>
          </div>
        ))}
        {pending.map((p) => (
          <div key={p.key} className={s.photo} aria-busy="true" aria-label={T.photos.uploading}>
            {/* eslint-disable-next-line @next/next/no-img-element -- локальный предпросмотр */}
            <img src={p.preview} alt="" style={{ opacity: 0.55 }} />
            <span className={s.photoPct}>
              <SpinnerIcon size={22} />
              {Math.round(p.progress * 100)}%
            </span>
            <span className={s.progress}>
              <i style={{ width: `${Math.round(p.progress * 100)}%` }} />
            </span>
          </div>
        ))}
      </div>
      {free > 0 && (
        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnWide}`} onClick={openPicker}>
          <CameraIcon size={20} />
          {photos.length ? T.photos.addMore : T.photos.add}
        </button>
      )}
      {noPick && free > 0 && (
        <p className={s.help} role="status" data-photo-permission>
          {T.photos.permission}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  );
}
