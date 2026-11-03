"use client";
/**
 * «Гул доира» (117) — никоҳ, Анимацияли. Розы и анемоны акварелью выходят из четырёх углов,
 * в центре — круглая карточка тонким золотом. Открытие «занавесом»: цветы расходятся к краям.
 */
import { designVars, type TemplateProps } from "../types";
import { Bloom, CardText, Frame, FloralInvitation } from "../floral/kit";
import { melody } from "../muhr/melody";
import s from "./gul-doira.module.css";

const vars = {
  ...designVars({ primary: "#b89a72", primaryDark: "#4a3a36", gold: "#b89a72", goldLight: "#efe4d4", paper: "#fbf7f2", ink: "#4a3a36", muted: "#8a7a72" }),
  "--f-paper": "#fbf7f2",
  "--f-ink": "#4a3a36",
  "--f-line": "#b08f68",
  "--f-card": "#fffdf9",
  "--n-paper": "#fbf7f2",
  "--n-ink": "#4a3a36",
  "--n-accent": "#b08f68",
} as React.CSSProperties;

export default function GulDoira({ data, mode }: TemplateProps) {
  return (
    <FloralInvitation
      data={data}
      mode={mode}
      cfg={{
        melody,
        opening: "curtain",
        vars,
        pageColor: "#fbf7f2",
        backdrop: "bg-[#efe7dd]",
        music: "bg-[#fbf7f2]/75 text-[#4a3a36] ring-[#b08f68]/35",
        rsvp: { paper: "#fffdf9", ink: "#4a3a36", line: "#e2d3c0", soft: "#f6eee4", accent: "#9a7a55", font: "var(--n-text)", radius: "20px", buttonRadius: "999px" },
        assets: ["rose-anemone", "rose-garland"],
        heart: true,
        look: s,
        hero: (_on, inv) => (
          <>
            <Bloom src="rose-anemone" from="tl" className={s.tl} />
            <Bloom src="rose-garland" from="tr" className={s.tr} delay={140} />
            <Bloom src="rose-garland" from="bl" className={s.bl} delay={260} flip />
            <Bloom src="rose-anemone" from="br" className={s.br} delay={380} flip />
            <div className={s.card}>
              <Frame shape="circle" />
              <CardText data={data} inv={inv} />
            </div>
          </>
        ),
        finale: (
          <>
            <Bloom src="rose-garland" from="bottom" className={s.finaleGarland} />
          </>
        ),
      }}
    />
  );
}
