"use client";
/**
 * «Оқ мактуб» (127) — никоҳ, Оддий, структура S3 «Мактуб».
 * Белое письмо с аркой сверху, изумрудная лента ислими в шапке, бодом гули в углах.
 */
import type { TemplateProps } from "../types";
import { Maktub } from "../b3/s3-maktub";
import { palette } from "../b3/kit";
import { Bodom, Islimi } from "../b3/decor";
import { melody } from "../oq-ot/melody";
import s from "./oq-maktub.module.css";

const skin = {
  vars: palette({ paper: "#e9ece6", ink: "#25302b", accent: "#2f5e4e", soft: "#eaf1ed", line: "#a9c0b4", card: "#ffffff", muted: "#5d6a63" }),
  pageColor: "#e9ece6",
  backdrop: "bg-[#dfe4dd]",
  music: "bg-white/85 text-[#25302b] ring-[#2f5e4e]/30",
  rsvp: { paper: "#ffffff", ink: "#25302b", line: "#d5e0d9", soft: "#eef4f0", accent: "#2f5e4e", font: "var(--b-vollkorn)", radius: "14px", buttonRadius: "999px" },
};

export default function OqMaktub(props: TemplateProps) {
  return <Maktub {...props} melody={melody} skin={skin} look={s} motif={<Islimi />} corner={<Bodom />} />;
}
