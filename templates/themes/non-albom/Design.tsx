"use client";
/**
 * «Нон альбом» (124) — наҳорги ош, Оддий, структура S5 «Альбом». Фото клиента на наҳорги ош не ставим (решение владельца 03.11).
 * Пшеничная бумага, ореховый текст, лента цвета изразца; фото — чекичи (штампы для нона) на льне, ганчевая арка в утреннем свете, Самарқанд.
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
        { kind: "local", slot: "nahorgi-chekich" },
        { kind: "unsplash", slot: "n-ganch-arch", w: 600 },
        { kind: "local", slot: "nahorgi-samarkand-a" },
      ]}
    />
  );
}
