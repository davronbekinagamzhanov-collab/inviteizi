"use client";
/**
 * «Лола медальон» (136) — суннат, Оддий, С ФОТО, структура S7 «Медальон».
 * Весенний медальон: цветущий бодом в круге, нежно-зелёная гамма, тюльпан в финале.
 * Запасные фото — цветущая ветка, бирюзовый купол Бухары, минарет Кальта-Минор (Хива).
 */
import type { TemplateProps } from "../types";
import { Medalyon } from "../b3/s7-medalyon";
import { palette } from "../b3/kit";
import { Lola } from "../b3/decor";
import { melody } from "../bog/melody";
import s from "./lola-medalyon.module.css";

const skin = {
  vars: palette({ paper: "#f2f3ec", ink: "#22281f", accent: "#4f6b3a", soft: "#e6eadb", line: "#c4cdb2", card: "#fbfcf7", muted: "#5a6252" }, { "--blush": "#c98b8b" }),
  pageColor: "#f2f3ec",
  backdrop: "bg-[#e6e9dd]",
  music: "bg-[#fbfcf7]/85 text-[#22281f] ring-[#4f6b3a]/30",
  rsvp: { paper: "#fbfcf7", ink: "#22281f", line: "#e1e6d5", soft: "#f1f3ea", accent: "#4f6b3a", font: "var(--b-unicase)", radius: "24px", buttonRadius: "999px" },
};

export default function LolaMedalyon(props: TemplateProps) {
  return (
    <Medalyon
      {...props}
      melody={melody}
      skin={skin}
      look={s}
      motif={<Lola />}
      photos={[
        { kind: "unsplash", slot: "b3-blossom", w: 700 },
        { kind: "unsplash", slot: "s-bukhara-dome", w: 300 },
        { kind: "unsplash", slot: "s-khiva-minor", w: 300 },
      ]}
    />
  );
}
