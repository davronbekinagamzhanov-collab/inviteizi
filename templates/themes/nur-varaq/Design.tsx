"use client";
/**
 * «Нур варақ» (130) — никоҳ, Варақланадиган, С ФОТО, структура S2 «Варақ».
 * Первый экран — фото клиента на весь экран (запасное — светлый букет белых роз, растворяется в молочный), второй — арочное фото рядом с текстом.
 * Пудрово-розовый, бодом гули в финале.
 */
import type { TemplateProps } from "../types";
import { Varaq } from "../b3/s2-varaq";
import { palette } from "../b3/kit";
import { Bodom } from "../b3/decor";
import { melody } from "../ipak-romol/melody";
import s from "./nur-varaq.module.css";

const skin = {
  vars: palette({ paper: "#f7f1ee", ink: "#2e2326", accent: "#94525b", soft: "#f3e4e4", line: "#d9c2c3", card: "#fffaf8", muted: "#6d5c5f" }),
  pageColor: "#f7f1ee",
  backdrop: "bg-[#efe4df]",
  music: "bg-[#fffaf8]/85 text-[#2e2326] ring-[#94525b]/30",
  rsvp: { paper: "#fffaf8", ink: "#2e2326", line: "#ead8d6", soft: "#f6e9e8", accent: "#94525b", font: "var(--b-garamond)", radius: "18px", buttonRadius: "999px" },
};

export default function NurVaraq(props: TemplateProps) {
  return (
    <Varaq
      {...props}
      melody={melody}
      skin={skin}
      look={s}
      motif={<Bodom />}
      milky
      cover={[
        { kind: "unsplash", slot: "b3-roses", w: 900 },
        { kind: "unsplash", slot: "b3-hands-hold", w: 700 },
      ]}
    />
  );
}
