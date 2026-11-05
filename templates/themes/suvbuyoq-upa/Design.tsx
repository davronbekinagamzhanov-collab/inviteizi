"use client";
/** «Упа гул» (141) — никоҳ, Анимацияли, структура «Пятно»: пудровое пятно на тёплой белой бумаге */
import type { TemplateProps } from "../types";
import { Patno } from "../patno/Patno";
import { melody } from "../muhr/melody";

const skin = { tone: "upa", paper: "#fdf9f6", ink: "#47302f", muted: "#7a6260", wash: "#d6a39e", gold: "#b48d58" } as const;

export default function SuvbuyoqUpa(props: TemplateProps) {
  return <Patno {...props} melody={melody} skin={skin} />;
}
