"use client";
/**
 * «Нон альбом» (124) — наҳорги ош, Оддий, С ФОТО, структура S5 «Альбом».
 * Пшеничная бумага, ореховый текст, лента цвета изразца; запасные фото — нон, чой, дастурхон.
 */
import type { TemplateProps } from "../types";
import { Albom } from "../b3/s5-albom";
import { palette } from "../b3/kit";
import { Non } from "../b3/decor";
import { melody } from "../tong-dasturxon/melody";
import s from "./non-albom.module.css";

const skin = {
  vars: palette({ paper: "#f1e8d8", ink: "#33261b", accent: "#6b4226", soft: "#e8dcc6", line: "#cdb894", card: "#fbf6ec", muted: "#6a5a48" }, { "--tile": "#3f6f73" }),
  pageColor: "#f1e8d8",
  backdrop: "bg-[#e6dcc8]",
  music: "bg-[#fbf6ec]/85 text-[#33261b] ring-[#6b4226]/30",
  rsvp: { paper: "#fbf6ec", ink: "#33261b", line: "#e3d5bb", soft: "#f3eadb", accent: "#6b4226", font: "var(--b-piazzolla)", radius: "6px", buttonRadius: "6px" },
};

export default function NonAlbom(props: TemplateProps) {
  return (
    <Albom
      {...props}
      melody={melody}
      skin={skin}
      look={s}
      motif={<Non />}
      photos={[
        { kind: "unsplash", slot: "b3-non-2", w: 800 },
        { kind: "unsplash", slot: "b3-tea", w: 500 },
        { kind: "unsplash", slot: "b3-tea-3", w: 500 },
      ]}
    />
  );
}
