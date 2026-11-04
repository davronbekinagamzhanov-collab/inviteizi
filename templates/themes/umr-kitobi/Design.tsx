"use client";
/**
 * «Умр китоби» (137) — юбилей, Варақланадиган, без фото, структура S6 «Китоб».
 * Старая книжная бумага, кожаный кирпичный цвет, коробочка пахты; крупный возраст на титуле.
 */
import type { TemplateProps } from "../types";
import { Kitob } from "../b3/s6-kitob";
import { palette } from "../b3/kit";
import { Paxta } from "../b3/decor";
import { melody } from "../oltin-monogramma/melody";
import s from "./umr-kitobi.module.css";

const skin = {
  vars: palette({ paper: "#efe5d3", ink: "#2b2117", accent: "#6b2e1f", soft: "#e7dcc6", line: "#cdb994", card: "#faf4e8", muted: "#675846" }),
  pageColor: "#efe5d3",
  backdrop: "bg-[#e4d9c4]",
  music: "bg-[#faf4e8]/85 text-[#2b2117] ring-[#6b2e1f]/30",
  rsvp: { paper: "#faf4e8", ink: "#2b2117", line: "#e5d8be", soft: "#f2e9d8", accent: "#6b2e1f", font: "var(--b-garamond)", radius: "4px", buttonRadius: "4px" },
};

export default function UmrKitobi(props: TemplateProps) {
  return <Kitob {...props} melody={melody} skin={skin} look={s} motif={<Paxta />} />;
}
