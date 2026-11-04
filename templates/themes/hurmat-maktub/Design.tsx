"use client";
/**
 * «Ҳурмат мактуби» (138) — юбилей, Оддий, структура S3 «Мактуб».
 * Благородное письмо для старших: тёмно-бирюзовая шапка-плашка с сузана-розеткой золотой линией,
 * крупный возраст, основной текст 19 px.
 */
import type { TemplateProps } from "../types";
import { Maktub } from "../b3/s3-maktub";
import { palette } from "../b3/kit";
import { Suzani } from "../b3/decor";
import { melody } from "../oltin-ot/melody";
import s from "./hurmat-maktub.module.css";

const skin = {
  vars: palette({ paper: "#ece4d6", ink: "#1f2b2e", accent: "#1f4e5a", soft: "#e6eeee", line: "#b38b4a", card: "#fdf9f1", muted: "#5b6466" }, { "--gold": "#b38b4a" }),
  pageColor: "#ece4d6",
  backdrop: "bg-[#e2d8c7]",
  music: "bg-[#fdf9f1]/85 text-[#1f2b2e] ring-[#1f4e5a]/30",
  rsvp: { paper: "#fdf9f1", ink: "#1f2b2e", line: "#e3d6bf", soft: "#f1ebe0", accent: "#1f4e5a", font: "var(--b-vollkorn)", radius: "6px", buttonRadius: "6px" },
};

export default function HurmatMaktub(props: TemplateProps) {
  return <Maktub {...props} melody={melody} skin={skin} look={s} motif={<Suzani />} />;
}
