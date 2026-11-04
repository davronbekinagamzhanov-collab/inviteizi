"use client";
/**
 * «Дўппи китоби» (135) — суннат, Варақланадиган, без фото, структура S6 «Китоб».
 * Хлопково-белые страницы, индиговые чернила, чуст дўппи на титуле; страницы листаются вбок.
 */
import type { TemplateProps } from "../types";
import { Kitob } from "../b3/s6-kitob";
import { palette } from "../b3/kit";
import { Doppi } from "../b3/decor";
import { melody } from "../muhr/melody";
import s from "./doppi-kitob.module.css";

const skin = {
  vars: palette({ paper: "#eef0f2", ink: "#1e2230", accent: "#3b3f6b", soft: "#e3e5ec", line: "#c4c8d6", card: "#fbfbf8", muted: "#5b5f70" }),
  pageColor: "#eef0f2",
  backdrop: "bg-[#e3e6ea]",
  music: "bg-[#fbfbf8]/85 text-[#1e2230] ring-[#3b3f6b]/30",
  rsvp: { paper: "#fbfbf8", ink: "#1e2230", line: "#dfe1e8", soft: "#eff0f4", accent: "#3b3f6b", font: "var(--b-garamond)", radius: "2px", buttonRadius: "2px" },
};

export default function DoppiKitob(props: TemplateProps) {
  return <Kitob {...props} melody={melody} skin={skin} look={s} motif={<Doppi />} />;
}
