"use client";
/**
 * «Ўз мусиқам»: файл с телефона → подписанная ссылка (api musicUpload) → загрузка прямо в хранилище с процентом.
 * Видно всё: «Юкланмоқда… 42%» с кружком, «Тайёр» с галочкой, ошибка (размер/формат/сеть) с кнопкой «Қайта».
 */
import { useRef, useState } from "react";
import { api, ApiError } from "./api";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { CheckIcon, SpinnerIcon } from "./icons";
import s from "../app.module.css";

const MAX = 20 * 1024 * 1024;
const EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav)$/i;

type State =
  | { phase: "idle" }
  | { phase: "uploading"; pct: number }
  | { phase: "done" }
  | { phase: "error"; text: string };

const AUDIO_TYPE: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
};

function put(url: string, file: File, ext: string, onPct: (n: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Тип — по расширению: Android присылает m4a как «audio/mp4a-latm» или пусто, ogg — как «application/ogg».
    // С неверным Content-Type в хранилище Chrome на Android песню не играет
    xhr.setRequestHeader("content-type", AUDIO_TYPE[ext] ?? "audio/mpeg");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => reject(new ApiError("offline"));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new ApiError("server", xhr.status)));
    xhr.send(file);
  });
}

export function OwnMusic({ onDone }: { onDone: (url: string, title: string) => void }) {
  const T = useT();
  const input = useRef<HTMLInputElement>(null);
  const [last, setLast] = useState<File | null>(null);
  const [st, setSt] = useState<State>({ phase: "idle" });

  async function send(file: File | undefined) {
    if (!file || st.phase === "uploading") return;
    setLast(file);
    const ext = EXT.exec(file.name)?.[1]?.toLowerCase() ?? (file.type === "audio/mpeg" ? "mp3" : "");
    // Формат — по расширению: на Android тип файла часто пустой, «application/ogg» или «video/mp4» (m4a)
    if (!ext || (file.type && !/^(audio\/|video\/mp4|application\/(ogg|octet-stream))/.test(file.type)))
      return fail(T.summary.ownFormat);
    if (file.size > MAX) return fail(T.summary.ownTooBig);
    setSt({ phase: "uploading", pct: 0 });
    try {
      const r = await api<{ signedUrl: string; url: string } | { error: string }>("musicUpload", {
        ext,
        size: file.size,
      });
      if ("error" in r)
        return fail(
          r.error === "tooBig" ? T.summary.ownTooBig : r.error === "format" ? T.summary.ownFormat : T.summary.ownFailed,
        );
      await put(r.signedUrl, file, ext, (pct) => setSt({ phase: "uploading", pct }));
      haptic.ok();
      setSt({ phase: "done" });
      onDone(r.url, file.name.replace(EXT, "").slice(0, 60));
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
        accept="audio/*,.mp3,.m4a,.aac,.ogg,.oga,.opus,.wav"
        hidden
        onChange={(e) => send(e.target.files?.[0])}
        name="ownMusic"
      />
    </div>
  );
}
