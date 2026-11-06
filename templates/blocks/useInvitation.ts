"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import { INVITE_LANGS, setInviteLang, type InviteLang } from "@/texts/invite-lang";
import { parseWeddingDate } from "@/lib/wedding-date";
import { mapLink } from "@/lib/map-link";
import type { InvitationData, InvitationMode } from "@/lib/types";
import { SynthPlayer, type Score } from "./synth";
import { glueData, glueWords } from "@/lib/typography";

type Options = {
  /** Мелодия дизайна (играет, если клиент не прислал свою песню) */
  melody?: Score;
  /** false — дизайн без заставки (Оддий): приглашение открыто сразу */
  opening?: boolean;
};

/**
 * Общая механика любого дизайна: данные, тексты, музыка, открытие.
 * Дизайн решает только, КАК это выглядит.
 */
/** Где помним язык гостя (общий для всех приглашений: человек обычно читает на одном языке) */
export const LANG_KEY = "inviteizi:lang";

/** Стартовый язык: ?lang= в адресе → выбор гостя раньше → язык телефона (если клиент его выбрал) → главный язык заказа */
export function pickLang(available: InviteLang[], url: string | null, saved: string | null, phone: readonly string[], main: InviteLang = "uz"): InviteLang {
  const ok = (x: string | null | undefined): x is InviteLang => Boolean(x) && available.includes(x as InviteLang);
  if (ok(url)) return url;
  if (ok(saved)) return saved;
  for (const p of phone) {
    const short = p.toLowerCase().slice(0, 2);
    if (ok(short)) return short;
  }
  return ok(main) ? main : "uz";
}

