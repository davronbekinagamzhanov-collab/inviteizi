"use client";
/**
 * S7 «Медальон» (Оддий): фото в круглом медальоне, вокруг — кольцо лепестков сузаны (код, не картинка).
 * Под медальоном — имена капителью (Cormorant Unicase), тадбир и сана — всё на первом экране сразу.
 * Дальше: текст между двумя маленькими медальонами, день в концентрических кругах, таймер в кружках, программа, манзил.
 */
import type { ReactNode } from "react";
import type { TemplateProps } from "../types";
import type { Score } from "../../blocks/synth";
import { useInvitation } from "../../blocks/useInvitation";
import { t } from "@/texts/uz-cyrl";
import { Age, B3Shell, Count, DateBlock, Finale, Names, Pic, Places, Program, Relation, Rise, cx, longDate, occasionTitle, tidy, usePhotos, type Look, type Skin, type Stock } from "./kit";
import b from "./b3.module.css";
import s from "./s7.module.css";

/** Кольцо из 24 лепестков сузаны вокруг медальона */
function Ring({ className }: { className?: string }) {
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden data-decor>
      <circle r="98" fill="none" stroke="currentColor" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
      <circle r="80" fill="none" stroke="currentColor" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
      {Array.from({ length: 24 }, (_, i) => i * 15).map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0-81C5-85 6-92 0-97-6-92-5-85 0-81z" fill="none" stroke="currentColor" strokeWidth=".9" vectorEffect="non-scaling-stroke" />
          <circle cy="-89" r="1.1" fill="currentColor" />
        </g>
      ))}
      {Array.from({ length: 24 }, (_, i) => i * 15 + 7.5).map((a) => (
        <circle key={a} transform={`rotate(${a})`} cy="-95" r=".9" fill="currentColor" />
      ))}
    </svg>
  );
}

export function Medalyon({
  data,
  mode,
  melody,
  skin,
  look,
  motif,
  photos: stock,
}: TemplateProps & { melody: Score; skin: Skin; look: Look; motif: ReactNode; photos: Stock[] }) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  const photos = usePhotos(data, stock);
  const [hero, ...rest] = photos.list;
  const w = inv.main.when;

  return (
    <B3Shell
      inv={inv}
      skin={skin}
      look={look}
      credits={photos.credits}
      epilogue={
        <Finale inv={inv} className={cx(s.finale, look.finale)}>
          <div className={cx(s.finMotif, look.finMotif)}>{motif}</div>
        </Finale>
      }
    >
      <div className={cx(s.root, look.root)}>
        <header className={cx(s.head, look.head)}>
          <div className={cx(s.medal, look.medal)}>
            <Ring className={cx(s.ring, look.ring)} />
            {hero && (
              <div className={s.photo}>
                <Pic shot={hero} eager />
              </div>
            )}
          </div>
          <div className={cx(s.headText, b.soft)}>
            <Relation inv={inv} className={s.relation} />
            <Names inv={inv} className={cx(s.names, look.names)} />
            <Age inv={inv} />
            <p className={cx(s.occasion, look.occasion)}>{occasionTitle(inv)}</p>
            <p className={s.date}>{longDate(inv)}</p>
          </div>
        </header>

        <Rise className={cx(s.text, look.text)}>
          {rest.length > 0 && (
            <div className={s.pair}>
              {rest.slice(0, 2).map((p, i) => (
                <div key={i} className={cx(s.mini, look.mini)}>
                  <Pic shot={p} />
                </div>
              ))}
            </div>
          )}
          {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
          <p>{tidy(inv.text.body)}</p>
        </Rise>

        <Rise className={cx(s.day, look.day)}>
          <div className={s.dayDisc}>
            <span className={s.dayNum}>{w.day}</span>
            <span className={s.dayMonth}>{t.date.monthYear(w.monthIndex, w.year)}</span>
          </div>
          <DateBlock inv={inv} title={false} className={s.flat} calClassName={look.cal} />
        </Rise>
        <Count inv={inv} look={{ ...look, countBox: cx(s.countBox, look.countBox), countGrid: cx(s.countGrid, look.countGrid) }} />
        {inv.program.length > 1 && <Program inv={inv} itemClassName={look.event} />}
        <Places inv={inv} cardClassName={cx(s.venue, look.venue)} />
      </div>
    </B3Shell>
  );
}
