"use client";
/** «Зумрад» (140) — никоҳ, Анимацияли, структура «Пятно»: изумрудное пятно на кремовой бумаге */
import type { TemplateProps } from "../types";
import { Patno } from "../patno/Patno";
import { melody } from "../oq-ot/melody";

const skin = { tone: "zumrad", paper: "#fbfaf4", ink: "#1f3129", muted: "#596a61", wash: "#6a9e86", gold: "#ae8f55" } as const;

export default function SuvbuyoqZumrad(props: TemplateProps) {
  return <Patno {...props} melody={melody} skin={skin} />;
}
