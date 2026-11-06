"use client";
/** «Мовий туман» (139) — никоҳ, Анимацияли, структура «Пятно»: голубой туман на белой бумаге */
import type { TemplateProps } from "../types";
import { Patno } from "../patno/Patno";
import { melody } from "../ipak/melody";

const skin = { tone: "tuman", paper: "#fcfbf8", ink: "#283643", muted: "#5f6d7a", wash: "#86a5c0", gold: "#b0915a" } as const;

export default function SuvbuyoqTuman(props: TemplateProps) {
  return <Patno {...props} melody={melody} skin={skin} />;
}
