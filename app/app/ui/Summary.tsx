"use client";
/** «Бот сиз учун танлади»: матн · мусиқа · меҳмонлар жавоби · тиллар — у каждого ✏️; цена крупно; ссылка НАМУНА */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExtraLang, InvitationData } from "@/lib/types";
import { graphemes, MAX_CUSTOM_TEXT } from "@/lib/order-rules";
import { tPlain as inv } from "@/texts/uz-cyrl";
import { useT } from "./shared";
import { haptic } from "./telegram";
import s from "../app.module.css";

export type Track = { id: string; title: string; url: string };
type Open = "text" | "music" | "rsvp" | "langs" | null;

type Props = {
  data: InvitationData;
  textId?: string;
  customText?: string;
  music?: { kind: "list"; musicId: string } | { kind: "none" };
  rsvp: boolean;
  /** v2: языки кроме узбекского, свой текст на них, какие языки можно добавить */
  langs: ExtraLang[];
  customTexts: Partial<Record<ExtraLang, string>>;
  extraLangs: ExtraLang[];
  /** Демо дизайна (для «👁 Мисол» на выбранном языке) */
  demoUrl: string | null;
  onExample: (url: string) => void;
  tracks: Track[];
  price: number;
  namunaUrl: string | null;
  status: string;
  onChange: (patch: { textId?: string; customText?: string; music?: Props["music"]; rsvp?: boolean; langs?: ExtraLang[]; customTexts?: Partial<Record<ExtraLang, string>> }) => void;
  onNamuna: () => void;
};

const firstLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function Summary(p: Props) {
  const T = useT();
  const [open, setOpen] = useState<Open>(null);
  const [own, setOwn] = useState(!!p.customText);
  const options = useMemo(() => inv.inviteOptions(p.data), [p.data]);
  const chosen = options.find((o) => o.id === p.textId) ?? options[0];
  const music = p.music ?? (p.tracks[0] ? { kind: "list" as const, musicId: p.tracks[0].id } : { kind: "none" as const });
  const track = music.kind === "list" ? p.tracks.find((t) => t.id === music.musicId) : undefined;

  // ▶ прослушать: одна мелодия за раз, стоп при уходе с экрана
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  function toggle(t: Track) {
    haptic.tap();
    if (playing === t.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    audio.current = new Audio(t.url);
    audio.current.onended = () => setPlaying(null);
    audio.current.play().then(() => setPlaying(t.id)).catch(() => setPlaying(null));
  }

  const toggleOpen = (k: Open) => {
    haptic.select();
    setOpen((o) => (o === k ? null : k));
  };
  const ownCount = graphemes(p.customText ?? "");

  return (
    <div className={s.screen}>
      <h1 className={s.title}>{T.summary.title}</h1>
      <p className={s.lead}>{T.summary.lead}</p>

      <div className={s.item}>
        <button type="button" className={s.itemHead} onClick={() => toggleOpen("text")} aria-expanded={open === "text"}>
          <span>
            <b>{T.summary.text}</b>
            <small>{p.customText ? firstLine(p.customText) : firstLine(`${chosen?.greeting ?? ""} ${chosen?.body ?? ""}`)}</small>
          </span>
          <i className={s.editMark} aria-hidden>{open === "text" ? "✓" : T.summary.edit}</i>
        </button>
        {open === "text" && (
          <div className={s.itemBody}>
            {options.map((o) => (
              <button key={o.id} type="button" className={s.option} aria-pressed={!own && chosen?.id === o.id} onClick={() => { haptic.select(); setOwn(false); p.onChange({ textId: o.id, customText: "" }); }}>
                <span className={s.optionText}>{`${o.greeting}\n${o.body}`}</span>
              </button>
            ))}
            <button type="button" className={s.option} aria-pressed={own} onClick={() => { haptic.select(); setOwn(true); }}>
              {T.summary.ownText}
            </button>
            {own && (
              <>
                <textarea className={`${s.input} ${ownCount > MAX_CUSTOM_TEXT ? s.inputErr : ""}`} value={p.customText ?? ""} placeholder={T.summary.ownTextPh} onChange={(e) => p.onChange({ customText: e.target.value })} name="customText" />
                <span className={ownCount > MAX_CUSTOM_TEXT ? s.err : s.help}>
                  {ownCount > MAX_CUSTOM_TEXT ? T.summary.ownTextLong(MAX_CUSTOM_TEXT) : T.summary.ownTextCount(ownCount, MAX_CUSTOM_TEXT)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className={s.item}>
        <button type="button" className={s.itemHead} onClick={() => toggleOpen("music")} aria-expanded={open === "music"}>
          <span>
            <b>{T.summary.music}</b>
            <small>{track ? track.title : T.summary.noMusic}</small>
          </span>
          <i className={s.editMark} aria-hidden>{open === "music" ? "✓" : T.summary.edit}</i>
        </button>
        {open === "music" && (
          <div className={s.itemBody}>
            {p.tracks.map((t) => (
              <div key={t.id} className={s.track}>
                <button type="button" className={s.play} aria-label={`${T.summary.play} ${t.title}`} onClick={() => toggle(t)}>
                  {playing === t.id ? T.summary.pause : T.summary.play}
                </button>
                <button type="button" className={s.option} aria-pressed={music.kind === "list" && music.musicId === t.id} onClick={() => { haptic.select(); p.onChange({ music: { kind: "list", musicId: t.id } }); }}>
                  {t.title}
                </button>
              </div>
            ))}
            <button type="button" className={s.option} aria-pressed={music.kind === "none"} onClick={() => { haptic.select(); audio.current?.pause(); setPlaying(null); p.onChange({ music: { kind: "none" } }); }}>
              {T.summary.noMusic}
            </button>
          </div>
        )}
      </div>

      <div className={s.item}>
        <div className={s.itemHead} style={{ cursor: "default" }}>
          <span>
            <b>{T.summary.rsvp}</b>
            <small>{p.rsvp ? T.summary.rsvpOn : T.summary.rsvpOff}</small>
          </span>
          <button type="button" role="switch" aria-checked={p.rsvp} aria-label={T.summary.rsvp} className={s.toggle} onClick={() => { haptic.tap(); p.onChange({ rsvp: !p.rsvp }); }} />
        </div>
      </div>

      <div className={s.item}>
        <button type="button" className={s.itemHead} onClick={() => toggleOpen("langs")} aria-expanded={open === "langs"}>
          <span>
            <b>{T.summary.langs}</b>
            <small>{T.summary.langsValue(p.langs.map((l) => T.summary.langNames[l]).join(" · "))}</small>
          </span>
          <i className={s.editMark} aria-hidden>{open === "langs" ? "✓" : T.summary.edit}</i>
        </button>
        {open === "langs" && (
          <div className={s.itemBody}>
            <span className={s.help}>{T.summary.langsHint(p.extraLangs.includes("kk"))}</span>
            {p.extraLangs.map((l) => {
              const on = p.langs.includes(l);
              return (
                <div key={l} className={s.track}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={T.summary.langNames[l]}
                    className={s.toggle}
                    onClick={() => {
                      haptic.tap();
                      p.onChange({ langs: on ? p.langs.filter((x) => x !== l) : p.extraLangs.filter((x) => x === l || p.langs.includes(x)) });
                    }}
                  />
                  <b style={{ flex: 1 }}>{T.summary.langNames[l]}</b>
                  {p.demoUrl && (
                    <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => { haptic.tap(); p.onExample(`${p.demoUrl}?lang=${l}`); }}>
                      {T.summary.langExample}
                    </button>
                  )}
                </div>
              );
            })}
            {p.customText &&
              p.langs.map((l) => {
                const value = p.customTexts[l] ?? "";
                const n = graphemes(value);
                return (
                  <label key={l} className={s.field}>
                    <span className={s.label}>{T.summary.ownTextIn(T.summary.langNames[l])}</span>
                    <textarea
                      className={`${s.input} ${n > MAX_CUSTOM_TEXT ? s.inputErr : ""}`}
                      value={value}
                      lang={l}
                      name={`customText-${l}`}
                      onChange={(e) => p.onChange({ customTexts: { ...p.customTexts, [l]: e.target.value } })}
                    />
                    <span className={n > MAX_CUSTOM_TEXT ? s.err : s.help}>{n > MAX_CUSTOM_TEXT ? T.summary.ownTextLong(MAX_CUSTOM_TEXT) : value ? T.summary.ownTextCount(n, MAX_CUSTOM_TEXT) : T.summary.ownTextInHint}</span>
                  </label>
                );
              })}
          </div>
        )}
      </div>

      <div className={s.total}>
        <span>{T.summary.total}</span>
        <b>{T.price(p.price)}</b>
      </div>

      {p.namunaUrl && (
        <div className={s.namuna}>
          <p>{T.summary.namunaHint}</p>
          <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={p.onNamuna}>
            {T.summary.namuna}
          </button>
        </div>
      )}
      <p className={s.status} aria-live="polite">{p.status}</p>
    </div>
  );
}
