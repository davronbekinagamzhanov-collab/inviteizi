"use client";
/**
 * «Тонг варағи» (126) — наҳорги ош, Варақланадиган, структура S2 «Варақ».
 * Рассветное небо и шафран: на первом экране нон с узором чекича, экраны листаются по одному.
 */
import type { TemplateProps } from "../types";
import { Varaq } from "../b3/s2-varaq";
import { palette } from "../b3/kit";
import { Non, Paxta } from "../b3/decor";
import { melody } from "../tonggi-qozon/melody";
import s from "./tong-varaq.module.css";

const skin = {
  vars: palette({ paper: "#eef1f3", ink: "#23303a", accent: "#b9741a", soft: "#f6ead6", line: "#c3cdd5", card: "#ffffff", muted: "#5a6670" }),
  pageColor: "#eef1f3",
  backdrop: "bg-[#e2e7eb]",
  music: "bg-white/85 text-[#23303a] ring-[#b9741a]/35",
  rsvp: { paper: "#ffffff", ink: "#23303a", line: "#d6dde3", soft: "#f6ead6", accent: "#b9741a", font: "var(--b-garamond)", radius: "16px", buttonRadius: "999px" },
};

export default function TongVaraq(props: TemplateProps) {
  return <Varaq {...props} melody={melody} skin={skin} look={s} motif={<Non />} textArt={<Paxta />} />;
}
