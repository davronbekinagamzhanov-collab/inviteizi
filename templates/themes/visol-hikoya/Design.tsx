"use client";
/**
 * «Висол ҳикояси» (133) — никоҳ, Анимацияли, С ФОТО, структура S1 «Фото-ҳикоя».
 * Открытие — фата невесты на весь экран; рассказ в цвете тутового вина. Запасные фото — фата, хна, розы.
 */
import type { TemplateProps } from "../types";
import { Hikoya } from "../b3/s1-hikoya";
import { palette } from "../b3/kit";
import { Bodom } from "../b3/decor";
import { melody } from "../sapfir/melody";
import s from "./visol-hikoya.module.css";

const skin = {
  vars: palette({ paper: "#f5f1ec", ink: "#241c22", accent: "#6e2f45", soft: "#eee4e4", line: "#d4c3c7", card: "#fdfaf7", muted: "#655a60" }),
  pageColor: "#f5f1ec",
  backdrop: "bg-[#ebe3e0]",
  music: "bg-[#fdfaf7]/85 text-[#241c22] ring-[#6e2f45]/30",
  rsvp: { paper: "#fdfaf7", ink: "#241c22", line: "#e8dcdc", soft: "#f5ecec", accent: "#6e2f45", font: "var(--b-playfair)", radius: "2px", buttonRadius: "2px" },
};

export default function VisolHikoya(props: TemplateProps) {
  return (
    <Hikoya
      {...props}
      melody={melody}
      skin={skin}
      look={s}
      motif={<Bodom />}
      photos={[
        { kind: "unsplash", slot: "b3-veil", w: 900 },
        { kind: "unsplash", slot: "b3-hands-henna", w: 500 },
        { kind: "unsplash", slot: "b3-roses", w: 900 },
      ]}
    />
  );
}
