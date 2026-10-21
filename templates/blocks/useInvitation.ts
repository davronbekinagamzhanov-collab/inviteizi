"use client";

import { createElement, useEffect, useState } from "react";
import { t } from "@/texts/uz-cyrl";
import { parseWeddingDate } from "@/lib/wedding-date";
import { mapLink } from "@/lib/map-link";
import type { InvitationData, InvitationMode } from "@/lib/types";

/**
 * Общая механика любого Премиум-дизайна: данные, музыка, открытие.
 * Дизайн решает только, КАК это выглядит.
 */
export function useInvitation(data: InvitationData, mode: InvitationMode) {
  const [started, setStarted] = useState(false); // гость нажал «открыть»
  const [opened, setOpened] = useState(false); // анимация открытия закончилась
  const [playing, setPlaying] = useState(false);
  // Элемент <audio> храним в состоянии (его создаёт audioElement ниже)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // В демо до оплаты музыки нет
  const musicUrl = mode === "full" ? data.musicUrl : undefined;

  // Пока приглашение закрыто, страницу под ним нельзя прокрутить
  useEffect(() => {
    const el = document.documentElement;
    el.style.overflow = opened ? "" : "hidden";
    return () => {
      el.style.overflow = "";
    };
  }, [opened]);

  return {
    data,
    mode,
    date: parseWeddingDate(data.date, data.time),
    initials: [data.groom.charAt(0), data.bride.charAt(0)] as [string, string],
    inviteText: t.inviteTexts.find((x) => x.id === data.inviteTextId) ?? t.inviteTexts[0],
    mapHref: mapLink(data),
    musicUrl,
    /** Тег <audio>: InvitationShell вставляет его на страницу */
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
      audio?.play().catch(() => setPlaying(false));
    },
    finishOpening() {
      setOpened(true);
    },
    toggleMusic() {
      if (!audio) return;
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    },
  };
}

export type Invitation = ReturnType<typeof useInvitation>;
