"use client";
/**
 * S6 «Китоб» (Варақланадиган): приглашение — маленькая книга, страницы листаются вбок (scroll-snap по x).
 * Стр. 1 — титул (имя, тадбир, сана — видны с первого кадра, «Варақни суринг»), 2 — текст, 3 — сана и таймер,
 * 4 — программа (если тадбиров больше одного), 5 — манзил. Внизу номер страницы, ‹ › для компьютера.
 * Под книгой — RSVP и финал (обычная прокрутка вниз).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TemplateProps } from "../types";
import type { Score } from "../../blocks/synth";
import { useInvitation } from "../../blocks/useInvitation";
import { t } from "@/texts/uz-cyrl";
import { Age, B3Shell, Count, DateBlock, Finale, Names, Places, Program, Relation, cx, longDate, occasionTitle, tidy, type Look, type Skin } from "./kit";
import b from "./b3.module.css";
import s from "./s6.module.css";

export function Kitob({ data, mode, melody, skin, look, motif }: TemplateProps & { melody: Score; skin: Skin; look: Look; motif: ReactNode }) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  const book = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  const pages: ReactNode[] = [
    <div key="title" className={cx(s.title, b.soft, look.title)}>
      <div className={cx(s.motif, look.motif)}>{motif}</div>
      <Relation inv={inv} className={s.relation} />
      <Names inv={inv} className={cx(s.names, look.names)} />
      <Age inv={inv} />
      <p className={cx(s.occasion, look.occasion)}>{occasionTitle(inv)}</p>
      <p className={s.date}>{longDate(inv)}</p>
      <p className={s.hint}>
        {t.b3.swipeSide}
        <span aria-hidden className={s.arrow} />
      </p>
    </div>,
    <div key="text" className={s.text}>
      {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
      <p>{tidy(inv.text.body)}</p>
      <div className={cx(s.textMotif, look.textMotif)}>{motif}</div>
    </div>,
    <div key="date">
      <DateBlock inv={inv} className={s.flat} calClassName={look.cal} />
      <Count inv={inv} className={s.flatCount} look={look} />
    </div>,
    ...(inv.program.length > 1 ? [<Program key="program" inv={inv} className={s.flat} itemClassName={look.event} />] : []),
    <Places key="places" inv={inv} className={s.flat} cardClassName={look.venue} />,
  ];

  // Номер страницы: какая страница сейчас ближе к центру книги
  useEffect(() => {
    const el = book.current;
    if (!el) return;
    const onScroll = () => setAt(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  const go = (d: number) => {
    const el = book.current;
    if (el) el.scrollTo({ left: (at + d) * el.clientWidth, behavior: "smooth" });
  };

  return (
    <B3Shell
      inv={inv}
      skin={skin}
      look={look}
      epilogue={
        <Finale inv={inv} className={cx(s.finale, look.finale)}>
          <div className={cx(s.finMotif, look.finMotif)}>{motif}</div>
        </Finale>
      }
    >
      <div className={cx(s.root, look.root)}>
        <div ref={book} className={cx(s.book, look.book)} data-hscroll>
          {pages.map((p, i) => (
            <section key={i} className={cx(s.page, look.bookPage)} aria-label={`${i + 1} / ${pages.length}`}>
              <div className={cx(s.sheet, look.sheet)}>
                {p}
                <span className={s.folio}>
                  {i + 1} / {pages.length}
                </span>
              </div>
            </section>
          ))}
        </div>
        <nav className={cx(s.nav, look.nav)}>
          <button type="button" onClick={() => go(-1)} disabled={at <= 0} aria-label={t.b3.prev}>
            ‹
          </button>
          <span className={s.dots} aria-hidden>
            {pages.map((_, i) => (
              <i key={i} data-on={i === at} />
            ))}
          </span>
          <button type="button" onClick={() => go(1)} disabled={at >= pages.length - 1} aria-label={t.b3.next}>
            ›
          </button>
        </nav>
      </div>
    </B3Shell>
  );
}
