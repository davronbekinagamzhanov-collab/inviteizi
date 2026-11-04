"use client";
/**
 * «Ганч дарвоза» (134) — суннат, Анимацияли, без фото, структура S4 «Дарвоза».
 * Светлые песочные резные ворота с охристым ганч-гириҳом, за ними — известково-белый двор с арочными окнами; мотив — чуст дўппи.
 */
import type { TemplateProps } from "../types";
import { Darvoza } from "../b3/s4-darvoza";
import { palette } from "../b3/kit";
import { Doppi } from "../b3/decor";
import { melody } from "../ganch-peshtoq/melody";
import s from "./ganch-darvoza.module.css";

const skin = {
  vars: palette({ paper: "#f4f0e8", ink: "#29231c", accent: "#8a611d", soft: "#ece5d6", line: "#d3c4a4", card: "#fcfaf5", muted: "#675c4c" }, { "--wood": "#e6d7b8", "--carve": "#9a7232" }),
  pageColor: "#f4f0e8",
  backdrop: "bg-[#e9e2d4]",
  music: "bg-[#fcfaf5]/85 text-[#29231c] ring-[#8a611d]/30",
  rsvp: { paper: "#fcfaf5", ink: "#29231c", line: "#e6dcc8", soft: "#f3ede1", accent: "#8a611d", font: "var(--b-alegreya)", radius: "4px", buttonRadius: "999px" },
};

export default function GanchDarvoza(props: TemplateProps) {
  return <Darvoza {...props} melody={melody} skin={skin} look={s} motif={<Doppi />} id="ganch-darvoza" />;
}
