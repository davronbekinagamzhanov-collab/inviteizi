"use client";
/**
 * S1 «Фото-ҳикоя» (Анимацияли): приглашение — короткий рассказ в фотографиях.
 * Открытие: фото на весь экран, на нём имена, тадбир и сана (видны с первого кадра) и кнопка
 * «Таклифномани очинг». По нажатию фото уходит вверх, как поднятый занавес, — под ним начинается рассказ:
 * глава 1 — текст рядом с узкой полосой фото, глава 2 — сана поверх фото-ленты, потом программа и манзил.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { TemplateProps } from "../types";
import type { Score } from "../../blocks/synth";
import { useInvitation } from "../../blocks/useInvitation";
import { OpeningCaption } from "../../blocks/OpeningCaption";
import { t } from "@/texts/uz-cyrl";
import { nameLen, Age, B3Shell, Count, DateBlock, Finale, Names, Pic, Places, Program, Relation, Rise, cx, longDate, occasionTitle, tidy, usePhotos, type Look, type Skin, type Stock } from "./kit";
import b from "./b3.module.css";
import s from "./s1.module.css";

export function Hikoya({
  data,
  mode,
  melody,
  skin,
  look,
  motif,
  photos: stock,
}: TemplateProps & { melody: Score; skin: Skin; look: Look; motif: ReactNode; photos: Stock[] }) {
  const inv = useInvitation(data, mode, { melody });
  const photos = usePhotos(data, stock);
  const [hero, second = hero, third = second] = photos.list;
  const w = inv.main.when;

  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1500);
  };

  const heading = (
    <>
      <Relation inv={inv} className={s.relation} />
      <Names inv={inv} className={cx(s.names, look.names)} />
      <Age inv={inv} />
      <p className={cx(s.occasion, look.occasion)}>{occasionTitle(inv)}</p>
      <p className={s.date}>{longDate(inv)}</p>
    </>
  );

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
        {/* Глава 0: та же фотография, что на открытии, — рассказ продолжается без скачка */}
        <header className={cx(s.cover, look.cover)}>
          {hero && (
            <div className={cx(s.coverPic, look.coverPic)}>
              <Pic shot={hero} eager />
            </div>
          )}
          <div className={cx(s.coverText, look.coverText)}>{heading}</div>
        </header>

        <section className={cx(s.chapter, look.chapter)}>
          {second && (
            <div className={cx(s.stripPic, look.stripPic)}>
              <Pic shot={second} />
            </div>
          )}
          <Rise className={s.chapterText}>
            <div className={cx(s.motif, look.motif)}>{motif}</div>
            {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
            <p>{tidy(inv.text.body)}</p>
          </Rise>
        </section>

        <section className={cx(s.band, look.band)}>
          {third && (
            <div className={s.bandPic}>
              <Pic shot={third} />
            </div>
          )}
          <Rise className={s.bandText}>
            <span className={s.bandDay}>{w.day}</span>
            <span className={s.bandMonth}>{t.date.monthYear(w.monthIndex, w.year)}</span>
          </Rise>
        </section>

        <DateBlock inv={inv} title={false} calClassName={look.cal} className={s.cal} />
        <Count inv={inv} look={look} />
        {inv.program.length > 1 && <Program inv={inv} itemClassName={look.event} />}
        <Places inv={inv} cardClassName={look.venue} />
      </div>

      {!inv.opened && (
        <button type="button" data-open data-started={inv.started} onClick={open} disabled={inv.started} className={cx(s.opening, look.opening)}>
          {hero && (
            <span className={s.openPic}>
              <Pic shot={hero} eager />
            </span>
          )}
          <span className={cx(s.openText, b.soft, look.openText)} style={{ "--len": nameLen(inv) } as CSSProperties}>
            <span className={s.openMotif}>{motif}</span>
            <OpeningCaption inv={inv} nameClassName={cx(s.openNames, look.openNames)} metaClassName={s.openMeta} />
            <span className={cx(s.tap, look.tap)}>{t.b3.tap}</span>
          </span>
        </button>
      )}
    </B3Shell>
  );
}
