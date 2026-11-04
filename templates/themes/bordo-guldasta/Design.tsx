"use client";
/**
 * «Бордо гулдаста» (122) — юбилей, Оддий. Для бабушек и дедушек: беж и бордо с золотой нитью,
 * пышный букет пионов сверху-слева, маленький — снизу-справа. Карточка — прямоугольная плашка
 * с двойной золотой рамкой; имя прямым шрифтом (не прописью) — читается без очков. Основной текст ≥18 px.
 */
import { designVars, type TemplateProps } from "../types";
import { t } from "@/texts/uz-cyrl";
import { Bloom, FloralInvitation } from "../floral/kit";
import { melody } from "../ipak/melody";
import s from "./bordo-guldasta.module.css";

const vars = {
  ...designVars({ primary: "#7a2335", primaryDark: "#3b1c22", gold: "#b08d57", goldLight: "#efe1c8", paper: "#f7efe4", ink: "#3b1c22", muted: "#7c6560" }),
  "--f-paper": "#f7efe4",
  "--f-ink": "#3b1c22",
  "--f-line": "#7a2335",
  "--f-card": "#fffaf3",
  "--n-paper": "#f7efe4",
  "--n-ink": "#3b1c22",
  "--n-accent": "#b08d57",
  "--gold": "#b08d57",
} as React.CSSProperties;

export default function BordoGuldasta({ data, mode }: TemplateProps) {
  return (
    <FloralInvitation
      data={data}
      mode={mode}
      cfg={{
        melody,
        opening: "none",
        titleFont: "var(--n-serif)",
        vars,
        pageColor: "#f7efe4",
        backdrop: "bg-[#ebdfd0]",
        music: "bg-[#f7efe4]/80 text-[#3b1c22] ring-[#7a2335]/30",
        rsvp: { paper: "#fffaf3", ink: "#3b1c22", line: "#e3d2bb", soft: "#f3e6d6", accent: "#7a2335", font: "var(--n-text)", radius: "10px", buttonRadius: "10px" },
        assets: ["burgundy-peony", "burgundy-small"],
        look: s,
        hero: (_on, inv) => {
          const w = inv.main.when;
          return (
            <>
              <Bloom src="burgundy-peony" from="tl" className={s.bouquet} breathe={9} />
              <Bloom src="burgundy-small" from="br" className={s.small} delay={260} flip />
              <div className={s.card} data-card-text>
                <p className={`${s.relation} ${s.step}`}>{t.relationWord(data.relation ?? "ona", data.person)}</p>
                <h1 className={`${s.name} ${s.step}`}>{data.person}</h1>
                <p className={`${s.occasion} ${s.step}`}>{t.occasionTitles[inv.occasion]}</p>
                {data.age != null && (
                  <p className={`${s.age} ${s.step}`}>
                    <strong>{data.age}</strong>
                    <span>{t.ageLabel}</span>
                  </p>
                )}
                <p className={`${s.date} ${s.step}`}>{t.date.long(w.day, w.monthIndex, w.year)}</p>
                <p className={`${s.time} ${s.step}`}>{t.date.clock(inv.main.time)}</p>
              </div>
            </>
          );
        },
        finale: (
          <>
            <Bloom src="burgundy-peony" from="left" className={s.finLeft} />
            <Bloom src="burgundy-small" from="right" className={s.finRight} delay={200} flip />
          </>
        ),
      }}
    />
  );
}
