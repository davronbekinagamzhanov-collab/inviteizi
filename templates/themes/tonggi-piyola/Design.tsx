"use client";
/**
 * «Тонгги пиёла» (120) — наҳорги ош, Анимацияли. Утро: тёплый крем, акварельные веточки по углам,
 * в овале — чайник и пиёла тонкой линией с кобальтовым «пахта-нусха», крупное «6:00 эрталаб».
 */
import { designVars, type TemplateProps } from "../types";
import { t } from "@/texts/uz-cyrl";
import { Script } from "../natural/kit";
import { Bloom, Frame, FloralInvitation } from "../floral/kit";
import { melody } from "../tong-dasturxon/melody";
import s from "./tonggi-piyola.module.css";

const vars = {
  ...designVars({ primary: "#2f5d8f", primaryDark: "#3d3128", gold: "#b08a5a", goldLight: "#efe2cf", paper: "#faf4ea", ink: "#3d3128", muted: "#857565" }),
  "--f-paper": "#faf4ea",
  "--f-ink": "#3d3128",
  "--f-line": "#a8865c",
  "--f-card": "#fffbf4",
  "--n-paper": "#faf4ea",
  "--n-ink": "#3d3128",
  "--n-accent": "#a8865c",
  "--cobalt": "#2f5d8f",
} as React.CSSProperties;

/** Пахта-нусха: коробочка хлопка — четыре лепестка и точка */
function Paxta({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className={s.paxta}>
      {[0, 90, 180, 270].map((a) => (
        <path key={a} transform={`rotate(${a})`} d={`M0 0C${r * 0.6} ${-r * 0.4} ${r * 0.5} ${-r} 0 ${-r * 1.1}C${-r * 0.5} ${-r} ${-r * 0.6} ${-r * 0.4} 0 0z`} />
      ))}
      <circle r={r * 0.22} />
    </g>
  );
}

/** Чайник и пиёла тонкой линией (код, не картинка — не «мылится» на любом экране) */
function TeaSet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 120" className={className} aria-hidden data-decor>
      <g className={s.teaLine}>
        {/* чайник */}
        <path d="M58 38h44M62 38c-14 8-20 22-18 38 2 16 14 26 36 26s34-10 36-26c2-16-4-30-18-38" />
        <path d="M66 38c0-8 6-14 14-14s14 6 14 14M80 24v-6m-4 0h8" />
        <path d="M44 66c-10-4-18-14-22-26 6 0 12 4 16 10" />
        <path d="M116 56c12-6 18 4 14 14-3 8-10 12-16 14" />
        <path d="M52 92c8 6 18 9 28 9s20-3 28-9" />
        {/* пиёла */}
        <path d="M150 78h52c-2 16-12 24-26 24s-24-8-26-24z" />
        <path d="M168 102h16" />
        <path d="M166 66c-3-5 3-8 0-13M176 64c-3-5 3-8 0-13M186 66c-3-5 3-8 0-13" className={s.steam} />
      </g>
      <Paxta x={68} y={62} />
      <Paxta x={92} y={62} />
      <Paxta x={80} y={80} />
      <Paxta x={164} y={86} r={4} />
      <Paxta x={188} y={86} r={4} />
      <path d="M62 50h36" className={s.teaBand} />
      <path d="M152 82h48" className={s.teaBand} />
    </svg>
  );
}

export default function TonggiPiyola({ data, mode }: TemplateProps) {
  return (
    <FloralInvitation
      data={data}
      mode={mode}
      cfg={{
        melody,
        opening: "curtain",
        vars,
        pageColor: "#faf4ea",
        backdrop: "bg-[#eee3d3]",
        music: "bg-[#faf4ea]/75 text-[#3d3128] ring-[#a8865c]/35",
        rsvp: { paper: "#fffbf4", ink: "#3d3128", line: "#e6d8c4", soft: "#f4eadc", accent: "#2f5d8f", font: "var(--n-text)", radius: "16px", buttonRadius: "999px" },
        assets: ["tea-sprig", "tea-leaves"],
        look: s,
        hero: (_on, inv) => {
          const w = inv.main.when;
          return (
            <>
              <Bloom src="tea-sprig" from="tl" className={s.tl} />
              <Bloom src="tea-leaves" from="tr" className={s.tr} delay={160} flip />
              <Bloom src="tea-sprig" from="br" className={s.br} delay={300} flip />
              <div className={s.card}>
                <Frame shape="oval" />
                <div className={s.cardText} data-card-text>
                  <TeaSet className={`${s.tea} ${s.step}`} />
                  <p className={`${s.relation} ${s.step}`}>{t.relationWord(data.relation ?? "ogil", data.person)}</p>
                  <h1 className={`${s.name} ${s.step}`}>
                    <Script text={data.person ?? ""} />
                  </h1>
                  <p className={`${s.occasion} ${s.step}`}>{t.occasionTitles[inv.occasion]}</p>
                  <p className={`${s.clock} ${s.step}`}>
                    <strong>{t.date.clock(inv.main.time)}</strong>
                    <Script text={t.floral.morning} className={s.morning} />
                  </p>
                  <p className={`${s.date} ${s.step}`}>{t.date.long(w.day, w.monthIndex, w.year)}</p>
                </div>
              </div>
            </>
          );
        },
        finale: (
          <>
            <Bloom src="tea-leaves" from="left" className={s.finLeft} />
            <TeaSet className={s.finTea} />
          </>
        ),
      }}
    />
  );
}
