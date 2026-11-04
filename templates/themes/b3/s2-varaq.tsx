"use client";
/**
 * S2 «Варақ» (Варақланадиган по-настоящему): страница = экран, по одной мысли на экран,
 * экраны «прилипают» при листании (scroll-snap), справа точки-индикатор, на первом — «Пастга суринг».
 * Порядок: имена → текст → сана и таймер → программа → манзил → RSVP и финал.
 * С фото (cover) первый экран — фото клиента на весь экран, без фото — мотив.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TemplateProps } from "../types";
import type { Score } from "../../blocks/synth";
import { useInvitation } from "../../blocks/useInvitation";
import { t } from "@/texts/uz-cyrl";
import type { Stock } from "../natural/common";
import { Age, B3Shell, Count, DateBlock, Finale, Names, Pic, Places, Program, Relation, cx, longDate, occasionTitle, tidy, usePhotos, type Look, type Skin } from "./kit";
import b from "./b3.module.css";
import s from "./s2.module.css";

export function Varaq({
  data,
  mode,
  melody,
  skin,
  look,
  motif,
  cover,
  textArt,
  milky,
}: TemplateProps & { melody: Score; skin: Skin; look: Look; motif: ReactNode; cover?: Stock[]; textArt?: ReactNode; milky?: boolean }) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  const photos = usePhotos(data, cover ?? []);
  const hero = cover ? photos.list[0] : undefined;
  const second = cover ? photos.list[1] : undefined;
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(0);

  // Экраны «прилипают» только на этой странице
  useEffect(() => {
    const el = document.documentElement;
    el.style.scrollSnapType = "y proximity";
    return () => {
      el.style.scrollSnapType = "";
    };
  }, []);

  // Точка-индикатор: какой экран сейчас в центре
  useEffect(() => {
    const pages = [...(root.current?.querySelectorAll<HTMLElement>("[data-varaq]") ?? [])];
    setCount(pages.length);
    const io = new IntersectionObserver(
      (list) => {
        for (const e of list) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.varaq));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    pages.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, []);

  const page = (i: number, children: ReactNode, cls?: string) => (
    <section data-varaq={i} className={cx(s.screen, cls)}>
      {children}
    </section>
  );
  let n = 0;

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
      <div ref={root} className={cx(s.root, look.root)}>
        {page(
          n++,
          <>
            {hero ? (
              <div className={s.coverPic}>
                <Pic shot={hero} eager />
              </div>
            ) : (
              <div className={cx(s.heroMotif, look.heroMotif)}>{motif}</div>
            )}
            <div className={cx(s.heroText, b.soft, hero && s.onPhoto, look.heroText)}>
              <Relation inv={inv} className={s.relation} />
              <Names inv={inv} className={cx(s.names, look.names)} />
              <Age inv={inv} />
              <p className={cx(s.occasion, look.occasion)}>{occasionTitle(inv)}</p>
              <p className={s.date}>{longDate(inv)}</p>
            </div>
            <p className={cx(s.hint, hero && s.onPhoto)}>
              {t.b3.swipeDown}
              <span aria-hidden className={s.arrow} />
            </p>
          </>,
          cx(s.first, milky && s.milky, look.first),
        )}

        {page(
          n++,
          <div className={cx(s.textPage, look.textPage)}>
            {second ? (
              <div className={cx(s.sidePic, look.sidePic)}>
                <Pic shot={second} />
              </div>
            ) : (
              textArt && <div className={cx(s.textArt, look.textArt)}>{textArt}</div>
            )}
            {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
            <p>{tidy(inv.text.body)}</p>
          </div>,
          look.second,
        )}

        {page(
          n++,
          <>
            <DateBlock inv={inv} className={s.flat} calClassName={look.cal} />
            <Count inv={inv} className={s.flat} look={look} />
          </>,
          look.third,
        )}

        {inv.program.length > 1 && page(n++, <Program inv={inv} className={s.flat} itemClassName={look.event} />, look.fourth)}

        {page(n++, <Places inv={inv} className={s.flat} cardClassName={look.venue} />, look.fifth)}
      </div>

      {count > 1 && (
        <nav className={cx(s.dots, look.dots)} aria-hidden>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} data-on={i === active} />
          ))}
        </nav>
      )}
    </B3Shell>
  );
}