export function useInvitation(raw: InvitationData, mode: InvitationMode, opts: Options = {}) {
  // Языки этой страницы: узбекский всегда, русский/казахский — если клиент добавил
  const langs: InviteLang[] = ["uz", ...INVITE_LANGS.filter((l) => l !== "uz" && raw.langs?.includes(l as "ru" | "kk"))];
  const langsKey = langs.join(",");
  const main: InviteLang = raw.mainLang && langs.includes(raw.mainLang) ? raw.mainLang : "uz";
  const [lang, setLang] = useState<InviteLang>("uz");
  // Несколько языков: пока не выбран язык гостя, страницу не показываем (без мигания узбекским на миг)
  const [langReady, setLangReady] = useState(langs.length < 2);
  // Язык ставится до того, как дизайн возьмёт тексты (t.… читает его при каждом обращении)
  setInviteLang(langs.includes(lang) ? lang : "uz");
  useEffect(() => {
    if (langsKey === "uz") return;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(LANG_KEY);
    } catch {
      // приватный режим: язык не помним
    }
    const url = new URLSearchParams(window.location.search).get("lang");
    const next = pickLang(langsKey.split(",") as InviteLang[], url, saved, navigator.languages?.length ? navigator.languages : [navigator.language], main);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- язык телефона известен только в браузере
    setLang(next);
    setLangReady(true);
  }, [langsKey, main]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // «ва / ҳам / билан» не висят в конце строки ни в одном дизайне
  const data = glueData(raw);
  const hasOpening = opts.opening !== false;
  const [started, setStarted] = useState(!hasOpening); // гость нажал «открыть»
  const [opened, setOpened] = useState(!hasOpening); // анимация открытия закончилась
  const [playing, setPlaying] = useState(false);
  // Элемент <audio> храним в состоянии (его создаёт audioElement ниже)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const synth = useRef<SynthPlayer | null>(null);
  // Гость сам выключил музыку — первый тап по странице её уже не включает
  const userPaused = useRef(false);
  const playingNow = useRef(false);
  useEffect(() => {
    playingNow.current = playing;
  }, [playing]);

  // В демо до оплаты музыки нет. Своя песня клиента важнее мелодии дизайна.
  // Личная НАМУНА до оплаты тоже с музыкой (решение владельца 24.10): клиент слышит свой выбор,
  // включает и выключает кнопкой ▶/⏸. Защита от рассылки без оплаты — надпись НАМУНА.
  const musicOff = data.noMusic;
  const musicUrl = musicOff ? undefined : data.musicUrl;
  const melody = musicOff || musicUrl ? undefined : opts.melody;

  // Пока приглашение закрыто, страницу под ним нельзя прокрутить
  useEffect(() => {
    const el = document.documentElement;
    el.style.overflow = opened ? "" : "hidden";
    return () => {
      el.style.overflow = "";
    };
  }, [opened]);

  // Гость ушёл из вкладки — музыка замолкает, вернулся — играет дальше
  useEffect(() => {
    if (!playing) return;
    const onHide = () => {
      if (!document.hidden) return;
      if (synth.current) synth.current.pause();
      else audio?.pause();
      playingNow.current = false;
      setPlaying(false);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [playing, audio]);

  useEffect(() => () => synth.current?.dispose(), []);

  function playMusic() {
    if (playingNow.current) return;
    playingNow.current = true;
    if (melody) {
      synth.current ??= new SynthPlayer(melody);
      synth.current.play();
      setPlaying(true);
    } else if (audio) {
      startAudio(audio).catch(() => {
        playingNow.current = false;
        setPlaying(false);
      });
    } else playingNow.current = false;
  }

  // Музыка с первого НАЖАТИЯ по странице (click — это тап, не прокрутка: прокрутку браузер звуком не считает).
  // Кнопку музыки и заставку не трогаем — у них свой обработчик.
  const hasMusicNow = Boolean(musicUrl || melody);
  useEffect(() => {
    if (!hasMusicNow) return;
    const onTap = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("[data-music-button],[data-lang-switch]")) return;
      document.removeEventListener("click", onTap, true);
      if (!userPaused.current) playMusic();
    };
    document.addEventListener("click", onTap, true);
    return () => document.removeEventListener("click", onTap, true);
    // playMusic читает refs и текущий audio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMusicNow, audio]);

  const events = data.events.map((ev) => ({
    ...ev,
    title: t.eventTitles[ev.kind],
    when: parseWeddingDate(ev.date, ev.time),
    mapHref: mapLink(ev),
  }));

  // «Тўй дастури»: все тадбиры по порядку (по дате и времени)
  const program = [...events].sort((a, b) => a.when.startsAt.getTime() - b.when.startsAt.getTime());
  const sides = data.sides?.groom || data.sides?.bride ? data.sides : undefined;

  return {
    data,
    mode,
    occasion: data.occasion,
    /** Текст приглашения: { greeting, body } */
    text: (({ greeting, body }) => ({ greeting: glueWords(greeting), body: glueWords(body) }))(t.invite(data)),
    events,
    /** Главное событие: для «Тўй санаси», календаря и таймера */
    main: events[0],
    /** «Тўй дастури»: тадбиры по порядку времени */
    program,
    /** Никоҳ: «Куёв томони / Келин томони», если клиент указал обе семьи */
    sides,
    /** Оқ фотиҳа: короткое благословение для рамки */
    blessing: t.blessing.text[data.occasion],
    /** Первое событие утром (до 09:00): «эрталаб соат 6:00» */
    isMorning: Number(events[0]?.time.slice(0, 2)) < 9,
    hasMusic: Boolean(musicUrl || melody),
    /** Тег <audio> для песни клиента: InvitationShell вставляет его на страницу */
    audioElement: musicUrl
      ? createElement("audio", {
          ref: setAudio,
          src: musicUrl,
          loop: true,
          preload: "none",
          onPlay: () => setPlaying(true),
          onPause: () => setPlaying(false),
          onError: () => setPlaying(false),
        })
      : null,
    started,
    opened,
    playing,
    /** Вызывать прямо в обработчике нажатия: иначе телефон заблокирует музыку */
    start() {
      if (started) return;
      setStarted(true);
      window.scrollTo(0, 0);
      playMusic();
    },
    finishOpening() {
      setOpened(true);
    },
    toggleMusic() {
      if (playing) {
        userPaused.current = true;
        playingNow.current = false;
        if (synth.current) synth.current.pause();
        else audio?.pause();
        setPlaying(false);
      } else {
        userPaused.current = false;
        playMusic();
      }
    },
    /** v2: язык страницы и доступные языки; setLang запоминает выбор гостя */
    lang: langs.includes(lang) ? lang : ("uz" as InviteLang),
    langs,
    /** false — язык гостя ещё выбирается (первый кадр после загрузки) */
    langReady,
    setLang(next: InviteLang) {
      if (!langs.includes(next)) return;
      setLang(next);
      try {
        window.localStorage.setItem(LANG_KEY, next);
      } catch {
        // приватный режим
      }
    },
    /** Дизайн без заставки: музыку включают кнопкой на первом экране */
    hasOpening,
  };
}

/** Плавное нарастание громкости ~1,5 с (iPhone громкость не меняет — там просто играет) */
function startAudio(el: HTMLAudioElement) {
  el.volume = 0;
  return el.play().then(() => fadeIn(el));
}

/** Громкость 0 → 1 за ~1,5 с */
function fadeIn(audio: HTMLAudioElement) {
  const start = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / 1500);
    try {
      audio.volume = k;
    } catch {
      return;
    }
    if (k < 1 && !audio.paused) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export type Invitation = ReturnType<typeof useInvitation>;
export type InvitationEventView = Invitation["events"][number];
