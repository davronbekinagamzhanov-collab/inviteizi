"use client";
/** «Бот сиз учун танлади»: матн · мусиқа · меҳмонлар жавоби · тиллар — у каждого ✏️; цена крупно; ссылка НАМУНА */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExtraLang, InvitationData, Occasion } from "@/lib/types";
import { OwnMusic } from "./OwnMusic";
import { graphemes, MAX_CUSTOM_TEXT } from "@/lib/order-rules";
import { tPlain as inv } from "@/texts/uz-cyrl";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { CheckIcon, PauseIcon, PencilIcon, PlayIcon, SpinnerIcon } from "./icons";
import s from "../app.module.css";

export type Track = { id: string; title: string; url: string; occasion?: Occasion };
type Open = "text" | "music" | "rsvp" | "langs" | null;

type Props = {
  data: InvitationData;
  textId?: string;
  customText?: string;
  music?: { kind: "list"; musicId: string } | { kind: "none" } | { kind: "own"; url: string; title?: string };
  rsvp: boolean;
  /** v2: языки кроме узбекского, свой текст на них, какие языки можно добавить */
  langs: ExtraLang[];
  customTexts: Partial<Record<ExtraLang, string>>;
  extraLangs: ExtraLang[];
  mainLang?: ExtraLang;
  /** Демо дизайна (для «👁 Мисол» на выбранном языке) */
  demoUrl: string | null;
  onExample: (url: string) => void;
  tracks: Track[];
  /** «Бошқа мусиқалар»: мелодии других тадбиров (с подписью категории) */
  others: Track[];
  price: number;
  namunaUrl: string | null;
  status: string;
  onChange: (patch: { textId?: string; customText?: string; music?: Props["music"]; rsvp?: boolean; langs?: ExtraLang[]; customTexts?: Partial<Record<ExtraLang, string>>; mainLang?: ExtraLang }) => void;
  onNamuna: () => void;
  /** «✏️ Маълумотларни ўзгартириш»: анкета (имена, дата, время, место) поверх итога */
  onEdit: () => void;
};

const firstLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function Summary(p: Props) {
  const T = useT();
  const [open, setOpen] = useState<Open>(null);
  const [own, setOwn] = useState(!!p.customText);
  const options = useMemo(() => inv.inviteOptions(p.data), [p.data]);
  const chosen = options.find((o) => o.id === p.textId) ?? options[0];
  const music = p.music ?? (p.tracks[0] ? { kind: "list" as const, musicId: p.tracks[0].id } : { kind: "none" as const });
  const track = music.kind === "list" ? [...p.tracks, ...p.others].find((t) => t.id === music.musicId) : music.kind === "own" ? { id: "own", title: music.title || T.summary.ownTitle, url: music.url } : undefined;

  // ▶ прослушать: одна мелодия за раз; пока грузится — кружок; не открылась — мягкое сообщение; стоп при уходе с экрана
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  function stop() {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
    setLoading(null);
  }
  function toggle(t: Track) {
    haptic.tap();
    if (playing === t.id || loading === t.id) return stop();
    stop();
    setFailed(null);
    const a = new Audio(t.url);
    audio.current = a;
    setLoading(t.id);
    const fail = () => {
      if (audio.current !== a) return;
      stop();
      setFailed(t.id);
      haptic.error();
    };
    a.onended = () => audio.current === a && stop();
    a.onerror = fail;
    a.onplaying = () => {
      if (audio.current !== a) return;
      setLoading(null);
      setPlaying(t.id);
    };
    a.play().catch(fail);
  }

  const selected = (t: Track) => (t.id === "own" ? music.kind === "own" : music.kind === "list" && music.musicId === t.id);
  // Свой тадбир → «Бошқа мусиқалар» (с подписью категории) → своя песня
  const list: (Track | "group")[] = [...p.tracks, ...(music.kind === "own" ? [{ id: "own", title: music.title || T.summary.ownTitle, url: music.url }] : []), ...(p.others.length ? (["group"] as const) : []), ...p.others];

  const toggleOpen = (k: Open) => {
    haptic.select();
    setOpen((o) => (o === k ? null : k));
  };
  const ownCount = graphemes(p.customText ?? "");

  return (
    <div className={s.screen}>
      <h1 className={s.title}>{T.summary.title}</h1>
      <p className={s.lead}>{T.summary.lead}</p>
      <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnWide} ${s.btnEdit}`} onClick={p.onEdit} data-edit-data>
        {T.form.editData}
      </button>

      <div className={s.item}>
        <button type="button" className={s.itemHead} onClick={() => toggleOpen("text")} aria-expanded={open === "text"}>
          <span>
            <b>{T.summary.text}</b>
            <small>{p.customText ? firstLine(p.customText) : firstLine(`${chosen?.greeting ?? ""} ${chosen?.body ?? ""}`)}</small>
          </span>
          <i className={s.editMark} aria-hidden>{open === "text" ? <CheckIcon size={20} /> : <PencilIcon size={20} />}</i>
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
                  {ownCount > MAX_CUSTOM_TEXT ? `${T.summary.ownTextCount(ownCount, MAX_CUSTOM_TEXT)} · ${T.summary.ownTextLong(MAX_CUSTOM_TEXT)}` : T.summary.ownTextCount(ownCount, MAX_CUSTOM_TEXT)}
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
          <i className={s.editMark} aria-hidden>{open === "music" ? <CheckIcon size={20} /> : <PencilIcon size={20} />}</i>
        </button>
        {open === "music" && (
          <div className={s.itemBody}>
            {list.map((t) =>
              t === "group" ? (
                <p key="group" className={s.musicGroup}>
                  {T.summary.otherMusic}
                </p>
              ) : (
            <div key={t.id} className={s.track}>
              <button
                type="button"
                className={s.play}
                data-state={loading === t.id ? "loading" : playing === t.id ? "playing" : "idle"}
                aria-label={`${loading === t.id ? T.summary.musicLoading : playing === t.id ? T.summary.pause : T.summary.play}: ${t.title}`}
                aria-busy={loading === t.id}
                onClick={() => toggle(t)}
              >
                {loading === t.id ? <SpinnerIcon /> : playing === t.id ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                type="button"
                className={s.option}
                aria-pressed={selected(t)}
                data-track={t.id}
                onClick={() => { haptic.select(); if (t.id !== "own") p.onChange({ music: { kind: "list", musicId: t.id } }); }}
              >
                <span>{t.title}</span>
                {t.occasion && <small className={s.trackCat}>{T.occasions[t.occasion]}</small>}
              </button>
            </div>
          
              ),
            )}
            <OwnMusic onDone={(url, title) => { stop(); setFailed(null); p.onChange({ music: { kind: "own", url, title } }); }} />
            {failed && <p className={s.trackErr} role="alert">{T.summary.musicError}</p>}
            <button type="button" className={s.option} aria-pressed={music.kind === "none"} onClick={() => { haptic.select(); stop(); p.onChange({ music: { kind: "none" } }); }}>
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
          <i className={s.editMark} aria-hidden>{open === "langs" ? <CheckIcon size={20} /> : <PencilIcon size={20} />}</i>
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
                      const next = on ? p.langs.filter((x) => x !== l) : p.extraLangs.filter((x) => x === l || p.langs.includes(x));
                      p.onChange({ langs: next, ...(on && p.mainLang === l ? { mainLang: undefined } : {}) });
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
            {p.langs.length > 0 && (
              <div className={s.field}>
                <span className={s.label}>{T.summary.mainLang}</span>
                <div className={s.seg} role="radiogroup" aria-label={T.summary.mainLang}>
                  {(["uz", ...p.langs] as ("uz" | ExtraLang)[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      className={s.segBtn}
                      aria-checked={(p.mainLang ?? "uz") === l}
                      onClick={() => { haptic.select(); p.onChange({ mainLang: l === "uz" ? undefined : l }); }}
                    >
                      {T.langSwitch[l]}
                    </button>
                  ))}
                </div>
                <span className={s.help}>{T.summary.mainLangHint}</span>
              </div>
            )}
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
                    <span className={n > MAX_CUSTOM_TEXT ? s.err : s.help}>{n > MAX_CUSTOM_TEXT ? `${T.summary.ownTextCount(n, MAX_CUSTOM_TEXT)} · ${T.summary.ownTextLong(MAX_CUSTOM_TEXT)}` : value ? T.summary.ownTextCount(n, MAX_CUSTOM_TEXT) : T.summary.ownTextInHint}</span>
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
