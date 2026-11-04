"use client";
/**
 * «Ипак альбом» (128) — никоҳ, Оддий, С ФОТО, структура S5 «Альбом».
 * Слоновая кость, оливковый текст, шёлковая лента цвета чайной розы; запасные фото — руки с розами, белый пион, кремовые розы.
 */
import type { TemplateProps } from "../types";
import { Albom } from "../b3/s5-albom";
import { palette } from "../b3/kit";
import { Lola } from "../b3/decor";
import { melody } from "../pion-guldasta/melody";
import s from "./ipak-albom.module.css";

const skin = {
  vars: palette({ paper: "#f7f3eb", ink: "#2c2d22", accent: "#59603a", soft: "#ece8da", line: "#cfcbb4", card: "#fffdf7", muted: "#64665a" }, { "--silk": "#d9a5a0" }),
  pageColor: "#f7f3eb",
  backdrop: "bg-[#ece6da]",
  music: "bg-[#fffdf7]/85 text-[#2c2d22] ring-[#59603a]/30",
  rsvp: { paper: "#fffdf7", ink: "#2c2d22", line: "#e3e0cf", soft: "#f2efe3", accent: "#59603a", font: "var(--b-piazzolla)", radius: "2px", buttonRadius: "999px" },
};

export default function IpakAlbom(props: TemplateProps) {
  return (
    <Albom
      {...props}
      melody={melody}
      skin={skin}
      look={s}
      motif={<Lola />}
      photos={[
        { kind: "unsplash", slot: "b3-hands-roses", w: 800 },
        { kind: "unsplash", slot: "w-peony-white", w: 500 },
        { kind: "unsplash", slot: "x-roses-cream", w: 500 },
      ]}
    />
  );
}
