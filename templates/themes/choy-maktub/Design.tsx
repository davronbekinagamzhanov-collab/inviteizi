"use client";
/**
 * «Чой мактуби» (123) — наҳорги ош, Оддий, структура S3 «Мактуб».
 * Утреннее письмо на тёплой бумаге: в шапке чойнак и пиёла кобальтовой линией, в углах — пахта.
 * Крупный Vollkorn, всё на 1–2 экранах.
 */
import type { TemplateProps } from "../types";
import { Maktub } from "../b3/s3-maktub";
import { palette } from "../b3/kit";
import { Choynak, Paxta } from "../b3/decor";
import { melody } from "../tandir-nuri/melody";
import s from "./choy-maktub.module.css";

const skin = {
  vars: palette({ paper: "#f3ece0", ink: "#33291f", accent: "#2c5a8c", soft: "#e8eef5", line: "#9fb3cb", card: "#fffcf6", muted: "#6d6157" }),
  pageColor: "#f3ece0",
  backdrop: "bg-[#e9e0d1]",
  music: "bg-[#fffcf6]/85 text-[#33291f] ring-[#2c5a8c]/30",
  rsvp: { paper: "#fffcf6", ink: "#33291f", line: "#dfd5c5", soft: "#eef2f7", accent: "#2c5a8c", font: "var(--b-vollkorn)", radius: "8px", buttonRadius: "8px" },
};

export default function ChoyMaktub(props: TemplateProps) {
  return <Maktub {...props} melody={melody} skin={skin} look={s} motif={<Choynak />} corner={<Paxta />} />;
}
