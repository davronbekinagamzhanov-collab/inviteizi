"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import { parseWeddingDate } from "@/lib/wedding-date";
import { mapLink } from "@/lib/map-link";
import type { InvitationData, InvitationMode } from "@/lib/types";
import { SynthPlayer, type Score } from "./synth";

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
export function useInvitation(data: InvitationData, mode: InvitationMode, opts: Options = {}) {
  const hasOpening = opts.opening !== false;
  const [started, setStarted] = useState(!hasOpening); // гость нажал «открыть»
  const [opened, setOpened] = useState(!hasOpening); // анимация открытия закончилась
  const [playing, setPlaying] = useState(false);
  // Элемент <audio> храним в состоянии (его создаёт audioElement ниже)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const synth = useRef<SynthPlayer | null>(null);

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
      setPlaying(false);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [playing, audio]);

  useEffect(() => () => synth.current?.dispose(), []);

  function playMusic() {
    if (melody) {
      synth.current ??= new SynthPlayer(melody);
      synth.current.play();
      setPlaying(true);
    } else if (audio) {
      audio.play().catch(() => setPlaying(false));
    }
  }

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
    text: t.invite(data),
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
        if (synth.current) synth.current.pause();
        else audio?.pause();
        setPlaying(false);
      } else {
        playMusic();
      }
    },
  };
}

export type Invitation = ReturnType<typeof useInvitation>;
export type InvitationEventView = Invitation["events"][number];
