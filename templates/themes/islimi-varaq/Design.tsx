"use client";
/**
 * «Ислими варақ» (131) — никоҳ, Варақланадиган, без фото, структура S2 «Варақ».
 * Сливово-лиловый лист с золотой лозой ислими сверху и снизу каждого экрана, сузана над текстом.
 */
import type { TemplateProps } from "../types";
import { Varaq } from "../b3/s2-varaq";
import { palette } from "../b3/kit";
import { Islimi, Suzani } from "../b3/decor";
import { melody } from "../anor-bogi/melody";
import s from "./islimi-varaq.module.css";

const skin = {
  vars: palette({ paper: "#f4f0f3", ink: "#2b2030", accent: "#5b3a63", soft: "#ece3ee", line: "#c8b9cd", card: "#fffdfe", muted: "#6a5d6e" }, { "--gold": "#a8874f" }),
  pageColor: "#f4f0f3",
  backdrop: "bg-[#e8e0e9]",
  music: "bg-[#fffdfe]/85 text-[#2b2030] ring-[#5b3a63]/30",
  rsvp: { paper: "#fffdfe", ink: "#2b2030", line: "#e3d8e5", soft: "#f1eaf2", accent: "#5b3a63", font: "var(--b-garamond)", radius: "4px", buttonRadius: "4px" },
};

export default function IslimiVaraq(props: TemplateProps) {
  return <Varaq {...props} melody={melody} skin={skin} look={s} motif={<Islimi />} textArt={<Suzani />} />;
}
