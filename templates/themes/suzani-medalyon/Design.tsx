"use client";
/**
 * «Сузана медальон» (129) — никоҳ, Оддий, С ФОТО, структура S7 «Медальон».
 * Медальон с фото в кольце лепестков сузаны; гранатово-бордовую гамму не берём — шафран и маренго.
 * Запасные фото — вышитая сузана в медальоне, руки с кольцами над розами, каллы.
 */
import type { TemplateProps } from "../types";
import { Medalyon } from "../b3/s7-medalyon";
import { palette } from "../b3/kit";
import { Suzani } from "../b3/decor";
import { melody } from "../oltin-monogramma/melody";
import s from "./suzani-medalyon.module.css";

const skin = {
  vars: palette({ paper: "#f5f0e6", ink: "#262626", accent: "#a0661c", soft: "#ede4d2", line: "#d6c3a0", card: "#fdfaf3", muted: "#5f5a52" }, { "--slate": "#3d4550" }),
  pageColor: "#f5f0e6",
  backdrop: "bg-[#ebe3d3]",
  music: "bg-[#fdfaf3]/85 text-[#262626] ring-[#a0661c]/30",
  rsvp: { paper: "#fdfaf3", ink: "#262626", line: "#e8dcc4", soft: "#f5eddd", accent: "#a0661c", font: "var(--b-unicase)", radius: "24px", buttonRadius: "999px" },
};

export default function SuzaniMedalyon(props: TemplateProps) {
  return (
    <Medalyon
      {...props}
      melody={melody}
      skin={skin}
      look={s}
      motif={<Suzani />}
      photos={[
        { kind: "unsplash", slot: "b3-suzani", w: 700 },
        { kind: "unsplash", slot: "b3-hands-roses", w: 300 },
        { kind: "unsplash", slot: "b3-callas", w: 300 },
      ]}
    />
  );
}
