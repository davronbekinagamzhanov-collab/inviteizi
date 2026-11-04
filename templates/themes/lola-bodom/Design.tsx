"use client";
/**
 * «Лола ва бодом» (121) — суннат, Анимацияли. Спокойный бело-зелёный: тюльпаны растут снизу из двух углов,
 * сверху свисает ветка цветущего бодома. Карточка — стрельчатая арка-пештоқ тонкой шалфейной линией.
 */
import { designVars, type TemplateProps } from "../types";
import { Bloom, CardText, Frame, FloralInvitation, GirihStar } from "../floral/kit";
import { melody } from "../bog/melody";
import s from "./lola-bodom.module.css";

const vars = {
  ...designVars({ primary: "#6f9079", primaryDark: "#2e3d34", gold: "#6f9079", goldLight: "#e2ebe3", paper: "#f6f8f4", ink: "#2e3d34", muted: "#6a7a6f" }),
  "--f-paper": "#f6f8f4",
  "--f-ink": "#2e3d34",
  "--f-line": "#6f9079",
  "--f-card": "#ffffff",
  "--n-paper": "#f6f8f4",
  "--n-ink": "#2e3d34",
  "--n-accent": "#6f9079",
} as React.CSSProperties;

export default function LolaBodom({ data, mode }: TemplateProps) {
  return (
    <FloralInvitation
      data={data}
      mode={mode}
      cfg={{
        melody,
        opening: "curtain",
        vars,
        pageColor: "#f6f8f4",
        backdrop: "bg-[#e3eae3]",
        music: "bg-[#f6f8f4]/75 text-[#2e3d34] ring-[#6f9079]/35",
        rsvp: { paper: "#ffffff", ink: "#2e3d34", line: "#d3dfd5", soft: "#eaf1eb", accent: "#5c7f67", font: "var(--n-text)", radius: "20px", buttonRadius: "999px" },
        assets: ["tulip-pink", "blossom-pink"],
        look: s,
        hero: (_on, inv) => (
          <>
            <Bloom src="blossom-pink" from="top" className={s.branch} breathe={9} />
            <Bloom src="tulip-pink" from="bl" className={s.tulipLeft} delay={180} />
            <Bloom src="tulip-pink" from="br" className={s.tulipRight} delay={320} flip breathe={7} />
            <div className={s.card}>
              <Frame shape="peshtoq" />
              <GirihStar className={s.star} />
              <CardText data={data} inv={inv} monogram={false} />
            </div>
          </>
        ),
        finale: (
          <>
            <Bloom src="tulip-pink" from="bottom" className={s.finTulip} />
            <Bloom src="blossom-pink" from="right" className={s.finBranch} delay={200} flip />
          </>
        ),
      }}
    />
  );
}
