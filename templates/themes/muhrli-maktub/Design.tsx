"use client";
/**
 * «Муҳрли мактуб» (119) — никоҳ, Анимацияли. Конверт цвета пудры с бумажной фактурой:
 * имена на клапане, сургуч на острие, веточки цветущего бодома по углам.
 * Открытие ≈2,3 с: сургуч тает → клапан откидывается → письмо выезжает → страница.
 * Цвет конверта — переменные --e-*, чтобы позже выпустить 2–3 цвета отдельными позициями каталога.
 */
import { designVars, type TemplateProps } from "../types";
import { t } from "@/texts/uz-cyrl";
import { Script } from "../natural/kit";
import { initial } from "../natural/common";
import { Bloom, CardText, Frame, FloralInvitation, Monogram } from "../floral/kit";
import { melody } from "../muhr/melody";
import s from "./muhrli-maktub.module.css";

const vars = {
  ...designVars({ primary: "#a7836f", primaryDark: "#4b3b3a", gold: "#a7836f", goldLight: "#efe1d8", paper: "#fbf6f3", ink: "#4b3b3a", muted: "#8b7771" }),
  "--f-paper": "#fbf6f3",
  "--f-ink": "#4b3b3a",
  "--f-line": "#a7836f",
  "--f-card": "#fffdfb",
  "--n-paper": "#fbf6f3",
  "--n-ink": "#4b3b3a",
  "--n-accent": "#a7836f",
  // Цвет конверта (пудра). Другой вариант цвета — только эти четыре строки
  "--e-paper": "#d8b9ab",
  "--e-dark": "#c6a191",
  "--e-light": "#e6cdc1",
  "--e-wax": "#8e4f45",
} as React.CSSProperties;

const WAX =
  "M50 4c7 0 10 4 16 5s11 0 15 5 2 10 5 15 8 9 8 16-5 10-6 16 1 11-3 16-10 5-15 8-9 8-16 8-10-5-16-6-11 1-16-3-5-10-8-15-8-9-8-16 5-10 6-16-1-11 3-16 10-5 15-8 9-8 16-8z";

export default function MuhrliMaktub({ data, mode }: TemplateProps) {
  const a = initial(data.groom);
  const b = initial(data.bride);
  return (
    <FloralInvitation
      data={data}
      mode={mode}
      cfg={{
        melody,
        opening: "custom",
        overlayMs: 2300,
        vars,
        pageColor: "#fbf6f3",
        backdrop: "bg-[#efe3dc]",
        music: "bg-[#fbf6f3]/75 text-[#4b3b3a] ring-[#a7836f]/35",
        rsvp: { paper: "#fffdfb", ink: "#4b3b3a", line: "#e6d3c8", soft: "#f6ebe5", accent: "#8e4f45", font: "var(--n-text)", radius: "18px", buttonRadius: "999px" },
        assets: ["blossom-pink"],
        heart: true,
        look: s,
        hero: (_on, inv) => (
          <>
            <Bloom src="blossom-pink" from="left" className={s.heroLeft} />
            <Bloom src="blossom-pink" from="right" className={s.heroRight} delay={200} flip />
            <div className={s.card}>
              <Frame shape="arch" />
              <CardText data={data} inv={inv} />
            </div>
          </>
        ),
        overlay: (start, started) => (
          <button
            type="button"
            data-open
            data-started={started}
            onClick={start}
            disabled={started}
            aria-label={t.natural.playHint}
            className={s.envelope}
          >
            <span className={s.letterCard}>
              <Monogram a={a} b={b} className={s.letterMono} inline />
            </span>
            <span className={s.pocket} />
            <span className={s.flapWrap}>
              <span className={s.flap}>
                <span className={s.flapNames}>
                  <Script text={data.groom ?? ""} className={s.flapScript} />
                  <span className={s.flapAnd}>{t.natural.and}</span>
                  <Script text={data.bride ?? ""} className={s.flapScript} />
                </span>
              </span>
            </span>
            <span className={s.seal} aria-hidden>
              <svg viewBox="0 0 100 100" className={s.wax}>
                <path d={WAX} />
                <circle cx="50" cy="50" r="32" />
              </svg>
              <span className={s.sealMono}>
                {a}
                <i />
                {b}
              </span>
            </span>
            <span className={s.envFlowers} data-on="true">
              <Bloom src="blossom-pink" from="tl" className={s.envTl} />
              <Bloom src="blossom-pink" from="br" className={s.envBr} delay={180} flip />
            </span>
            <span className={s.envTap}>{t.floral.tap}</span>
          </button>
        ),
        finale: (
          <>
            <Bloom src="blossom-pink" from="left" className={s.finLeft} />
            <Bloom src="blossom-pink" from="right" className={s.finRight} delay={160} flip />
          </>
        ),
      }}
    />
  );
}
