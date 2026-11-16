"use client";
/**
 * «Ўз мусиқам»: файл с телефона → одноразовый токен (api musicUpload) → загрузка прямо в Vercel Blob с процентом.
 * Только MP3/M4A до 12 МБ (17.11.2026). Видно всё: «Юкланмоқда… 42%», «Тайёр» с галочкой, ошибка с кнопкой «Қайта».
 */
import { useRef, useState } from "react";
import { put as blobPut } from "@vercel/blob/client";
import { api, ApiError } from "./api";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { CheckIcon, SpinnerIcon } from "./icons";
import s from "../app.module.css";

const MAX = 12 * 1024 * 1024;
const EXT = /\.(mp3|m4a)$/i;

type State =
  | { phase: "idle" }
  | { phase: "uploading"; pct: number }
  | { phase: "done" }
  | { phase: "error"; text: string };

// Тип — по расширению: Android присылает m4a как «audio/mp4a-latm» или пусто.
// С неверным Content-Type в хранилище Chrome на Android песню не играет
const AUDIO_TYPE: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4" };

export function OwnMusic({ onDone }: { onDone: (url: string, title: string) => void }) {
  const T = useT();
  const input = useRef<HTMLInputElement>(null);
  const [last, setLast] = useState<File | null>(null);
  const [st, setSt] = useState<State>({ phase: "idle" });

  async function send(file: File | undefined) {
    if (!file || st.phase === "uploading") return;
    setLast(file);
    const ext = EXT.exec(file.name)?.[1]?.toLowerCase() ?? (file.type === "audio/mpeg" ? "mp3" : "");
    // Формат — по расширению: на Android тип файла часто пустой или «video/mp4» (m4a)
    if (!ext || (file.type && !/^(audio\/|video\/mp4|application\/octet-stream)/.test(file.type)))
      return fail(T.summary.ownFormat);
    if (file.size > MAX) return fail(T.summary.ownTooBig);
    setSt({ phase: "uploading", pct: 0 });
    try {
      const r = await api<{ clientToken: string; pathname: string; url: string } | { error: string }>("musicUpload", {
        ext,
        size: file.size,
      });
      if ("error" in r)
        return fail(
          r.error === "tooBig"
            ? T.summary.ownTooBig
            : r.error === "format"
              ? T.summary.ownFormat
              : r.error === "storage"
                ? T.summary.ownUnavailable
                : T.summary.ownFailed,
        );
      let saved: string;
      try {
        const blob = await blobPut(r.pathname, file, {
          access: "public",
          token: r.clientToken,
          contentType: AUDIO_TYPE[ext] ?? "audio/mpeg",
          onUploadProgress: (p) => setSt({ phase: "uploading", pct: Math.round(p.percentage) }),
        });
        saved = blob.url;
      } catch {
        throw new ApiError(navigator.onLine === false ? "offline" : "server");
      }
      haptic.ok();
      setSt({ phase: "done" });
      onDone(saved, file.name.replace(EXT, "").slice(0, 60));
    } catch (e) {
      fail(
        e instanceof ApiError && (e.code === "tooBig" || e.code === "format")
          ? e.code === "tooBig"
            ? T.summary.ownTooBig
            : T.summary.ownFormat
          : T.summary.ownFailed,
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  function fail(text: string) {
    haptic.error();
    setSt({ phase: "error", text });
  }

  return (
    <div className={s.ownMusic} data-own-music={st.phase}>
      <button
        type="button"
        className={`${s.btn} ${s.btnGhost} ${s.btnWide}`}
        onClick={() => input.current?.click()}
        disabled={st.phase === "uploading"}
        aria-busy={st.phase === "uploading"}
      >
        {st.phase === "uploading" ? (
          <>
            <SpinnerIcon size={20} />
            {T.summary.ownUploading(st.pct)}
          </>
        ) : st.phase === "done" ? (
          <>
            <CheckIcon size={20} />
            {T.summary.ownReady}
          </>
        ) : (
          T.summary.ownMusic
        )}
      </button>
      {st.phase === "uploading" && (
        <span className={s.upBar} aria-hidden>
          <i style={{ width: `${st.pct}%` }} />
        </span>
      )}
      {st.phase === "error" ? (
        <p className={s.trackErr} role="alert" style={{ marginLeft: 0 }}>
          {st.text}{" "}
          {last && (
            <button type="button" className={s.textMore} onClick={() => send(last)}>
              {T.summary.ownRetry}
            </button>
          )}
        </p>
      ) : (
        <span className={s.help}>{T.summary.ownMusicHint}</span>
      )}
      <input
        ref={input}
        type="file"
        accept=".mp3,.m4a,audio/mpeg,audio/mp4"
        hidden
        onChange={(e) => send(e.target.files?.[0])}
        name="ownMusic"
      />
    </div>
  );
}
