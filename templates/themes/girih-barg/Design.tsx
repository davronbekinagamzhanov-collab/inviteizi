"use client";
/**
 * «Гиреҳ барг» (118) — никоҳ, Анимацияли. Эвкалипт акварелью из двух углов по диагонали,
 * в центре шестиугольник-гирих тонким золотом со звёздами-узлами. Блоки — по левому краю, строгие.
 */
import { designVars, type TemplateProps } from "../types";
import { Bloom, CardText, Frame, FloralInvitation, GirihStar } from "../floral/kit";
import { melody } from "../ipak/melody";
import s from "./girih-barg.module.css";

const vars = {
  ...designVars({ primary: "#a88d5c", primaryDark: "#2f3a33", gold: "#a88d5c", goldLight: "#e9e3d2", paper: "#f6f7f2", ink: "#2f3a33", muted: "#6f7a71" }),
  "--f-paper": "#f6f7f2",
  "--f-ink": "#2f3a33",
  "--f-line": "#a08452",
  "--f-card": "#ffffff",
  "--n-paper": "#f6f7f2",
  "--n-ink": "#2f3a33",
  "--n-accent": "#a08452",
} as React.CSSProperties;

export default function GirihBarg({ data, mode }: TemplateProps) {
  return (
    <FloralInvitation
      data={data}
      mode={mode}
      cfg={{
        melody,
        opening: "curtain",
        vars,
        pageColor: "#f6f7f2",
        backdrop: "bg-[#e4e8e1]",
        music: "bg-[#f6f7f2]/75 text-[#2f3a33] ring-[#a08452]/35",
        rsvp: { paper: "#ffffff", ink: "#2f3a33", line: "#d8dccf", soft: "#eef0e8", accent: "#5d7262", font: "var(--n-text)", radius: "12px", buttonRadius: "999px" },
        assets: ["eucalyptus-top", "eucalyptus-bottom"],
        look: s,
        hero: (_on, inv) => (
          <>
            <Bloom src="eucalyptus-top" from="tl" className={s.tl} />
            <Bloom src="eucalyptus-bottom" from="br" className={s.br} delay={220} />
            <div className={s.card}>
              <Frame shape="hexagon" />
              <GirihStar className={s.starTop} />
              <GirihStar className={s.starBottom} />
              <CardText data={data} inv={inv} />
            </div>
          </>
        ),
        finale: <Bloom src="eucalyptus-bottom" from="bottom" className={s.finaleLeaves} />,
      }}
    />
  );
}
