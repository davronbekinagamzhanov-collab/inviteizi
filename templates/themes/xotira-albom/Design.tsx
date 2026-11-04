"use client";
/**
 * «Хотира альбом» (132) — никоҳ, Варақланадиган, С ФОТО, структура S5 «Альбом».
 * Льняной серо-голубой лист, тёмно-синий текст, горчичная лента; фото листаются лентой вбок.
 */
import type { TemplateProps } from "../types";
import { Albom } from "../b3/s5-albom";
import { palette } from "../b3/kit";
import { Paxta } from "../b3/decor";
import { melody } from "../ipak/melody";
import s from "./xotira-albom.module.css";

const skin = {
  vars: palette({ paper: "#eceeea", ink: "#1f2a35", accent: "#33475b", soft: "#e1e5e2", line: "#bfc7c6", card: "#fafbf8", muted: "#58636b" }, { "--mustard": "#c99a3a" }),
  pageColor: "#eceeea",
  backdrop: "bg-[#e0e4e0]",
  music: "bg-[#fafbf8]/85 text-[#1f2a35] ring-[#33475b]/30",
  rsvp: { paper: "#fafbf8", ink: "#1f2a35", line: "#dde2e0", soft: "#eef1ee", accent: "#33475b", font: "var(--b-piazzolla)", radius: "0px", buttonRadius: "0px" },
};

export default function XotiraAlbom(props: TemplateProps) {
  return (
    <Albom
      {...props}
      melody={melody}
      skin={skin}
      look={s}
      motif={<Paxta />}
      strip
      photos={[
        { kind: "unsplash", slot: "b3-shoes", w: 800 },
        { kind: "unsplash", slot: "b3-chairs", w: 700 },
        { kind: "unsplash", slot: "b3-hands-bouquet", w: 700 },
      ]}
    />
  );
}
