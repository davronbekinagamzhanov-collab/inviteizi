"use client";
/**
 * «Қозон тонги» (125) — наҳорги ош, Анимацияли, С ФОТО, структура S1 «Фото-ҳикоя».
 * Открытие — тандирные нонлар на весь экран; рассказ в цветах дыма и углей. Запасные фото — нон, чойнак, ош на атлас-ляганде.
 */
import type { TemplateProps } from "../types";
import { Hikoya } from "../b3/s1-hikoya";
import { palette } from "../b3/kit";
import { Qozon } from "../b3/decor";
import { melody } from "../bog/melody";
import s from "./qozon-tongi.module.css";

const skin = {
  vars: palette({ paper: "#f2ede6", ink: "#251f1b", accent: "#7c3f22", soft: "#e9e1d6", line: "#cdbfae", card: "#fbf8f3", muted: "#665a50" }),
  pageColor: "#f2ede6",
  backdrop: "bg-[#e7e0d6]",
  music: "bg-[#fbf8f3]/85 text-[#251f1b] ring-[#7c3f22]/30",
  rsvp: { paper: "#fbf8f3", ink: "#251f1b", line: "#e6dccf", soft: "#f3ece3", accent: "#7c3f22", font: "var(--b-playfair)", radius: "4px", buttonRadius: "999px" },
};

export default function QozonTongi(props: TemplateProps) {
  return (
    <Hikoya
      {...props}
      melody={melody}
      skin={skin}
      look={s}
      motif={<Qozon />}
      photos={[
        { kind: "unsplash", slot: "b3-non", w: 900 },
        { kind: "unsplash", slot: "b3-tea-2", w: 500 },
        { kind: "unsplash", slot: "b3-plov", w: 900 },
      ]}
    />
  );
}
